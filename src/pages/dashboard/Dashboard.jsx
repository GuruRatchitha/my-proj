import { accounts, summaryCards, transactions } from './dashboardData'

function Dashboard() {
  return (
    <div className="dashboard-main">
      <section className="title-block">
        <h1>Dashboard</h1>
        <p>A quick look at your money today.</p>
      </section>

      <section className="summary-grid" aria-label="Account summary">
        {summaryCards.map((card) => (
          <article
            className={`summary-card ${card.type === 'balance' ? 'balance-card' : ''}`}
            key={card.eyebrow}
          >
            <div className="card-heading">
              <span>{card.eyebrow}</span>
              {card.icon && <i className={`bi bi-${card.icon}`} aria-hidden="true"></i>}
              {card.status && <span className={`status-dot ${card.status}`} />}
            </div>
            <strong>{card.value}</strong>
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
          <a href="#accounts">View all</a>
        </div>

        <div className="accounts-grid" id="accounts">
          {accounts.map((account) => (
            <article className="account-card" key={account.id}>
              <span className="account-id">{account.id}</span>
              <span className="account-pill">{account.type}</span>
              <strong>{account.amount}</strong>
              <small className={account.tone}>{account.trend}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="transactions-section">
        <div className="section-heading transactions-heading">
          <div>
            <h2>Recent transactions</h2>
            <p>6 total - 4 cleared</p>
          </div>
        </div>

        <div className="transaction-list">
          {transactions.map((transaction) => (
            <article className="transaction-row" key={transaction.name}>
              <span className={`transaction-icon ${transaction.tone}`}>
                <i className={`bi bi-${transaction.icon}`} aria-hidden="true"></i>
              </span>
              <div className="transaction-name">
                <strong>{transaction.name}</strong>
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
        </div>
      </section>
    </div>
  )
}

export default Dashboard
