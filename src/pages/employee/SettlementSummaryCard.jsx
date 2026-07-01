function SettlementSummaryCard({ account }) {
  const fields = [
    ['Account Number', account?.accountNumber],
    ['Current Balance', account?.formattedCurrentBalance],
    ['Reverted Amount Balance', account?.formattedRevertedAmountBalance],
  ]

  return (
    <section className="card settlement-summary-card">
      <div className="card-body">
        <div className="settlement-section-heading">
          <div>
            <span className="account-id">Settlement Account</span>
            <h2>Account Details</h2>
          </div>
          <i className="bi bi-bank" aria-hidden="true"></i>
        </div>

        <dl className="settlement-summary-grid">
          {fields.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value || '-'}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

export default SettlementSummaryCard
