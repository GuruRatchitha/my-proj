import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchEmployeeTransactions } from '../../api/employeeTransactions'

const rowsPerPage = 10
const statusOptions = ['All', 'Pending', 'Hold', 'Rejected', 'Approved', 'Processing', 'Completed', 'Failed']
const queueRefreshIntervalMs = 15000

const getStatusClass = (status = '') => status.toLowerCase().replace(/\s+/g, '-')

function TransactionQueue() {
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadTransactions = async (showLoading = true) => {
      try {
        if (showLoading) {
          setIsLoading(true)
        }
        setErrorMessage('')

        const nextTransactions = await fetchEmployeeTransactions()

        if (isMounted) {
          setTransactions(nextTransactions)
        }
      } catch (error) {
        if (isMounted) {
          if (showLoading) {
            setTransactions([])
          }
          setErrorMessage(error.message || 'Unable to load transaction queue.')
        }
      } finally {
        if (isMounted && showLoading) {
          setIsLoading(false)
        }
      }
    }

    loadTransactions()
    const refreshTimer = window.setInterval(() => {
      loadTransactions(false)
    }, queueRefreshIntervalMs)

    return () => {
      isMounted = false
      window.clearInterval(refreshTimer)
    }
  }, [])

  const filteredTransactions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return transactions.filter((transaction) => {
      const searchableText = [
        transaction.time,
        transaction.reference,
        transaction.sender.name,
        transaction.sender.accountNumber,
        transaction.receiver.name,
        transaction.receiver.accountNumber,
        transaction.amount,
        transaction.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch)
      const matchesStatus = statusFilter === 'All' || transaction.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [searchTerm, statusFilter, transactions])

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

  const handleOpenTransaction = (transaction) => {
    navigate(`/employee/transaction-queue/${encodeURIComponent(transaction.id)}`, {
      state: {
        transaction,
      },
    })
  }

  return (
    <div className="dashboard-main">
      <section className="title-block">
        <h1>Transaction Queue</h1>
        <p>Review pending Fedwire payments for release decisions.</p>
      </section>

      <section className="transactions-section compact-transactions-section">
        {errorMessage && <p className="dashboard-state error">{errorMessage}</p>}
        {isLoading && <p className="dashboard-state">Loading transaction queue...</p>}

        <div className="employee-channel-bar" aria-label="Payment channel">
          <span>Channel:</span>
          <strong>Fedwire</strong>
        </div>

        <div className="table-toolbar employee-transaction-toolbar">
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
          <table className="table bank-table employee-transaction-table mb-0">
            <thead>
              <tr>
                <th>Time</th>
                <th>Transaction Reference</th>
                <th>Sender</th>
                <th>Receiver</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTransactions.map((transaction) => (
                <tr key={transaction.id || transaction.reference}>
                  <td>{transaction.time}</td>
                  <td>{transaction.reference}</td>
                  <td>{transaction.sender?.name || transaction.senderName || '-'}</td>
                  <td>{transaction.receiver?.name || transaction.receiverName || '-'}</td>
                  <td className="debit-text">{transaction.amount}</td>
                  <td>
                    <span className={`transaction-status ${getStatusClass(transaction.status)}`}>
                      {transaction.status}
                    </span>
                  </td>
                  <td>
                    <div className="employee-row-actions">
                      <button
                        className="employee-open-link"
                        type="button"
                        onClick={() => handleOpenTransaction(transaction)}
                      >
                        Open &rarr;
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && paginatedTransactions.length === 0 && (
                <tr>
                  <td colSpan="7">No transactions found.</td>
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

export default TransactionQueue
