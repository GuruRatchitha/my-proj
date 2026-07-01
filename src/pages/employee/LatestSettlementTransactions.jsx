import LoadingSpinner from '../../components/LoadingSpinner'

function LatestSettlementTransactions({
  transactions,
  isLoading,
  errorMessage,
  onRetry,
}) {
  return (
    <section
      className="employee-latest-settlements"
      aria-labelledby="latest-settlement-transactions-title"
    >
      <div className="employee-latest-settlements-heading">
        <h2 id="latest-settlement-transactions-title">Last 5 Settlement Transactions</h2>
      </div>

      <div className="transaction-table-wrap employee-latest-settlements-table-wrap">
        <table className="table bank-table employee-latest-settlements-table mb-0">
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
                  <div className="employee-latest-settlements-state">
                    <LoadingSpinner label="Loading settlement transactions" />
                  </div>
                </td>
              </tr>
            )}

            {!isLoading && errorMessage && (
              <tr>
                <td colSpan="4">
                  <div className="employee-latest-settlements-state error" role="alert">
                    <span>{errorMessage}</span>
                    <button
                      className="profile-action-button secondary-action"
                      type="button"
                      onClick={onRetry}
                    >
                      Retry
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {!isLoading && !errorMessage && transactions.map((transaction) => (
              <tr key={transaction.id || transaction.paymentId}>
                <td>{transaction.paymentId || '-'}</td>
                <td>{transaction.accountNumber || '-'}</td>
                <td className="debit-text">{transaction.formattedAmount}</td>
                <td>{transaction.status}</td>
              </tr>
            ))}

            {!isLoading && !errorMessage && transactions.length === 0 && (
              <tr>
                <td colSpan="4">
                  <div className="employee-latest-settlements-state">
                    No settlement transactions found
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default LatestSettlementTransactions
