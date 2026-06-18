import { useState } from 'react'

const initialFormValues = {
  beneficiaryName: '',
  accountNumber: '',
  routingNumber: '',
  bankName: '',
  amount: '',
}

const savedBeneficiaries = [
  {
    id: 'BEN-1001',
    beneficiaryName: 'Olivia Martin',
    accountNumber: '7845 2190 6631',
    routingNumber: '021000021',
    bankName: 'Chase Bank',
    amount: '$2,450.00',
    status: 'Inactive',
  },
  {
    id: 'BEN-1002',
    beneficiaryName: 'Noah Williams',
    accountNumber: '6910 4472 1185',
    routingNumber: '026009593',
    bankName: 'Bank of America',
    amount: '$1,275.50',
    status: 'Inactive',
  },
  {
    id: 'BEN-1003',
    beneficiaryName: 'Sophia Carter',
    accountNumber: '5528 9041 3376',
    routingNumber: '111000025',
    bankName: 'Wells Fargo',
    amount: '$3,800.00',
    status: 'Inactive',
  },
  {
    id: 'BEN-1004',
    beneficiaryName: 'Liam Thompson',
    accountNumber: '4387 1209 7754',
    routingNumber: '122105278',
    bankName: 'Citibank',
    amount: '$940.25',
    status: 'Inactive',
  },
]

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

const isApprovedStatus = (status = '') => status.toLowerCase() === 'approved'

function Beneficiary() {
  const [formValues, setFormValues] = useState(initialFormValues)
  const [beneficiaries, setBeneficiaries] = useState(savedBeneficiaries)
  const [paymentMessage, setPaymentMessage] = useState('')

  const handleInputChange = (event) => {
    const { name, value } = event.target

    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }))
  }

  const handleSaveBeneficiary = (event) => {
    event.preventDefault()
    setPaymentMessage('')
    setBeneficiaries((currentBeneficiaries) => [
      {
        id: `BEN-${Date.now()}`,
        beneficiaryName: formValues.beneficiaryName.trim(),
        accountNumber: formValues.accountNumber.trim(),
        routingNumber: formValues.routingNumber.trim(),
        bankName: formValues.bankName.trim(),
        amount: currencyFormatter.format(Number(formValues.amount || 0)),
        status: 'Inactive',
      },
      ...currentBeneficiaries,
    ])
    setFormValues(initialFormValues)
  }

  const handleMakePayment = (beneficiary) => {
    if (!isApprovedStatus(beneficiary.status)) {
      return
    }

    setPaymentMessage('Payment initiated successfully')
  }

  return (
    <div className="dashboard-main">
      <section className="beneficiary-hero-card">
        <div>
          <span className="beneficiary-kicker">
            <i className="bi bi-shield-check" aria-hidden="true"></i>
            Secure Payments
          </span>
          <h1>Beneficiary Management</h1>
          <p>Add beneficiary details and initiate payments.</p>
        </div>
        <span className="beneficiary-hero-icon">
          <i className="bi bi-person-vcard" aria-hidden="true"></i>
        </span>
      </section>

      <section className="profile-form-card beneficiary-form-card">
        <div className="section-heading">
          <div>
            <h2>Beneficiary Details</h2>
            <p>Enter verified account information for payment setup.</p>
          </div>
        </div>

        {paymentMessage && (
          <div className="alert alert-success beneficiary-alert" role="alert">
            <i className="bi bi-check-circle-fill" aria-hidden="true"></i>
            <span>{paymentMessage}</span>
          </div>
        )}

        <form onSubmit={handleSaveBeneficiary}>
          <div className="form-grid">
            <label className="bank-field">
              <span>Beneficiary Name</span>
              <input
                className="form-control"
                name="beneficiaryName"
                type="text"
                value={formValues.beneficiaryName}
                onChange={handleInputChange}
                required
              />
            </label>
            <label className="bank-field">
              <span>Account Number</span>
              <input
                className="form-control"
                name="accountNumber"
                type="text"
                value={formValues.accountNumber}
                onChange={handleInputChange}
                required
              />
            </label>
            <label className="bank-field">
              <span>ABA Routing Number</span>
              <input
                className="form-control"
                name="routingNumber"
                type="text"
                value={formValues.routingNumber}
                onChange={handleInputChange}
                required
              />
            </label>
            <label className="bank-field">
              <span>Bank Name</span>
              <input
                className="form-control"
                name="bankName"
                type="text"
                value={formValues.bankName}
                onChange={handleInputChange}
                required
              />
            </label>
            <label className="bank-field">
              <span>Amount (USD)</span>
              <input
                className="form-control"
                name="amount"
                type="number"
                min="0"
                step="0.01"
                value={formValues.amount}
                onChange={handleInputChange}
                required
              />
            </label>
          </div>

          <div className="form-actions">
            <button className="profile-action-button primary-action" type="submit">
              <i className="bi bi-bookmark-check" aria-hidden="true"></i>
              Save Beneficiary
            </button>
            {/* <button className="profile-action-button secondary-action" type="button" onClick={handleMakePayment}>
              <i className="bi bi-send-check" aria-hidden="true"></i>
              Make Payment
            </button> */}
          </div>
        </form>
      </section>

      <section className="transactions-section">
        <div className="section-heading transactions-heading">
          <div>
            <h2>Saved Beneficiaries</h2>
            <p>Active payment recipients ready for transfer.</p>
          </div>
        </div>

        <div className="transaction-table-wrap beneficiary-table-wrap">
          <table className="table bank-table beneficiary-table mb-0">
            <thead>
              <tr>
                <th>Beneficiary Name</th>
                <th>Account Number</th>
                <th>ABA Routing Number</th>
                <th>Bank Name</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {beneficiaries.map((beneficiary) => {
                const isApproved = isApprovedStatus(beneficiary.status)

                return (
                  <tr key={beneficiary.id}>
                    <td>
                      <span className="beneficiary-name-cell">
                        <i className="bi bi-person-circle" aria-hidden="true"></i>
                        {beneficiary.beneficiaryName}
                      </span>
                    </td>
                    <td>{beneficiary.accountNumber}</td>
                    <td>{beneficiary.routingNumber}</td>
                    <td>{beneficiary.bankName}</td>
                    <td className="credit-text">{beneficiary.amount}</td>
                    <td>
                      <span className={`badge beneficiary-status-badge ${beneficiary.status.toLowerCase()}`}>
                        {beneficiary.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="table-payment-button"
                        type="button"
                        onClick={() => handleMakePayment(beneficiary)}
                        disabled={!isApproved}
                      >
                        <i className="bi bi-send" aria-hidden="true"></i>
                        Make Payment
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default Beneficiary
