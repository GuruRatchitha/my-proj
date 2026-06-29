import { useEffect, useMemo, useState } from 'react'
import { fetchDashboardSummary, fetchTransactions } from '../../api/transactions'

const rowsPerPage = 5

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

const emptyDashboardSummary = {
  totalBalance: 0,
  accountCount: 0,
  completedTransactions: 0,
  pendingTransactions: 0,
  accounts: [],
}

const buildSummaryCards = (summary) => {
  const accountTypes = new Set(summary.accounts.map((account) => account.type).filter(Boolean))

  return [
    {
      type: 'balance',
      eyebrow: 'Total balance',
      value: currencyFormatter.format(summary.totalBalance),
      detail: summary.accountCount > 0 ? `${summary.accountCount} accounts loaded` : 'No accounts loaded',
      icon: 'eye',
    },
    {
      eyebrow: 'Accounts',
      value: String(summary.accountCount),
      detail: [...accountTypes].join(' - ') || 'No account activity',
    },
    {
      eyebrow: 'Completed',
      value: String(summary.completedTransactions),
      detail: 'Cleared transactions',
      status: 'success',
    },
    {
      eyebrow: 'Pending',
      value: String(summary.pendingTransactions),
      detail: `${summary.pendingTransactions} awaiting review`,
      status: 'warning',
    },
  ]
}

function Dashboard() {
  const [isBalanceVisible, setIsBalanceVisible] = useState(true)
  const [dashboardSummary, setDashboardSummary] = useState(emptyDashboardSummary)
  const [transactionRows, setTransactionRows] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [dashboardError, setDashboardError] = useState('')
  const [isDashboardLoading, setIsDashboardLoading] = useState(true)
  const summaryCards = useMemo(
    () => buildSummaryCards(dashboardSummary),
    [dashboardSummary],
  )
  const accounts = dashboardSummary.accounts
  const totalTransactionPages = Math.max(1, Math.ceil(transactionRows.length / rowsPerPage))
  const pageStartIndex = (currentPage - 1) * rowsPerPage
  const paginatedTransactions = transactionRows.slice(pageStartIndex, pageStartIndex + rowsPerPage)

  const availableAccounts = accounts
    .filter((account) => !['salary', 'fixed deposit'].includes(account.type.toLowerCase()))
    .slice(0, 3)
  const accountSummaryDetail = availableAccounts.map((account) => account.type).join(' - ')
  const dashboardSummaryCards = summaryCards.map((card) =>
    card.eyebrow === 'Accounts'
      ? {
        ...card,
        value: String(availableAccounts.length),
        detail: accountSummaryDetail,
      }
      : card,
  )

  useEffect(() => {
    let isMounted = true

    const loadDashboardSummary = async () => {
      try {
        setIsDashboardLoading(true)
        setDashboardSummary(emptyDashboardSummary)
        setDashboardError('')

        const [nextDashboardSummary, nextTransactions] = await Promise.all([
          fetchDashboardSummary(),
          fetchTransactions(),
        ])

        if (isMounted) {
          setDashboardSummary(nextDashboardSummary)
          setTransactionRows(nextTransactions)
          setCurrentPage(1)
          setDashboardError('')
        }
      } catch (error) {
        if (isMounted) {
          setDashboardSummary(emptyDashboardSummary)
          setTransactionRows([])
          setDashboardError(error.message || 'Unable to load dashboard summary.')
        }
      } finally {
        if (isMounted) {
          setIsDashboardLoading(false)
        }
      }
    }

    loadDashboardSummary()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="dashboard-main">
      <section className="title-block">
        <h1>Dashboard</h1>
        <p>A quick look at your money today.</p>
      </section>

      <section className="summary-grid" aria-label="Account summary">
        {dashboardSummaryCards.map((card) => (
          <article
            className={`summary-card ${card.type === 'balance' ? 'balance-card' : ''}`}
            key={card.eyebrow}
          >
            <div className="card-heading">
              <span>{card.eyebrow}</span>
              {card.icon && card.type === 'balance' && (
                <button
                  className="balance-toggle"
                  type="button"
                  aria-label={isBalanceVisible ? 'Hide balance' : 'Show balance'}
                  onClick={() => setIsBalanceVisible((currentValue) => !currentValue)}
                >
                  <i
                    className={`bi bi-${isBalanceVisible ? 'eye' : 'eye-slash'}`}
                    aria-hidden="true"
                  ></i>
                </button>
              )}
              {card.icon && card.type !== 'balance' && (
                <i className={`bi bi-${card.icon}`} aria-hidden="true"></i>
              )}
              {card.status && <span className={`status-dot ${card.status}`} />}
            </div>
            <strong>{card.type === 'balance' && !isBalanceVisible ? '*****' : card.value}</strong>
            <small>{card.detail}</small>
          </article>
        ))}
      </section>

      <section className="accounts-section">
        <div className="section-heading">
          <div>
            <h2>Your accounts</h2>
            <p>Live view across your portfolio.</p>
          </div>
        </div>

        <div className="accounts-grid" id="accounts">
          {availableAccounts.map((account) => (
            <article className="account-card" key={account.id}>
              <span className="account-id">{account.id}</span>
              <span className="account-pill">{account.type}</span>
              <strong>{account.amount}</strong>
            </article>
          ))}
          {!isDashboardLoading && accounts.length === 0 && (
            <article className="account-card">
              <span className="account-id">No accounts found</span>
              <span className="account-pill">Live data</span>
              <strong>$0.00</strong>
            </article>
          )}
        </div>
      </section>

      {isDashboardLoading && (
        <div className="section-loader" role="status" aria-live="polite">
          <span className="section-loader-spinner" aria-hidden="true"></span>
          <span>Loading dashboard...</span>
        </div>
      )}
      {dashboardError && <p className="dashboard-state error">{dashboardError}</p>}

      <section className="transactions-section compact-transactions-section">
        <div className="section-heading transactions-heading">
          <div>
            <h2>Recent Transactions</h2>
            <p>Latest account activity for this customer.</p>
          </div>
        </div>

        <div className="transaction-table-wrap">
          <table className="table bank-table mb-0">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Date</th>
                <th>Receiver Name</th>
                <th>Account Number</th>
                <th>Amount</th>
                <th>Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTransactions.map((transaction) => (
                <tr key={transaction.id || `${transaction.accountNumber}-${transaction.date}`}>
                  <td>{transaction.id || '-'}</td>
                  <td>{transaction.date}</td>
                  <td>{transaction.receiverName || '-'}</td>
                  <td>{transaction.accountNumber || '-'}</td>
                  <td className={transaction.tone === 'credit' ? 'credit-text' : 'debit-text'}>
                    {transaction.amount}
                  </td>
                  <td>{transaction.type || '-'}</td>
                  <td>
                    <span className={`transaction-status ${(transaction.status || '').toLowerCase().replace(/\s+/g, '-')}`}>
                      {transaction.status || '-'}
                    </span>
                  </td>
                </tr>
              ))}
              {!isDashboardLoading && paginatedTransactions.length === 0 && (
                <tr>
                  <td colSpan="7">No recent transactions found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar">
          <span>
            Showing {transactionRows.length === 0 ? 0 : pageStartIndex + 1}-
            {Math.min(pageStartIndex + rowsPerPage, transactionRows.length)} of {transactionRows.length}
          </span>
          <div className="pagination-actions">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
            >
              <i className="bi bi-chevron-left" aria-hidden="true"></i>
              Previous
            </button>
            <strong>
              Page {currentPage} of {totalTransactionPages}
            </strong>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalTransactionPages, page + 1))}
              disabled={currentPage === totalTransactionPages}
            >
              Next
              <i className="bi bi-chevron-right" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Dashboard
