import { useMemo, useState } from 'react'
import LoadingSpinner from '../../components/LoadingSpinner'

const rowsPerPageOptions = [5, 10, 20]

const getNormalizedTransactionType = (transactionType = '') =>
  transactionType.toString().trim().toUpperCase().replace(/[\s-]+/g, '_')

const isDebitedTransaction = (transactionType = '') =>
  getNormalizedTransactionType(transactionType).includes('DEBIT')

const isCreditedTransaction = (transactionType = '') =>
  getNormalizedTransactionType(transactionType).includes('CREDIT')

const getDisplayStatus = (transaction) =>
  transaction.status || transaction.transactionType || '-'

const getDisplayAccountNumber = (transaction) => {
  const displayStatus = getDisplayStatus(transaction)

  if (isDebitedTransaction(displayStatus)) {
    return transaction.beneficiaryAccountNumber || '-'
  }

  if (isCreditedTransaction(displayStatus)) {
    return transaction.senderAccountNumber || '-'
  }

  return transaction.senderAccountNumber || transaction.beneficiaryAccountNumber || '-'
}

function SettlementTransactionTable({ transactions, isLoading, errorMessage }) {
  const [paymentSearch, setPaymentSearch] = useState('')
  const [accountSearch, setAccountSearch] = useState('')
  const [dateSort, setDateSort] = useState('newest')
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  const filteredTransactions = useMemo(() => {
    const normalizedPaymentSearch = paymentSearch.trim().toLowerCase()
    const normalizedAccountSearch = accountSearch.trim().toLowerCase()

    return transactions
      .filter((transaction) => {
        const paymentId = transaction.paymentId.toString().toLowerCase()
        const accountText = getDisplayAccountNumber(transaction).toLowerCase()

        const matchesPayment = !normalizedPaymentSearch || paymentId.includes(normalizedPaymentSearch)
        const matchesAccount = !normalizedAccountSearch || accountText.includes(normalizedAccountSearch)

        return matchesPayment && matchesAccount
      })
      .sort((firstTransaction, secondTransaction) => {
        const firstDate = firstTransaction.createdDateValue
        const secondDate = secondTransaction.createdDateValue

        return dateSort === 'newest' ? secondDate - firstDate : firstDate - secondDate
      })
  }, [accountSearch, dateSort, paymentSearch, transactions])

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / rowsPerPage))
  const pageStartIndex = (currentPage - 1) * rowsPerPage
  const paginatedTransactions = filteredTransactions.slice(pageStartIndex, pageStartIndex + rowsPerPage)

  const resetToFirstPage = () => {
    setCurrentPage(1)
  }

  return (
    <section className="transactions-section compact-transactions-section settlement-history-section">
      <div className="settlement-section-heading">
        <div>
          <span className="account-id">Settlement Ledger</span>
          <h2>Transaction History</h2>
        </div>
        <span className="settlement-result-count">{filteredTransactions.length} records</span>
      </div>

      {errorMessage && <p className="dashboard-state error">{errorMessage}</p>}

      <div className="table-toolbar settlement-table-toolbar">
        <div className="search-control">
          <i className="bi bi-search" aria-hidden="true"></i>
          <input
            type="search"
            placeholder="Search by Payment ID"
            value={paymentSearch}
            onChange={(event) => {
              setPaymentSearch(event.target.value)
              resetToFirstPage()
            }}
          />
        </div>

        <div className="search-control">
          <i className="bi bi-search" aria-hidden="true"></i>
          <input
            type="search"
            placeholder="Search by Account Number"
            value={accountSearch}
            onChange={(event) => {
              setAccountSearch(event.target.value)
              resetToFirstPage()
            }}
          />
        </div>

        <select
          className="filter-select"
          value={dateSort}
          onChange={(event) => setDateSort(event.target.value)}
          aria-label="Sort by date"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>

      <div className="transaction-table-wrap">
        <table className="table table-hover bank-table settlement-transaction-table mb-0">
          <thead>
            <tr>
              <th>Payment ID</th>
              <th>Account Number</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan="4">
                  <div className="settlement-loading-state">
                    <LoadingSpinner label="Loading settlement transactions" />
                  </div>
                </td>
              </tr>
            )}

            {!isLoading && paginatedTransactions.map((transaction) => (
              <tr key={transaction.id}>
                <td>{transaction.paymentId || '-'}</td>
                <td>{getDisplayAccountNumber(transaction)}</td>
                <td className="debit-text">{transaction.formattedAmount}</td>
                <td>{getDisplayStatus(transaction)}</td>
              </tr>
            ))}

            {!isLoading && paginatedTransactions.length === 0 && (
              <tr>
                <td colSpan="4">
                  <div className="settlement-empty-state">
                    <i className="bi bi-inbox" aria-hidden="true"></i>
                    <strong>No settlement transactions found</strong>
                    <span>Try changing the search text or filters.</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination-bar settlement-pagination-bar">
        <span>
          Showing {filteredTransactions.length === 0 ? 0 : pageStartIndex + 1}-
          {Math.min(pageStartIndex + rowsPerPage, filteredTransactions.length)} of{' '}
          {filteredTransactions.length}
        </span>

        <div className="settlement-page-size">
          <span>Rows</span>
          <select
            className="filter-select"
            value={rowsPerPage}
            onChange={(event) => {
              setRowsPerPage(Number(event.target.value))
              resetToFirstPage()
            }}
            aria-label="Rows per page"
          >
            {rowsPerPageOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

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
  )
}

export default SettlementTransactionTable
