import { useEffect, useMemo, useState } from 'react'
import { fetchDashboardSummary } from '../../api/transactions'

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
  const [dashboardError, setDashboardError] = useState('')
  const [isDashboardLoading, setIsDashboardLoading] = useState(true)
  const summaryCards = useMemo(
    () => buildSummaryCards(dashboardSummary),
    [dashboardSummary],
  )
  const accounts = dashboardSummary.accounts

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

        const nextDashboardSummary = await fetchDashboardSummary()

        if (isMounted) {
          setDashboardSummary(nextDashboardSummary)
          setDashboardError('')
        }
      } catch (error) {
        if (isMounted) {
          setDashboardSummary(emptyDashboardSummary)
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
    </div>
  )
}

export default Dashboard
