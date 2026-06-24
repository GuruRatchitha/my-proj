import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { makePayment } from '../../api/payments'

const getBeneficiaryId = (beneficiary) =>
  beneficiary?.id ||
  beneficiary?.beneficiaryId ||
  null

function Payment() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const beneficiary = state?.beneficiary

  const [amount, setAmount] = useState('')
  const [isAmountTouched, setIsAmountTouched] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [paymentResult, setPaymentResult] = useState(null)

  const numericAmount = useMemo(() => Number(amount), [amount])
  const isAmountValid = amount.trim() !== '' && Number.isFinite(numericAmount) && numericAmount > 0
  const shouldShowAmountError = isAmountTouched && !isAmountValid

  const handleAmountChange = (event) => {
    const sanitizedAmount = event.target.value
      .replace(/[^\d.]/g, '')
      .replace(/(\..*)\./g, '$1')

    setAmount(sanitizedAmount)
    setSuccessMessage('')
    setErrorMessage('')
  }

  const handlePaymentSubmit = async (event) => {
    event.preventDefault()
    setIsAmountTouched(true)
    setSuccessMessage('')
    setErrorMessage('')
    setPaymentResult(null)

    if (!beneficiary) {
      setErrorMessage('Beneficiary details are missing. Please select an active beneficiary again.')
      return
    }

    const beneficiaryId = getBeneficiaryId(beneficiary)
    const numericBeneficiaryId = Number(beneficiaryId)

    if (!Number.isInteger(numericBeneficiaryId) || numericBeneficiaryId <= 0) {
      setErrorMessage('Beneficiary ID is missing. Please select the beneficiary again after refreshing the list.')
      return
    }

    if (!isAmountValid) {
      return
    }

    const payload = {
      amount: numericAmount,
      beneficiaryId: numericBeneficiaryId,
    }

    try {
      setIsSubmitting(true)
      const response = await makePayment(payload)
      setPaymentResult(response)
      setSuccessMessage(response?.transactionStatus ? `Payment submitted. Status: ${response.transactionStatus}.` : 'Payment submitted successfully.')
      setAmount('')
      setIsAmountTouched(false)
    } catch (error) {
      setErrorMessage(error.message || 'Unable to process payment. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!beneficiary) {
    return (
      <div className="dashboard-main">
        <section className="profile-form-card payment-empty-card">
          <span className="payment-empty-icon">
            <i className="bi bi-exclamation-circle" aria-hidden="true"></i>
          </span>
          <h1>Beneficiary Required</h1>
          <p>Select an active beneficiary before starting a payment.</p>
          <button
            className="profile-action-button primary-action"
            type="button"
            onClick={() => navigate('/customer/beneficiary')}
          >
            <i className="bi bi-arrow-left" aria-hidden="true"></i>
            Back to Beneficiaries
          </button>
        </section>
      </div>
    )
  }

  return (
    <div className="dashboard-main payment-page">
      <section className="beneficiary-hero-card payment-hero-card">
        <div>
          <span className="beneficiary-kicker">
            <i className="bi bi-send-check" aria-hidden="true"></i>
            Payment Details
          </span>
          <h1>Make Payment</h1>
          <p>Review beneficiary information and enter the transfer amount.</p>
        </div>
        <span className="beneficiary-hero-icon">
          <i className="bi bi-credit-card-2-front" aria-hidden="true"></i>
        </span>
      </section>

      <form className="payment-dashboard-card" noValidate onSubmit={handlePaymentSubmit}>
        {successMessage && (
          <div className="alert alert-success beneficiary-alert payment-alert" role="alert">
            <i className="bi bi-check-circle-fill" aria-hidden="true"></i>
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="alert alert-danger beneficiary-alert payment-alert" role="alert">
            <i className="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
            <span>{errorMessage}</span>
          </div>
        )}
        {paymentResult && (
          <section className="payment-info-card payment-result-card" aria-label="Payment confirmation">
            <div className="section-heading">
              <div>
                <h2>Payment Confirmation</h2>
                <p>Keep these references for tracking the transfer.</p>
              </div>
            </div>
            <div className="form-grid">
              <label className="bank-field">
                <span>Transaction ID</span>
                <input className="form-control payment-readonly-control" type="text" value={paymentResult.transactionId || ''} disabled readOnly />
              </label>
              <label className="bank-field">
                <span>Transfer ID</span>
                <input className="form-control payment-readonly-control" type="text" value={paymentResult.transferId || ''} disabled readOnly />
              </label>
              <label className="bank-field">
                <span>Payment Transaction ID</span>
                <input className="form-control payment-readonly-control" type="text" value={paymentResult.paymentTransactionId || ''} disabled readOnly />
              </label>
              <label className="bank-field">
                <span>Bank Transaction ID</span>
                <input className="form-control payment-readonly-control" type="text" value={paymentResult.bankTransactionId || ''} disabled readOnly />
              </label>
              <label className="bank-field">
                <span>Status</span>
                <input className="form-control payment-readonly-control" type="text" value={paymentResult.transactionStatus || ''} disabled readOnly />
              </label>
              <label className="bank-field">
                <span>UETR</span>
                <input className="form-control payment-readonly-control" type="text" value={paymentResult.uetr || ''} disabled readOnly />
              </label>
            </div>
          </section>
        )}

        <div className="payment-card-grid">
          <section className="payment-info-card">
            <div className="section-heading">
              <div>
                <h2>Beneficiary Information</h2>
                <p>These approved beneficiary details cannot be edited.</p>
              </div>
            </div>

            <div className="form-grid">
              <label className="bank-field">
                <span>Beneficiary Name</span>
                <input className="form-control payment-readonly-control" type="text" value={beneficiary.beneficiaryName || ''} disabled readOnly />
              </label>
              <label className="bank-field">
                <span>Account Number</span>
                <input className="form-control payment-readonly-control" type="text" value={beneficiary.accountNumber || ''} disabled readOnly />
              </label>
              <label className="bank-field">
                <span>Routing Number</span>
                <input className="form-control payment-readonly-control" type="text" value={beneficiary.routingNumber || ''} disabled readOnly />
              </label>
              <label className="bank-field">
                <span>Country Code</span>
                <input className="form-control payment-readonly-control" type="text" value={beneficiary.countryCode || ''} disabled readOnly />
              </label>
              <label className="bank-field">
                <span>Town Name</span>
                <input className="form-control payment-readonly-control" type="text" value={beneficiary.townName || ''} disabled readOnly />
              </label>
            </div>
          </section>

          <section className="payment-info-card payment-entry-card">
            <div className="section-heading">
              <div>
                <h2>Payment Information</h2>
                <p>Only the payment amount is editable.</p>
              </div>
            </div>

            <div className="form-grid">
              <label className="bank-field payment-amount-field">
                <span>Amount</span>
                <div className="payment-amount-control">
                  <span className="payment-currency-symbol">$</span>
                  <input
                    className={`form-control ${shouldShowAmountError ? 'is-invalid' : ''}`}
                    name="amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onBlur={() => setIsAmountTouched(true)}
                    onChange={handleAmountChange}
                    required
                    aria-describedby="amountFeedback"
                  />
                  <div id="amountFeedback" className="invalid-feedback">
                    Enter an amount greater than 0.
                  </div>
                </div>
              </label>
            </div>

            <div className="form-actions payment-submit-row">
              <button
                className="profile-action-button secondary-action"
                type="button"
                onClick={() => navigate('/customer/beneficiary')}
              >
                <i className="bi bi-arrow-left" aria-hidden="true"></i>
                Back
              </button>
              <button
                className="profile-action-button primary-action"
                type="submit"
                disabled={!isAmountValid || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                    Processing...
                  </>
                ) : (
                  <>
                    <i className="bi bi-send-check" aria-hidden="true"></i>
                    Make Payment
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      </form>
    </div>
  )
}

export default Payment
