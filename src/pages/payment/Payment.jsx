import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getStoredCurrentUser, getStoredUserId } from '../../api/currentUser'
import { makePayment } from '../../api/payments'
import { fetchDashboardSummary } from '../../api/transactions'
import LoadingSpinner from '../../components/LoadingSpinner'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

const paymentSteps = {
  details: 'details',
  confirmation: 'confirmation',
  success: 'success',
}

const referencePrefixes = {
  transactionId: 'TXN',
  transferId: 'TRF',
  paymentTransactionId: 'PMT',
  bankTransactionId: 'BNK',
}

const PAYMENT_DRAFT_STORAGE_KEY = 'customerPaymentDraft'
const PAYMENT_RESULT_STORAGE_KEY = 'customerPaymentResult'

const getFirstValue = (...values) =>
  values.find((value) => value || value === 0) ?? ''

const getBeneficiaryId = (beneficiary) =>
  beneficiary?.id ||
  beneficiary?.beneficiaryId ||
  null

const getNumericBeneficiaryId = (beneficiary) => {
  const beneficiaryId = Number(getBeneficiaryId(beneficiary))

  return Number.isInteger(beneficiaryId) && beneficiaryId > 0 ? beneficiaryId : null
}

const getAccountNumber = (account) =>
  getFirstValue(account?.accountNumber, account?.id, account?.accountNo, account?.number)

const getAccountType = (account) =>
  getFirstValue(account?.accountType, account?.type, account?.productType, 'Account')

const getAccountBalance = (account) => {
  const balance = getFirstValue(
    account?.balance,
    account?.availableBalance,
    account?.currentBalance,
    account?.accountBalance,
    0,
  )

  return Number(balance)
}

const readStoredJson = (storageKey) => {
  try {
    const storedValue = sessionStorage.getItem(storageKey)

    return storedValue ? JSON.parse(storedValue) : null
  } catch {
    sessionStorage.removeItem(storageKey)
    return null
  }
}

const writeStoredJson = (storageKey, value) => {
  if (!value) {
    sessionStorage.removeItem(storageKey)
    return
  }

  sessionStorage.setItem(storageKey, JSON.stringify(value))
}

const getPaymentStep = (pathname) => {
  if (pathname.endsWith('/confirmation')) {
    return paymentSteps.confirmation
  }

  if (pathname.endsWith('/success')) {
    return paymentSteps.success
  }

  return paymentSteps.details
}

const createReference = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`

const createUetr = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  return createReference('UETR')
}

const normalizePaymentResult = (response, draft, clientReferences) => {
  const transaction = response?.transaction || response?.payment || response || {}
  const transactionStatus = getFirstValue(
    transaction.transactionStatus,
    transaction.transferStatus,
    transaction.status,
    'PENDING',
  )

  return {
    transactionId: getFirstValue(transaction.transactionId, transaction.id, clientReferences.transactionId),
    transferId: getFirstValue(transaction.transferId, clientReferences.transferId),
    paymentTransactionId: getFirstValue(
      transaction.paymentTransactionId,
      transaction.transactionReference,
      clientReferences.paymentTransactionId,
    ),
    bankTransactionId: getFirstValue(transaction.bankTransactionId, clientReferences.bankTransactionId),
    uetr: getFirstValue(transaction.uetr, transaction.uetrId, clientReferences.uetr),
    transactionStatus: transactionStatus.toString().toUpperCase(),
    amount: getFirstValue(transaction.amount, draft.amount),
    beneficiary: draft.beneficiary,
    sourceAccount: draft.sourceAccount,
  }
}

const formatAccountOption = (account) =>
  `${getAccountType(account)} - ${getAccountNumber(account)} - Available Balance: ${currencyFormatter.format(getAccountBalance(account))}`

function ReadOnlyField({ label, value }) {
  return (
    <label className="bank-field">
      <span>{label}</span>
      <input
        className="form-control payment-readonly-control"
        type="text"
        value={value || ''}
        disabled
        readOnly
      />
    </label>
  )
}

function BeneficiaryFields({ beneficiary }) {
  return (
    <div className="form-grid">
      <ReadOnlyField label="Beneficiary Name" value={beneficiary?.beneficiaryName} />
      <ReadOnlyField label="Account Number" value={beneficiary?.accountNumber} />
      <ReadOnlyField label="Routing Number" value={beneficiary?.routingNumber} />
      <ReadOnlyField label="Country Code" value={beneficiary?.countryCode} />
      <ReadOnlyField label="Town Name" value={beneficiary?.townName} />
    </div>
  )
}

function SourceAccountFields({ sourceAccount }) {
  return (
    <div className="form-grid">
      <ReadOnlyField label="Account Type" value={getAccountType(sourceAccount)} />
      <ReadOnlyField label="Account Number" value={getAccountNumber(sourceAccount)} />
    </div>
  )
}

function MissingBeneficiary({ navigate }) {
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

function Payment() {
  const navigate = useNavigate()
  const location = useLocation()
  const step = getPaymentStep(location.pathname)
  const storedDraft = readStoredJson(PAYMENT_DRAFT_STORAGE_KEY)
  const storedResult = readStoredJson(PAYMENT_RESULT_STORAGE_KEY)
  const stateDraft = location.state?.paymentDraft || storedDraft
  const successResult = location.state?.paymentResult || storedResult
  const beneficiary = location.state?.beneficiary || stateDraft?.beneficiary || successResult?.beneficiary

  const [amount, setAmount] = useState(stateDraft?.amount || '')
  const [selectedAccountId, setSelectedAccountId] = useState(getAccountNumber(stateDraft?.sourceAccount) || '')
  const [isAmountTouched, setIsAmountTouched] = useState(false)
  const [isSourceTouched, setIsSourceTouched] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [accounts, setAccounts] = useState(stateDraft?.accounts || [])
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(step === paymentSteps.details)
  const [accountsError, setAccountsError] = useState('')
  const hasSubmittedRef = useRef(false)

  useEffect(() => {
    if (step !== paymentSteps.details) {
      return undefined
    }

    let isMounted = true

    const loadAccounts = async () => {
      try {
        setIsLoadingAccounts(true)
        setAccountsError('')

        const summary = await fetchDashboardSummary()
        const nextAccounts = Array.isArray(summary.accounts) ? summary.accounts : []

        if (isMounted) {
          setAccounts(nextAccounts)
        }
      } catch (error) {
        if (isMounted) {
          setAccounts([])
          setAccountsError(error.message || 'Unable to load source accounts.')
        }
      } finally {
        if (isMounted) {
          setIsLoadingAccounts(false)
        }
      }
    }

    loadAccounts()

    return () => {
      isMounted = false
    }
  }, [step])

  const selectedAccount = useMemo(
    () => {
      if (!selectedAccountId) {
        return null
      }

      return (
        accounts.find((account) => String(getAccountNumber(account)) === String(selectedAccountId)) ||
        stateDraft?.sourceAccount ||
        null
      )
    },
    [accounts, selectedAccountId, stateDraft],
  )

  const isAmountValid = amount.trim() !== ''
  const hasSourceAccount = Boolean(selectedAccount)
  const selectedAccountBalance = hasSourceAccount ? getAccountBalance(selectedAccount) : 0
  const shouldShowAmountError = isAmountTouched && !isAmountValid
  const shouldShowSourceError = isSourceTouched && !hasSourceAccount
  const canContinue = isAmountValid && hasSourceAccount

  const paymentDraft = useMemo(
    () => ({
      beneficiary,
      amount,
      sourceAccount: selectedAccount,
      accounts,
    }),
    [accounts, amount, beneficiary, selectedAccount],
  )

  useEffect(() => {
    if (!beneficiary || step === paymentSteps.success) {
      return
    }

    writeStoredJson(PAYMENT_DRAFT_STORAGE_KEY, paymentDraft)
  }, [beneficiary, paymentDraft, step])

  const handleAmountChange = (event) => {
    const sanitizedAmount = event.target.value
      .replace(/[^\d.]/g, '')
      .replace(/(\..*)\./g, '$1')

    setAmount(sanitizedAmount)
    setErrorMessage('')
  }

  const handleDetailsSubmit = (event) => {
    event.preventDefault()
    setIsAmountTouched(true)
    setIsSourceTouched(true)
    setErrorMessage('')

    if (!canContinue) {
      return
    }

    navigate('/payment/confirmation', {
      state: {
        paymentDraft,
      },
    })
  }

  const handleConfirmPayment = async () => {
    if (isSubmitting || hasSubmittedRef.current) {
      return
    }

    hasSubmittedRef.current = true
    setErrorMessage('')

    const clientReferences = {
      transactionId: createReference(referencePrefixes.transactionId),
      transferId: createReference(referencePrefixes.transferId),
      paymentTransactionId: createReference(referencePrefixes.paymentTransactionId),
      bankTransactionId: createReference(referencePrefixes.bankTransactionId),
      uetr: createUetr(),
    }
    const currentUser = getStoredCurrentUser()
    const userId = getStoredUserId() || currentUser?.userId || ''
    const customerName = getFirstValue(currentUser?.userName, currentUser?.name, currentUser?.email, 'Account holder')
    const numericBeneficiaryId = getNumericBeneficiaryId(paymentDraft.beneficiary)
    const sourceAccountNumber = getAccountNumber(paymentDraft.sourceAccount)
    const sourceAccountType = getAccountType(paymentDraft.sourceAccount)
    const sourceAccountBalance = getAccountBalance(paymentDraft.sourceAccount)
    const beneficiaryAccountNumber = paymentDraft.beneficiary.accountNumber
    const beneficiaryRoutingNumber = paymentDraft.beneficiary.routingNumber
    const paymentDate = new Date().toISOString()

    const payload = {
      amount: Number(paymentDraft.amount),
      transferAmount: Number(paymentDraft.amount),
      ...(userId ? { userId } : {}),
      ...(numericBeneficiaryId ? { beneficiaryId: numericBeneficiaryId } : {}),
      beneficiaryName: paymentDraft.beneficiary.beneficiaryName,
      beneficiaryAccountNumber,
      beneficiaryRoutingNumber,
      beneficiaryCountry: paymentDraft.beneficiary.countryCode,
      beneficiaryTownName: paymentDraft.beneficiary.townName,
      receiverName: paymentDraft.beneficiary.beneficiaryName,
      receiverAccountNumber: beneficiaryAccountNumber,
      receiverRoutingNumber: beneficiaryRoutingNumber,
      receiverCountry: paymentDraft.beneficiary.countryCode,
      creditorName: paymentDraft.beneficiary.beneficiaryName,
      creditorAccountNumber: beneficiaryAccountNumber,
      creditorRoutingNumber: beneficiaryRoutingNumber,
      toAccountNumber: beneficiaryAccountNumber,
      toRoutingNumber: beneficiaryRoutingNumber,
      countryCode: paymentDraft.beneficiary.countryCode,
      townName: paymentDraft.beneficiary.townName,
      sourceAccountNumber,
      senderAccountNumber: sourceAccountNumber,
      debtorAccountNumber: sourceAccountNumber,
      fromAccountNumber: sourceAccountNumber,
      accountNumber: sourceAccountNumber,
      sourceAccountType,
      accountType: sourceAccountType,
      sourceAccountBalance,
      availableBalance: sourceAccountBalance,
      senderName: customerName,
      debtorName: customerName,
      customerName,
      senderCountry: 'US',
      debtorCountry: 'US',
      currency: 'USD',
      purpose: `Payment to ${paymentDraft.beneficiary.beneficiaryName}`,
      transactionReference: clientReferences.paymentTransactionId,
      reference: clientReferences.paymentTransactionId,
      uetrId: clientReferences.uetr,
      transactionDate: paymentDate,
      paymentDate,
      createdAt: paymentDate,
      transactionStatus: 'PENDING',
      transferStatus: 'PENDING',
      status: 'PENDING',
      ...clientReferences,
    }

    try {
      setIsSubmitting(true)
      const response = await makePayment(payload)
      const paymentResult = normalizePaymentResult(response, paymentDraft, clientReferences)

      writeStoredJson(PAYMENT_RESULT_STORAGE_KEY, paymentResult)
      sessionStorage.removeItem(PAYMENT_DRAFT_STORAGE_KEY)

      navigate('/payment/success', {
        replace: true,
        state: {
          paymentDraft,
          paymentResult,
        },
      })
    } catch (error) {
      hasSubmittedRef.current = false
      setErrorMessage(error.message || 'Unable to submit payment. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!beneficiary) {
    return <MissingBeneficiary navigate={navigate} />
  }

  if (step === paymentSteps.confirmation) {
    return (
      <div className="dashboard-main payment-page">
        <section className="beneficiary-hero-card payment-hero-card">
          <div>
            <span className="beneficiary-kicker">
              <i className="bi bi-send-check" aria-hidden="true"></i>
              Payment Confirmation
            </span>
            <h1>Review Payment</h1>
            <p>Confirm the details before sending this request for approval.</p>
          </div>
          <span className="beneficiary-hero-icon">
            <i className="bi bi-clipboard-check" aria-hidden="true"></i>
          </span>
        </section>

        <section className="payment-dashboard-card">
          {errorMessage && (
            <div className="alert alert-danger beneficiary-alert payment-alert" role="alert">
              <i className="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="payment-card-grid">
            <section className="payment-info-card">
              <div className="section-heading">
                <div>
                  <h2>Beneficiary Information</h2>
                  <p>Approved beneficiary details.</p>
                </div>
              </div>
              <BeneficiaryFields beneficiary={beneficiary} />
            </section>

            <section className="payment-info-card payment-entry-card">
              <div className="section-heading">
                <div>
                  <h2>Payment Information</h2>
                  <p>Read-only transfer summary.</p>
                </div>
              </div>
              <div className="form-grid">
                <ReadOnlyField label="Amount" value={currencyFormatter.format(Number(amount || 0))} />
              </div>

              <div className="payment-subsection-heading">
                <h2>Source Account Information</h2>
              </div>
              <SourceAccountFields sourceAccount={selectedAccount} />

              <div className="form-actions payment-submit-row">
                <button
                  className="profile-action-button secondary-action"
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => navigate('/payment', { state: { paymentDraft } })}
                >
                  <i className="bi bi-arrow-left" aria-hidden="true"></i>
                  Back
                </button>
                <button
                  className="profile-action-button primary-action"
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirmPayment}
                >
                  {isSubmitting ? (
                    <LoadingSpinner label="Submitting" size="sm" variant="button" />
                  ) : (
                    <>
                      <i className="bi bi-check2-circle" aria-hidden="true"></i>
                      Confirm Payment
                    </>
                  )}
                </button>
              </div>
            </section>
          </div>
        </section>
      </div>
    )
  }

  if (step === paymentSteps.success && successResult) {
    return (
      <div className="dashboard-main payment-page">
        <section className="beneficiary-hero-card payment-hero-card">
          <div>
            <span className="beneficiary-kicker">
              <i className="bi bi-check-circle" aria-hidden="true"></i>
              Payment Submitted
            </span>
            <h1>Request Created</h1>
            <p>Your payment request is pending employee review.</p>
          </div>
          <span className="beneficiary-hero-icon">
            <i className="bi bi-receipt" aria-hidden="true"></i>
          </span>
        </section>

        <section className="payment-dashboard-card">
          <div className="alert alert-success beneficiary-alert payment-alert" role="alert">
            <i className="bi bi-check-circle-fill" aria-hidden="true"></i>
            <span>Payment request submitted. Status: {successResult.transactionStatus}.</span>
          </div>

          <div className="payment-success-grid">
            <section className="payment-info-card">
              <div className="section-heading">
                <div>
                  <h2>Status Information</h2>
                  <p>Current approval state.</p>
                </div>
              </div>
              <div className="form-grid">
                <ReadOnlyField label="Status" value={successResult.transactionStatus} />
              </div>
            </section>

            <section className="payment-info-card">
              <div className="section-heading">
                <div>
                  <h2>Reference Information</h2>
                  <p>Keep these identifiers for tracking.</p>
                </div>
              </div>
              <div className="form-grid">
                <ReadOnlyField label="Transaction ID" value={successResult.transactionId} />
                <ReadOnlyField label="Transfer ID" value={successResult.transferId} />
                <ReadOnlyField label="Payment Transaction ID" value={successResult.paymentTransactionId} />
                <ReadOnlyField label="Bank Transaction ID" value={successResult.bankTransactionId} />
                <ReadOnlyField label="UETR" value={successResult.uetr} />
              </div>
            </section>

            <section className="payment-info-card">
              <div className="section-heading">
                <div>
                  <h2>Beneficiary Information</h2>
                  <p>Receiver details.</p>
                </div>
              </div>
              <BeneficiaryFields beneficiary={successResult.beneficiary} />
            </section>

            <section className="payment-info-card payment-entry-card">
              <div className="section-heading">
                <div>
                  <h2>Payment Information</h2>
                  <p>Submitted transfer details.</p>
                </div>
              </div>
              <div className="form-grid">
                <ReadOnlyField label="Amount" value={currencyFormatter.format(Number(successResult.amount || 0))} />
              </div>

              <div className="payment-subsection-heading">
                <h2>Source Account Information</h2>
              </div>
              <SourceAccountFields sourceAccount={successResult.sourceAccount} />
            </section>
          </div>
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

      <form className="payment-dashboard-card" noValidate onSubmit={handleDetailsSubmit}>
        {(errorMessage || accountsError) && (
          <div className="alert alert-danger beneficiary-alert payment-alert" role="alert">
            <i className="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
            <span>{errorMessage || accountsError}</span>
          </div>
        )}

        <div className="payment-card-grid">
          <section className="payment-info-card">
            <div className="section-heading">
              <div>
                <h2>Beneficiary Information</h2>
                <p>These approved beneficiary details cannot be edited.</p>
              </div>
            </div>
            <BeneficiaryFields beneficiary={beneficiary} />
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
                    Amount is required.
                  </div>
                </div>
              </label>
            </div>

            <div className="payment-subsection-heading">
              <h2>Source Account</h2>
              {isLoadingAccounts && (
                <LoadingSpinner label="Loading accounts" size="sm" variant="inline" />
              )}
            </div>
            <label className="bank-field payment-source-field">
              <span>Debit Account</span>
              <select
                className={`filter-select ${shouldShowSourceError ? 'is-invalid' : ''}`}
                value={selectedAccountId}
                disabled={isLoadingAccounts || accounts.length === 0}
                onBlur={() => setIsSourceTouched(true)}
                onChange={(event) => {
                  setSelectedAccountId(event.target.value)
                  setIsSourceTouched(true)
                  setErrorMessage('')
                }}
                required
                aria-describedby="sourceAccountFeedback"
              >
                <option value="">Select source account</option>
                {accounts.map((account) => (
                  <option key={getAccountNumber(account)} value={getAccountNumber(account)}>
                    {formatAccountOption(account)}
                  </option>
                ))}
              </select>
              <div id="sourceAccountFeedback" className="invalid-feedback payment-source-feedback">
                Select a source account.
              </div>
            </label>

            {selectedAccount && (
              <div className="payment-account-summary">
                <span>{getAccountType(selectedAccount)}</span>
                <strong>{getAccountNumber(selectedAccount)}</strong>
                <small>Available Balance: {currencyFormatter.format(selectedAccountBalance)}</small>
              </div>
            )}

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
                disabled={!canContinue}
              >
                <i className="bi bi-send-check" aria-hidden="true"></i>
                Make Payment
              </button>
            </div>
          </section>
        </div>
      </form>
    </div>
  )
}

export default Payment
