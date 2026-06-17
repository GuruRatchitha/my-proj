import { useState } from 'react'

const rowsPerPage = 10

const transactionRows = [
  {
    id: 'TXN-10293',
    date: 'Jun 16, 2026',
    receiverName: 'Stripe Payouts',
    accountNumber: 'AC-9921',
    amount: '+₹4,250.00',
    type: 'Credit',
    status: 'Completed',
    remarks: 'ACH settlement',
  },
  {
    id: 'TXN-10292',
    date: 'Jun 15, 2026',
    receiverName: 'Amazon AWS',
    accountNumber: 'AC-8412',
    amount: '-₹812.40',
    type: 'Debit',
    status: 'Completed',
    remarks: 'Cloud services',
  },
  {
    id: 'TXN-10291',
    date: 'Jun 14, 2026',
    receiverName: 'Vanguard Index Fund',
    accountNumber: 'AC-7305',
    amount: '-₹10,000.00',
    type: 'Debit',
    status: 'Pending',
    remarks: 'Wire transfer review',
  },
  {
    id: 'TXN-10290',
    date: 'Jun 12, 2026',
    receiverName: 'Shopify Capital',
    accountNumber: 'AC-9921',
    amount: '+₹2,180.60',
    type: 'Credit',
    status: 'Completed',
    remarks: 'Merchant deposit',
  },
  {
    id: 'TXN-10289',
    date: 'Jun 10, 2026',
    receiverName: 'Payroll Batch',
    accountNumber: 'AC-8412',
    amount: '-₹6,420.00',
    type: 'Debit',
    status: 'Failed',
    remarks: 'Insufficient approval',
  },
  {
    id: 'TXN-10288',
    date: 'Jun 08, 2026',
    receiverName: 'Internal Savings',
    accountNumber: 'AC-9921',
    amount: '-₹1,500.00',
    type: 'Transfer',
    status: 'Completed',
    remarks: 'Monthly savings move',
  },
  {
    id: 'TXN-10287',
    date: 'Jun 07, 2026',
    receiverName: 'Rent Payment',
    accountNumber: 'AC-8412',
    amount: '-₹32,000.00',
    type: 'Debit',
    status: 'Completed',
    remarks: 'Apartment rent',
  },
  {
    id: 'TXN-10286',
    date: 'Jun 05, 2026',
    receiverName: 'Salary Credit',
    accountNumber: 'AC-6218',
    amount: '+₹86,340.20',
    type: 'Credit',
    status: 'Completed',
    remarks: 'Monthly salary',
  },
  {
    id: 'TXN-10285',
    date: 'Jun 04, 2026',
    receiverName: 'Utility Board',
    accountNumber: 'AC-8412',
    amount: '-₹3,420.00',
    type: 'Debit',
    status: 'Completed',
    remarks: 'Electricity bill',
  },
  {
    id: 'TXN-10284',
    date: 'Jun 03, 2026',
    receiverName: 'Mutual Fund SIP',
    accountNumber: 'AC-7305',
    amount: '-₹15,000.00',
    type: 'Debit',
    status: 'Pending',
    remarks: 'Scheduled investment',
  },
  {
    id: 'TXN-10283',
    date: 'Jun 02, 2026',
    receiverName: 'Insurance Premium',
    accountNumber: 'AC-8412',
    amount: '-₹9,800.00',
    type: 'Debit',
    status: 'Completed',
    remarks: 'Policy renewal',
  },
  {
    id: 'TXN-10282',
    date: 'May 31, 2026',
    receiverName: 'Card Cashback',
    accountNumber: 'AC-9921',
    amount: '+₹1,240.00',
    type: 'Credit',
    status: 'Completed',
    remarks: 'Reward credit',
  },
  {
    id: 'TXN-10281',
    date: 'May 29, 2026',
    receiverName: 'Travel Booking',
    accountNumber: 'AC-8412',
    amount: '-₹18,650.00',
    type: 'Debit',
    status: 'Failed',
    remarks: 'Gateway timeout',
  },
  {
    id: 'TXN-10280',
    date: 'May 28, 2026',
    receiverName: 'Fixed Deposit',
    accountNumber: 'AC-5190',
    amount: '-₹50,000.00',
    type: 'Transfer',
    status: 'Completed',
    remarks: 'Deposit booking',
  },
  {
    id: 'TXN-10279',
    date: 'May 26, 2026',
    receiverName: 'Medical Store',
    accountNumber: 'AC-8412',
    amount: '-₹2,310.00',
    type: 'Debit',
    status: 'Completed',
    remarks: 'Card payment',
  },
  {
    id: 'TXN-10278',
    date: 'May 24, 2026',
    receiverName: 'Freelance Invoice',
    accountNumber: 'AC-9921',
    amount: '+₹22,500.00',
    type: 'Credit',
    status: 'Pending',
    remarks: 'Client transfer',
  },
]

const statusOptions = ['All', 'Completed', 'Pending', 'Failed']

function Transactions() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)

  const filteredTransactions = transactionRows.filter((transaction) => {
    const searchableText = Object.values(transaction).join(' ').toLowerCase()
    const matchesSearch = searchableText.includes(searchTerm.toLowerCase())
    const matchesStatus =
      statusFilter === 'All' || transaction.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / rowsPerPage))
  const pageStartIndex = (currentPage - 1) * rowsPerPage
  const paginatedTransactions = filteredTransactions.slice(
    pageStartIndex,
    pageStartIndex + rowsPerPage,
  )

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value)
    setCurrentPage(1)
  }

  const handleStatusChange = (event) => {
    setStatusFilter(event.target.value)
    setCurrentPage(1)
  }

  return (
    <div className="dashboard-main">
      <section className="title-block">
        <h1>Transactions</h1>
        <p>Search, filter, and review recent account activity.</p>
      </section>

      <section className="transactions-section compact-transactions-section">
        <div className="table-toolbar">
          <div className="search-control">
            <i className="bi bi-search" aria-hidden="true"></i>
            <input
              type="search"
              placeholder="Search transactions"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
          <select
            className="filter-select"
            value={statusFilter}
            onChange={handleStatusChange}
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
              {paginatedTransactions.map((transaction) => (
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
              {paginatedTransactions.length === 0 && (
                <tr>
                  <td colSpan="8">No transactions found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar">
          <span>
            Showing {filteredTransactions.length === 0 ? 0 : pageStartIndex + 1}-
            {Math.min(pageStartIndex + rowsPerPage, filteredTransactions.length)} of{' '}
            {filteredTransactions.length}
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
              Page {currentPage} of {totalPages}
            </strong>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
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

export default Transactions
