import { useEffect, useState } from 'react'
import { fetchTransactions } from '../../api/transactions'
import { accounts } from '../dashboard/dashboardData'

const rowsPerPage = 10
const statusOptions = ['All', 'Completed', 'Pending', 'Failed']
const accountOptions = [
  { label: 'All accounts', value: 'All accounts' },
  ...accounts.map((account) => ({
    label: `${account.type} (${account.id})`,
    value: account.type,
  })),
]

function Transactions() {
  const [transactionRows, setTransactionRows] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [accountFilter, setAccountFilter] = useState('All accounts')
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadTransactions = async () => {
      try {
        setIsLoading(true)
        const transactions = await fetchTransactions()

        if (isMounted) {
          setTransactionRows(transactions)
          setErrorMessage('')
        }
      } catch (error) {
        if (isMounted) {
          setTransactionRows([])
          setErrorMessage(error.message || 'Unable to load transactions.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadTransactions()

    return () => {
      isMounted = false
    }
  }, [])

  const filteredTransactions = transactionRows.filter((transaction) => {
    const searchableText = Object.values(transaction).join(' ').toLowerCase()
    const matchesSearch = searchableText.includes(searchTerm.toLowerCase())
    const matchesStatus =
      statusFilter === 'All' || transaction.status === statusFilter
    const matchesAccount =
      accountFilter === 'All accounts' || transaction.type === accountFilter

    return matchesSearch && matchesStatus && matchesAccount
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

  const handleAccountChange = (event) => {
    setAccountFilter(event.target.value)
    setCurrentPage(1)
  }

  return (
    <div className="dashboard-main">
      <section className="title-block">
        <h1>Transactions</h1>
        <p>Search, filter, and review recent account activity.</p>
      </section>

      <section className="transactions-section compact-transactions-section">
        {errorMessage && <p className="dashboard-state error">{errorMessage}</p>}
        {isLoading && <p className="dashboard-state">Loading transactions...</p>}

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
            value={accountFilter}
            onChange={handleAccountChange}
            aria-label="Filter by account"
          >
            {accountOptions.map((account) => (
              <option key={account.value} value={account.value}>
                {account.label}
              </option>
            ))}
          </select>
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
                  <td className={transaction.tone === 'credit' ? 'credit-text' : 'debit-text'}>
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
              {!isLoading && paginatedTransactions.length === 0 && (
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
