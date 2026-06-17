import { useState } from 'react'

const transactionRows = [
  {
    id: 'TXN-10293',
    date: 'Jun 16, 2026',
    receiverName: 'Stripe Payouts',
    accountNumber: 'AC-9921',
    amount: '+$4,250.00',
    type: 'Credit',
    status: 'Completed',
    remarks: 'ACH settlement',
  },
  {
    id: 'TXN-10292',
    date: 'Jun 15, 2026',
    receiverName: 'Amazon AWS',
    accountNumber: 'AC-8412',
    amount: '-$812.40',
    type: 'Debit',
    status: 'Completed',
    remarks: 'Cloud services',
  },
  {
    id: 'TXN-10291',
    date: 'Jun 14, 2026',
    receiverName: 'Vanguard Index Fund',
    accountNumber: 'AC-7305',
    amount: '-$10,000.00',
    type: 'Debit',
    status: 'Pending',
    remarks: 'Wire transfer review',
  },
  {
    id: 'TXN-10290',
    date: 'Jun 12, 2026',
    receiverName: 'Shopify Capital',
    accountNumber: 'AC-9921',
    amount: '+$2,180.60',
    type: 'Credit',
    status: 'Completed',
    remarks: 'Merchant deposit',
  },
  {
    id: 'TXN-10289',
    date: 'Jun 10, 2026',
    receiverName: 'Payroll Batch',
    accountNumber: 'AC-8412',
    amount: '-$6,420.00',
    type: 'Debit',
    status: 'Failed',
    remarks: 'Insufficient approval',
  },
  {
    id: 'TXN-10288',
    date: 'Jun 08, 2026',
    receiverName: 'Internal Savings',
    accountNumber: 'AC-9921',
    amount: '-$1,500.00',
    type: 'Transfer',
    status: 'Completed',
    remarks: 'Monthly savings move',
  },
]

const statusOptions = ['All', 'Completed', 'Pending', 'Failed']

function Transactions() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  const filteredTransactions = transactionRows.filter((transaction) => {
    const searchableText = Object.values(transaction).join(' ').toLowerCase()
    const matchesSearch = searchableText.includes(searchTerm.toLowerCase())
    const matchesStatus =
      statusFilter === 'All' || transaction.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const summaryCards = [
    {
      eyebrow: 'Total transactions',
      value: transactionRows.length,
      detail: 'All recorded activity',
      type: 'balance',
      icon: 'receipt',
    },
    {
      eyebrow: 'Completed',
      value: transactionRows.filter((transaction) => transaction.status === 'Completed')
        .length,
      detail: 'Cleared transactions',
      status: 'success',
    },
    {
      eyebrow: 'Pending',
      value: transactionRows.filter((transaction) => transaction.status === 'Pending')
        .length,
      detail: 'Awaiting review',
      status: 'warning',
    },
    {
      eyebrow: 'Failed',
      value: transactionRows.filter((transaction) => transaction.status === 'Failed')
        .length,
      detail: 'Needs attention',
      status: 'danger',
    },
  ]

  return (
    <div className="dashboard-main">
      <section className="title-block">
        <h1>Transactions</h1>
        <p>Search, filter, and review recent account activity.</p>
      </section>

      <section className="summary-grid" aria-label="Transaction summary">
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

      <section className="transactions-section">
        <div className="section-heading">
          <div>
            <h2>Transaction history</h2>
            <p>{filteredTransactions.length} matching records</p>
          </div>
        </div>

        <div className="table-toolbar">
          <div className="search-control">
            <i className="bi bi-search" aria-hidden="true"></i>
            <input
              type="search"
              placeholder="Search transactions"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter by status"
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
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
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td>{transaction.id}</td>
                  <td>{transaction.date}</td>
                  <td>{transaction.receiverName}</td>
                  <td>{transaction.accountNumber}</td>
                  <td className={transaction.type === 'Credit' ? 'credit-text' : 'debit-text'}>
                    {transaction.amount}
                  </td>
                  <td>{transaction.type}</td>
                  <td>
                    <span className={`transaction-status ${transaction.status.toLowerCase()}`}>
                      {transaction.status}
                    </span>
                  </td>
                  <td>{transaction.remarks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default Transactions
