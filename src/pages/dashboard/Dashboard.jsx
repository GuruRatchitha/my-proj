import { useEffect, useState } from 'react'
import { fetchTransactions } from '../../api/transactions'
import { accounts, summaryCards, transactions as fallbackTransactions } from './dashboardData'

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

function Dashboard() {
  const [isBalanceVisible, setIsBalanceVisible] = useState(true)
  const [transactions, setTransactions] = useState([])
  const [transactionsError, setTransactionsError] = useState('')
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const loadTransactions = async () => {
      try {
        setIsTransactionsLoading(true)
        const recentTransactions = await fetchTransactions(5)

        if (isMounted) {
          setTransactions(recentTransactions)
          setTransactionsError('')
        }
      } catch (error) {
        if (isMounted) {
          setTransactions(fallbackTransactions)
          setTransactionsError(error.message || 'Unable to load recent transactions.')
        }
      } finally {
        if (isMounted) {
          setIsTransactionsLoading(false)
        }
      }
    }

    loadTransactions()

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
        </div>
      </section>

      <section className="transactions-section">
        <div className="section-heading transactions-heading">
          <div>
            <h2>Recent transactions</h2>
            <p>Latest 5 account activities</p>
          </div>
        </div>

        {isTransactionsLoading && <p className="dashboard-state">Loading recent transactions...</p>}
        {transactionsError && <p className="dashboard-state error">{transactionsError}</p>}

        <div className="transaction-list">
          {transactions.map((transaction) => (
            <article className="transaction-row" key={transaction.id || transaction.name}>
              <span className={`transaction-icon ${transaction.tone}`}>
                <i className={`bi bi-${transaction.icon}`} aria-hidden="true"></i>
              </span>
              <div className="transaction-name">
                <strong>{transaction.receiverName || transaction.name}</strong>
                <small>{transaction.detail}</small>
              </div>
              <span className="transaction-date">{transaction.date}</span>
              <span className={`transaction-status ${transaction.status.toLowerCase()}`}>
                {transaction.status}
              </span>
              <strong className={`transaction-amount ${transaction.tone}`}>
                {transaction.amount}
              </strong>
            </article>
          ))}
          {!isTransactionsLoading && transactions.length === 0 && (
            <article className="transaction-row">
              <div className="transaction-name">
                <strong>No recent transactions found.</strong>
                <small>New activity will appear here.</small>
              </div>
            </article>
          )}
        </div>
      </section>
    </div>
  )
}

export default Dashboard
