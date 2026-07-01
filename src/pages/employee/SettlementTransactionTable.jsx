import { useMemo, useState } from 'react'
import { formatSettlementCurrency } from '../../api/SettlementAccountService'

const rowsPerPage = 10

const settlementTableDateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

const formatDetailedDateTime = (value, fallback) => {
  if (!value) {
    return fallback || '-'
  }

  const normalizedValue = typeof value === 'string'
    ? value.replace(/(\.\d{3})\d+/, '$1')
    : value
  const date = new Date(normalizedValue)

  return Number.isNaN(date.getTime()) ? (fallback || '-') : settlementTableDateTimeFormatter.format(date)
}

const formatSignedAmount = (transaction) => {
  const amount = Number(transaction.amount)
  const formattedAmount = formatSettlementCurrency(Number.isNaN(amount) ? 0 : Math.abs(amount))

  if (['Debited', 'Returned', 'Reverted'].includes(transaction.settlementStatus)) {
    return `-${formattedAmount}`
  }

  if (transaction.settlementStatus === 'Credited') {
    return `+${formattedAmount}`
  }

  return formattedAmount
}

function PartyDetails({ accountNumber, name, accountType, hideMissingAccountType = false }) {
  return (
    <div className="settlement-party-details">
      <strong>{accountNumber || '-'}</strong>
      <span>{name || '-'}</span>
      {(!hideMissingAccountType || accountType) && <small>{accountType || '-'}</small>}
    </div>
  )
}

function SettlementTransactionTable({
  transactions,
  isLoading,
  errorMessage,
  onRetry,
  title = 'Transaction History',
  eyebrow = 'Settlement Ledger',
  showControls = true,
  showPagination = true,
  hideMissingReceiverAccountType = false,
  useDetailedDateTime = false,
}) {
  const [paymentSearch, setPaymentSearch] = useState('')
  const [dateSort, setDateSort] = useState('newest')
  const [currentPage, setCurrentPage] = useState(1)

  const filteredTransactions = useMemo(() => {
    const normalizedPaymentSearch = paymentSearch.trim().toLowerCase()

    return transactions
      .filter((transaction) => {
        const paymentId = String(transaction.paymentId || '').toLowerCase()

        return !normalizedPaymentSearch || paymentId.includes(normalizedPaymentSearch)
      })
      .sort((firstTransaction, secondTransaction) => {
        const firstDate = firstTransaction.createdDateValue
        const secondDate = secondTransaction.createdDateValue

        return dateSort === 'newest' ? secondDate - firstDate : firstDate - secondDate
      })
  }, [dateSort, paymentSearch, transactions])

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / rowsPerPage))
  const visiblePage = Math.min(currentPage, totalPages)
  const pageStartIndex = (visiblePage - 1) * rowsPerPage
  const paginatedTransactions = filteredTransactions.slice(pageStartIndex, pageStartIndex + rowsPerPage)
  const displayedTransactions = showPagination ? paginatedTransactions : filteredTransactions

  const resetToFirstPage = () => {
    setCurrentPage(1)
  }

  return (
    <section className="transactions-section compact-transactions-section settlement-history-section">
      <div className="settlement-section-heading">
        <div>
          {eyebrow && <span className="account-id">{eyebrow}</span>}
          <h2>{title}</h2>
        </div>
        <span className="settlement-result-count">{filteredTransactions.length} records</span>
      </div>

      {showControls && (
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

          <select
            className="filter-select"
            value={dateSort}
            onChange={(event) => {
              setDateSort(event.target.value)
              resetToFirstPage()
            }}
            aria-label="Sort by date"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      )}

      <div className="transaction-table-wrap">
        <table className="table table-hover bank-table settlement-transaction-table mb-0">
          <thead>
            <tr>
              <th>Payment ID</th>
              <th>Sender Details</th>
              <th>Receiver Details</th>
              <th>Date/Time</th>
              <th>UETR</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan="7">
                  <div className="settlement-loading-state" role="status">
                    <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                    <span>Loading settlement transactions...</span>
                  </div>
                </td>
              </tr>
            )}

            {!isLoading && errorMessage && (
              <tr>
                <td colSpan="7">
                  <div className="settlement-loading-state error" role="alert">
                    <span>{errorMessage}</span>
                    {onRetry && (
                      <button
                        className="profile-action-button secondary-action"
                        type="button"
                        onClick={onRetry}
                      >
                        Retry
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}

            {!isLoading && !errorMessage && displayedTransactions.map((transaction) => (
              <tr key={transaction.id}>
                <td>{transaction.paymentId || '-'}</td>
                <td>
                  <PartyDetails
                    accountNumber={transaction.senderAccountNumber}
                    name={transaction.senderName}
                    accountType={transaction.senderAccountType}
                  />
                </td>
                <td>
                  <PartyDetails
                    accountNumber={transaction.receiverAccountNumber}
                    name={transaction.receiverName}
                    accountType={transaction.receiverAccountType}
                    hideMissingAccountType={hideMissingReceiverAccountType}
                  />
                </td>
                <td>
                  {useDetailedDateTime
                    ? formatDetailedDateTime(transaction.dateTime, transaction.formattedDateTime)
                    : transaction.formattedDateTime}
                </td>
                <td className="settlement-uetr-cell">{transaction.uetr || '-'}</td>
                <td className={`settlement-amount ${transaction.settlementStatus.toLowerCase()}`}>
                  {formatSignedAmount(transaction)}
                </td>
                <td>
                  <span className={`settlement-status ${transaction.settlementStatus.toLowerCase()}`}>
                    {transaction.settlementStatus}
                  </span>
                </td>
              </tr>
            ))}

            {!isLoading && !errorMessage && displayedTransactions.length === 0 && (
              <tr>
                <td colSpan="7">
                  <div className="settlement-empty-state">
                    <i className="bi bi-inbox" aria-hidden="true"></i>
                    <strong>No settlement transactions found</strong>
                    {showControls && <span>Try changing the search text or filters.</span>}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showPagination && (
        <div className="pagination-bar settlement-pagination-bar">
          <span>
            Showing {filteredTransactions.length === 0 ? 0 : pageStartIndex + 1}-
            {Math.min(pageStartIndex + rowsPerPage, filteredTransactions.length)} of{' '}
            {filteredTransactions.length}
          </span>

          <div className="pagination-actions">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={visiblePage === 1}
            >
              <i className="bi bi-chevron-left" aria-hidden="true"></i>
              Previous
            </button>
            <strong>
              Page {visiblePage} of {totalPages}
            </strong>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={visiblePage === totalPages}
            >
              Next
              <i className="bi bi-chevron-right" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

export default SettlementTransactionTable
