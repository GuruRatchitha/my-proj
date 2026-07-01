import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchEmployeeDashboard } from '../../api/employeeDashboard'
import { fetchLatestSettlementTransactions } from '../../api/SettlementAccountService'
import LoadingSpinner from '../../components/LoadingSpinner'
import LatestSettlementTransactions from './LatestSettlementTransactions'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const numberFormatter = new Intl.NumberFormat('en-US')

const firstValue = (...values) => values.find((value) => value || value === 0) ?? ''

const unwrapObject = (response) => response?.data || response || {}

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


const DashboardSkeleton = () => (
  <div className="employee-dashboard-skeleton">
    <LoadingSpinner label="Loading dashboard" />
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

function EmployeeDashboard() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState(() => normalizeSummary({}))
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [settlementTransactions, setSettlementTransactions] = useState([])
  const [areSettlementsLoading, setAreSettlementsLoading] = useState(true)
  const [settlementErrorMessage, setSettlementErrorMessage] = useState('')

  const loadLatestSettlementTransactions = useCallback(async () => {
    try {
      setAreSettlementsLoading(true)
      setSettlementErrorMessage('')
      setSettlementTransactions(await fetchLatestSettlementTransactions())
    } catch (error) {
      setSettlementTransactions([])
      setSettlementErrorMessage(error.message || 'Unable to load settlement transactions.')
    } finally {
      setAreSettlementsLoading(false)
    }
  }, [])

  const handleRetry = async () => {
    try {
      setIsLoading(true)
      setErrorMessage('')

      const response = await fetchEmployeeDashboard()

      setSummary(normalizeSummary(response.summary))
      setErrorMessage(response.warning || '')
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
          setSummary(normalizeSummary(response.summary))
          setErrorMessage(response.warning || '')
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

  useEffect(() => {
    let isMounted = true

    fetchLatestSettlementTransactions()
      .then((transactions) => {
        if (isMounted) {
          setSettlementTransactions(transactions)
          setSettlementErrorMessage('')
        }
      })
      .catch((error) => {
        if (isMounted) {
          setSettlementTransactions([])
          setSettlementErrorMessage(error.message || 'Unable to load settlement transactions.')
        }
      })
      .finally(() => {
        if (isMounted) {
          setAreSettlementsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  const summaryCards = useMemo(() => [
    {
      title: 'Total Customers',
      value: numberFormatter.format(summary.totalCustomers),
      subtitle: 'Registered customers',
      icon: 'bi bi-people',
    },
    {
      title: 'Total Accounts',
      value: numberFormatter.format(summary.totalAccounts),
      subtitle: 'Open bank accounts',
      icon: 'bi bi-wallet2',
    },
    {
      title: 'Total Bank Balance',
      value: currencyFormatter.format(summary.totalBalance),
      subtitle: 'Across active accounts',
      icon: 'bi bi-bank',
      tone: 'balance',
    },
    {
      title: 'Pending Beneficiaries',
      value: numberFormatter.format(summary.pendingBeneficiaries),
      subtitle: 'Awaiting review',
      icon: 'bi bi-person-check',
    },
    {
      title: 'Pending Transactions',
      value: numberFormatter.format(summary.pendingTransactions),
      subtitle: 'Queued decisions',
      icon: 'bi bi-arrow-left-right',
    },
    {
      title: "Today's New Customers",
      value: numberFormatter.format(summary.todayCustomers),
      subtitle: 'Created today',
      icon: 'bi bi-person-plus',
    },
  ], [summary])

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

      {isLoading ? <DashboardSkeleton /> : (
        <section className="employee-summary-grid" aria-label="Banking summary">
          {summaryCards.map((card) => (
            <SummaryCard {...card} key={card.title} />
          ))}
        </section>
      )}

      <LatestSettlementTransactions
        transactions={settlementTransactions}
        isLoading={areSettlementsLoading}
        errorMessage={settlementErrorMessage}
        onRetry={loadLatestSettlementTransactions}
      />
    </div>
  )
}

export default EmployeeDashboard
