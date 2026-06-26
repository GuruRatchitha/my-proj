import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchEmployeeDashboard } from '../../api/employeeDashboard'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const numberFormatter = new Intl.NumberFormat('en-US')

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
})

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
})

const firstValue = (...values) => values.find((value) => value || value === 0) ?? ''

const unwrapCollection = (response, keys = []) => {
  if (Array.isArray(response)) {
    return response
  }

  const source = response?.data || response

  if (Array.isArray(source)) {
    return source
  }

  for (const key of keys) {
    if (Array.isArray(source?.[key])) {
      return source[key]
    }
  }

  if (Array.isArray(source?.content)) {
    return source.content
  }

  return []
}

const unwrapObject = (response) => response?.data || response || {}

const formatDate = (value) => {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date)
}

const formatTime = (value) => {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : timeFormatter.format(date)
}

const formatStatus = (value) => {
  const normalized = (value || 'Pending').toString().trim().replace(/_/g, ' ').toLowerCase()

  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase())
}

const getStatusClass = (value) => formatStatus(value).toLowerCase().replace(/\s+/g, '-')

const getFullName = (customer = {}) => {
  const nameParts = [customer.firstName, customer.middleName, customer.lastName].filter(Boolean).join(' ')

  return firstValue(customer.fullName, customer.userName, customer.name, nameParts, 'Customer')
}

const normalizeSummary = (response) => {
  const summary = unwrapObject(response)

  return {
    totalCustomers: Number(firstValue(summary.totalCustomers, summary.customers, 0)),
    totalAccounts: Number(firstValue(summary.totalAccounts, summary.accounts, 0)),
    totalBalance: Number(firstValue(summary.totalBalance, summary.bankBalance, summary.totalBankBalance, 0)),
    pendingBeneficiaries: Number(firstValue(summary.pendingBeneficiaries, summary.pendingBeneficiaryRequests, 0)),
    pendingTransactions: Number(firstValue(summary.pendingTransactions, summary.pendingTransactionRequests, 0)),
    todayCustomers: Number(firstValue(summary.todayCustomers, summary.todaysNewCustomers, summary.newCustomersToday, 0)),
  }
}

const normalizeRecentCustomer = (customer = {}, index = 0) => ({
  id: firstValue(customer.userId, customer.id, customer.email, `customer-${index}`),
  name: getFullName(customer),
  email: firstValue(customer.email, '-'),
  phoneNumber: firstValue(customer.phoneNumber, customer.mobileNumber, customer.phone, '-'),
  createdDate: formatDate(firstValue(customer.createdDate, customer.created_at, customer.createdOn)),
})

const normalizeBeneficiary = (beneficiary = {}, index = 0) => ({
  id: firstValue(beneficiary.id, beneficiary.accountNumber, `beneficiary-${index}`),
  customerName: firstValue(
    beneficiary.customerName,
    beneficiary.userName,
    beneficiary.customer?.userName,
    beneficiary.customer?.name,
    'Customer',
  ),
  beneficiaryName: firstValue(beneficiary.beneficiaryName, beneficiary.name, '-'),
  requestedDate: formatDate(firstValue(beneficiary.requestedDate, beneficiary.createdDate, beneficiary.createdAt)),
  status: formatStatus(beneficiary.status),
})

const normalizeTransaction = (transaction = {}, index = 0) => {
  const amount = Number(firstValue(transaction.amount, transaction.transferAmount, 0))

  return {
    id: firstValue(transaction.id, transaction.transactionId, transaction.transactionReference, `transaction-${index}`),
    customer: firstValue(transaction.customerName, transaction.userName, transaction.senderName, transaction.debtorName, 'Customer'),
    amount: currencyFormatter.format(amount),
    type: formatStatus(firstValue(transaction.transactionType, transaction.type, transaction.paymentType, 'Transfer')),
    status: formatStatus(firstValue(transaction.status, transaction.transferStatus, transaction.approvalStatus)),
  }
}

const normalizeAccountStats = (response) => {
  const stats = unwrapObject(response)

  return [
    { key: 'savings', label: 'Savings', value: Number(firstValue(stats.savings, stats.savingsAccounts, 0)) },
    { key: 'current', label: 'Current', value: Number(firstValue(stats.current, stats.currentAccounts, 0)) },
    { key: 'salary', label: 'Salary', value: Number(firstValue(stats.salary, stats.salaryAccounts, 0)) },
  ]
}

const normalizeActivity = (activity = {}, index = 0) => {
  const dateValue = firstValue(activity.date, activity.createdDate, activity.createdAt, activity.timestamp)

  return {
    id: firstValue(activity.id, activity.activityId, `activity-${index}`),
    activity: firstValue(activity.activity, activity.message, activity.description, activity.action, 'Employee action recorded'),
    date: formatDate(dateValue),
    time: formatTime(dateValue),
  }
}

const normalizeDashboardResponse = (response) => ({
  summary: normalizeSummary(response.summary),
  recentCustomers: unwrapCollection(response.recentCustomers, ['customers', 'recentCustomers'])
    .slice(0, 5)
    .map(normalizeRecentCustomer),
  pendingBeneficiaries: unwrapCollection(response.pendingBeneficiaries, ['beneficiaries', 'requests'])
    .slice(0, 5)
    .map(normalizeBeneficiary),
  pendingTransactions: unwrapCollection(response.pendingTransactions, ['transactions', 'requests'])
    .slice(0, 5)
    .map(normalizeTransaction),
  accountStatistics: normalizeAccountStats(response.accountStatistics),
  recentActivity: unwrapCollection(response.recentActivity, ['activities', 'recentActivity'])
    .slice(0, 5)
    .map(normalizeActivity),
})

const DashboardSkeleton = () => (
  <div className="employee-dashboard-skeleton" aria-label="Loading dashboard">
    {Array.from({ length: 6 }, (_, index) => (
      <span className="dashboard-skeleton-card" key={index}></span>
    ))}
  </div>
)

function SummaryCard({ title, value, subtitle, icon, tone = '' }) {
  return (
    <article className={`employee-summary-card ${tone}`}>
      <span className="employee-summary-icon">
        <i className={icon} aria-hidden="true"></i>
      </span>
      <div>
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{subtitle}</small>
      </div>
    </article>
  )
}

function DashboardPanel({ title, actionLabel, onAction, children }) {
  return (
    <section className="employee-dashboard-panel">
      <header className="employee-dashboard-panel-header">
        <h2>{title}</h2>
        {actionLabel && (
          <button className="section-link" type="button" onClick={onAction}>
            {actionLabel}
          </button>
        )}
      </header>
      {children}
    </section>
  )
}

function MiniTable({ columns, rows, emptyMessage }) {
  return (
    <div className="employee-dashboard-table-wrap">
      <table className="table bank-table employee-dashboard-table mb-0">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => (
                <td key={column.key}>
                  {column.status ? (
                    <span className={`transaction-status ${getStatusClass(row[column.key])}`}>
                      {row[column.key]}
                    </span>
                  ) : (
                    row[column.key] || '-'
                  )}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length}>{emptyMessage}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function EmployeeDashboard() {
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState({
    summary: normalizeSummary({}),
    recentCustomers: [],
    pendingBeneficiaries: [],
    pendingTransactions: [],
    accountStatistics: normalizeAccountStats({}),
    recentActivity: [],
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const handleRetry = async () => {
    try {
      setIsLoading(true)
      setErrorMessage('')

      const response = await fetchEmployeeDashboard()

      setDashboard(normalizeDashboardResponse(response))
    } catch (error) {
      setErrorMessage(error.message || 'Unable to load employee dashboard.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    const loadInitialDashboard = async () => {
      try {
        setIsLoading(true)
        setErrorMessage('')

        const response = await fetchEmployeeDashboard()

        if (isMounted) {
          setDashboard(normalizeDashboardResponse(response))
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.message || 'Unable to load employee dashboard.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadInitialDashboard()

    return () => {
      isMounted = false
    }
  }, [])

  const summaryCards = useMemo(() => [
    {
      title: 'Total Customers',
      value: numberFormatter.format(dashboard.summary.totalCustomers),
      subtitle: 'Registered customers',
      icon: 'bi bi-people',
    },
    {
      title: 'Total Accounts',
      value: numberFormatter.format(dashboard.summary.totalAccounts),
      subtitle: 'Open bank accounts',
      icon: 'bi bi-wallet2',
    },
    {
      title: 'Total Bank Balance',
      value: currencyFormatter.format(dashboard.summary.totalBalance),
      subtitle: 'Across active accounts',
      icon: 'bi bi-bank',
      tone: 'balance',
    },
    {
      title: 'Pending Beneficiaries',
      value: numberFormatter.format(dashboard.summary.pendingBeneficiaries),
      subtitle: 'Awaiting review',
      icon: 'bi bi-person-check',
    },
    {
      title: 'Pending Transactions',
      value: numberFormatter.format(dashboard.summary.pendingTransactions),
      subtitle: 'Queued decisions',
      icon: 'bi bi-arrow-left-right',
    },
    {
      title: "Today's New Customers",
      value: numberFormatter.format(dashboard.summary.todayCustomers),
      subtitle: 'Created today',
      icon: 'bi bi-person-plus',
    },
  ], [dashboard.summary])

  const quickActions = [
    { label: 'Add Customer', icon: 'bi bi-person-plus', to: '/employee/customers/new' },
    { label: 'View Customers', icon: 'bi bi-people', to: '/employee/customers' },
    { label: 'Beneficiary Queue', icon: 'bi bi-person-check', to: '/employee/beneficiary-queue' },
    { label: 'Transaction Queue', icon: 'bi bi-arrow-left-right', to: '/employee/transaction-queue' },
  ]

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    const query = searchTerm.trim()
    const target = query
      ? `/employee/customers?search=${encodeURIComponent(query)}`
      : '/employee/customers'

    navigate(target)
  }

  return (
    <div className="dashboard-main employee-dashboard-page">
      <section className="title-block employee-dashboard-title">
        <div>
          <h1>Employee Dashboard</h1>
          <p>Monitor customers, queues, account health, and recent operations.</p>
        </div>
        <form className="employee-dashboard-search" onSubmit={handleSearchSubmit}>
          <div className="search-control">
            <i className="bi bi-search" aria-hidden="true"></i>
            <input
              type="search"
              placeholder="Search by name, email, phone, or account number"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <button className="profile-action-button primary-action" type="submit">
            Search
          </button>
        </form>
      </section>

      {errorMessage && (
        <div className="employee-dashboard-error" role="alert">
          <span>{errorMessage}</span>
          <button className="profile-action-button secondary-action" type="button" onClick={handleRetry}>
            Retry
          </button>
        </div>
      )}

      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <section className="employee-summary-grid" aria-label="Banking summary">
            {summaryCards.map((card) => (
              <SummaryCard {...card} key={card.title} />
            ))}
          </section>

          <section className="employee-quick-actions" aria-label="Quick actions">
            {quickActions.map((action) => (
              <button type="button" onClick={() => navigate(action.to)} key={action.label}>
                <i className={action.icon} aria-hidden="true"></i>
                <span>{action.label}</span>
              </button>
            ))}
          </section>

          <div className="employee-dashboard-grid">
            <DashboardPanel title="Recent Customers" actionLabel="View All" onAction={() => navigate('/employee/customers')}>
              <MiniTable
                columns={[
                  { key: 'name', label: 'Name' },
                  { key: 'email', label: 'Email' },
                  { key: 'phoneNumber', label: 'Phone Number' },
                  { key: 'createdDate', label: 'Created Date' },
                ]}
                rows={dashboard.recentCustomers}
                emptyMessage="No recent customers found."
              />
            </DashboardPanel>

            <DashboardPanel title="Pending Beneficiary Requests" actionLabel="View Queue" onAction={() => navigate('/employee/beneficiary-queue')}>
              <MiniTable
                columns={[
                  { key: 'customerName', label: 'Customer Name' },
                  { key: 'beneficiaryName', label: 'Beneficiary Name' },
                  { key: 'requestedDate', label: 'Requested Date' },
                  { key: 'status', label: 'Status', status: true },
                ]}
                rows={dashboard.pendingBeneficiaries}
                emptyMessage="No pending beneficiary requests."
              />
            </DashboardPanel>

            <DashboardPanel title="Pending Transactions" actionLabel="View Queue" onAction={() => navigate('/employee/transaction-queue')}>
              <MiniTable
                columns={[
                  { key: 'customer', label: 'Customer' },
                  { key: 'amount', label: 'Amount' },
                  { key: 'type', label: 'Transaction Type' },
                  { key: 'status', label: 'Status', status: true },
                ]}
                rows={dashboard.pendingTransactions}
                emptyMessage="No pending transactions."
              />
            </DashboardPanel>

            <DashboardPanel title="Account Type Statistics">
              <div className="employee-account-stat-grid">
                {dashboard.accountStatistics.map((stat) => (
                  <article className="employee-account-stat" key={stat.key}>
                    <span>{stat.label}</span>
                    <strong>{numberFormatter.format(stat.value)}</strong>
                  </article>
                ))}
              </div>
            </DashboardPanel>
          </div>

          <DashboardPanel title="Recent Activity">
            <MiniTable
              columns={[
                { key: 'activity', label: 'Activity' },
                { key: 'date', label: 'Date' },
                { key: 'time', label: 'Time' },
              ]}
              rows={dashboard.recentActivity}
              emptyMessage="No recent activity yet."
            />
          </DashboardPanel>
        </>
      )}
    </div>
  )
}

export default EmployeeDashboard
