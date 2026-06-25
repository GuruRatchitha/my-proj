import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  approveEmployeeTransaction,
  fetchEmployeeTransaction,
  fetchEmployeeTransactionXml,
  rejectEmployeeTransaction,
} from '../../api/employeeTransactions'

const detailSections = [
  {
    title: 'Sender Details',
    key: 'sender',
    fields: [
      ['Sender Name', 'name'],
      ['Sender Account Number', 'accountNumber'],
      ['Sender Routing Number', 'routingNumber'],
      ['Sender Bank Name', 'bankName'],
      ['Country', 'country'],
    ],
  },
  {
    title: 'Receiver Details',
    key: 'receiver',
    fields: [
      ['Receiver Name', 'name'],
      ['Receiver Account Number', 'accountNumber'],
      ['Receiver Routing Number', 'routingNumber'],
      ['Receiver Bank Name', 'bankName'],
      ['Country', 'country'],
    ],
  },
]

const getStatusClass = (status = '') => status.toLowerCase().replace(/\s+/g, '-')
const rejectedXmlMessage = 'Transaction rejected. PACS.008 XML was not generated.'

const isFinalStatus = (status = '') => ['APPROVED', 'REJECTED'].includes(status.toUpperCase())
const isRejectedStatus = (status = '') => status.toUpperCase() === 'REJECTED'

function DetailCard({ title, fields, source }) {
  return (
    <article className="employee-review-card">
      <h2>{title}</h2>
      <dl>
        {fields.map(([label, key]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{source?.[key] || '-'}</dd>
          </div>
        ))}
      </dl>
    </article>
  )
}

function TransactionDetails() {
  const { transactionReference = '' } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [transaction, setTransaction] = useState(location.state?.transaction || null)
  const [activeTab, setActiveTab] = useState('xml')
  const [isLoading, setIsLoading] = useState(true)
  const [isXmlLoading, setIsXmlLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [activeAction, setActiveAction] = useState('')
  const [pacs008Content, setPacs008Content] = useState('')
  const [hasRequestedPacs008, setHasRequestedPacs008] = useState(false)

  const transactionId = decodeURIComponent(transactionReference)

  const loadTransaction = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true)
    }
    setErrorMessage('')

    try {
      const nextTransaction = await fetchEmployeeTransaction(transactionId)
      setTransaction(nextTransaction)
      return nextTransaction
    } finally {
      if (showLoading) {
        setIsLoading(false)
      }
    }
  }, [transactionId])

  const loadPacs008Xml = useCallback(async (status = transaction?.status) => {
    if (isRejectedStatus(status)) {
      setPacs008Content(rejectedXmlMessage)
      setHasRequestedPacs008(true)
      return rejectedXmlMessage
    }

    setIsXmlLoading(true)
    setHasRequestedPacs008(true)
    setErrorMessage('')

    try {
      const nextXmlContent = await fetchEmployeeTransactionXml(transactionId)
      setPacs008Content(nextXmlContent || 'PACS.008 XML is not available for this transaction.')
      return nextXmlContent
    } catch (error) {
      setPacs008Content('')
      setErrorMessage(error.message || 'Unable to load PACS.008 XML.')
      return ''
    } finally {
      setIsXmlLoading(false)
    }
  }, [transaction?.status, transactionId])

  useEffect(() => {
    let isMounted = true

    const loadInitialTransaction = async () => {
      try {
        setIsLoading(true)
        setErrorMessage('')
        setPacs008Content('')
        setHasRequestedPacs008(false)

        const nextTransaction = await fetchEmployeeTransaction(transactionId)

        if (isMounted) {
          setTransaction(nextTransaction)
          if (isRejectedStatus(nextTransaction.status)) {
            setPacs008Content(rejectedXmlMessage)
            setHasRequestedPacs008(true)
          }
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.message || 'Unable to load transaction details.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadInitialTransaction()

    return () => {
      isMounted = false
    }
  }, [transactionId])

  useEffect(() => {
    if (activeTab === 'xml' && !hasRequestedPacs008 && !isXmlLoading) {
      loadPacs008Xml()
    }
  }, [activeTab, hasRequestedPacs008, isXmlLoading, loadPacs008Xml])

  const handleReviewAction = async (action) => {
    if (!transaction || activeAction || isFinalStatus(transaction.status)) {
      return
    }

    try {
      setActiveAction(action)
      setActionMessage('')
      setErrorMessage('')

      if (action === 'approve') {
        await approveEmployeeTransaction(transaction.id || transaction.reference)
        setHasRequestedPacs008(false)
        setPacs008Content('')
        setTransaction((currentTransaction) => ({
          ...currentTransaction,
          status: 'Approved',
        }))
        setActionMessage('Transaction approved successfully.')
      } else {
        await rejectEmployeeTransaction(transaction.id || transaction.reference)
        setTransaction((currentTransaction) => ({
          ...currentTransaction,
          status: 'Rejected',
        }))
        setPacs008Content(rejectedXmlMessage)
        setHasRequestedPacs008(true)
        setActionMessage('Transaction rejected successfully.')
      }

      const refreshedTransaction = await loadTransaction(false)

      if (action === 'approve') {
        setActiveTab('xml')
        await loadPacs008Xml(refreshedTransaction.status)
      } else {
        setActiveTab('xml')
        setPacs008Content(rejectedXmlMessage)
      }
    } catch (error) {
      setErrorMessage(error.message || 'Unable to update transaction.')
    } finally {
      setActiveAction('')
    }
  }

  if (isLoading) {
    return (
      <div className="dashboard-main">
        <p className="dashboard-state">Loading transaction details...</p>
      </div>
    )
  }

  if (!transaction) {
    return (
      <div className="dashboard-main">
        <section className="title-block">
          <h1>Transaction Review</h1>
          <p>Open a transaction from the queue to review payment details.</p>
        </section>
        {errorMessage && <p className="dashboard-state error">{errorMessage}</p>}
        <button
          className="profile-action-button secondary-action"
          type="button"
          onClick={() => navigate('/employee/transaction-queue')}
        >
          Back to Queue
        </button>
      </div>
    )
  }

  const paymentFields = [
    ['Transaction Reference', transaction.reference],
    ['Amount', transaction.amount],
    ['Payment Date', transaction.paymentDate],
    ['Status', transaction.status],
    ['Channel', transaction.channel],
  ]
  const isActionInProgress = Boolean(activeAction)
  const areReviewActionsDisabled = isActionInProgress || isFinalStatus(transaction.status)

  return (
    <div className="dashboard-main employee-review-page">
      <section className="employee-review-hero">
        <div>
          <button
            className="employee-back-link"
            type="button"
            onClick={() => navigate('/employee/transaction-queue')}
          >
            <i className="bi bi-arrow-left" aria-hidden="true"></i>
            Queue
          </button>
          <span className="account-id">{transaction.reference}</span>
          <h1>{transaction.amount}</h1>
          <p>Fedwire payment approval review</p>
        </div>
        <div className="employee-review-actions" aria-label="Transaction actions">
          <span className={`transaction-status ${getStatusClass(transaction.status)}`}>
            {transaction.status}
          </span>
          <button
            className="profile-action-button secondary-action employee-reject-action"
            type="button"
            disabled={areReviewActionsDisabled}
            onClick={() => handleReviewAction('reject')}
          >
            {activeAction === 'reject' ? 'Rejecting...' : 'Reject'}
          </button>
          <button
            className="profile-action-button primary-action"
            type="button"
            disabled={areReviewActionsDisabled}
            onClick={() => handleReviewAction('approve')}
          >
            {activeAction === 'approve' ? 'Approving...' : 'Approve'}
          </button>
        </div>
      </section>

      {actionMessage && (
        <div className="alert alert-success beneficiary-alert" role="alert">
          <i className="bi bi-check-circle-fill" aria-hidden="true"></i>
          <span>{actionMessage}</span>
        </div>
      )}
      {errorMessage && <p className="dashboard-state error">{errorMessage}</p>}

      <section className="employee-review-grid" aria-label="Transaction summary">
        {detailSections.map((section) => (
          <DetailCard
            key={section.title}
            title={section.title}
            fields={section.fields}
            source={transaction[section.key]}
          />
        ))}

        <article className="employee-review-card">
          <h2>Payment Details</h2>
          <dl>
            {paymentFields.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>
                  {label === 'Status' ? (
                    <span className={`transaction-status ${getStatusClass(transaction.status)}`}>
                      {transaction.status}
                    </span>
                  ) : (
                    value || '-'
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </article>
      </section>

      <section className="employee-review-tabs" aria-label="Transaction review tabs">
        <div className="employee-tab-list" role="tablist">
          <button
            className={activeTab === 'xml' ? 'active' : ''}
            type="button"
            role="tab"
            aria-selected={activeTab === 'xml'}
            onClick={() => {
              setActiveTab('xml')
              if (!hasRequestedPacs008) {
                loadPacs008Xml()
              }
            }}
          >
            PACS.008
          </button>
          <button
            className={activeTab === 'pacs002' ? 'active' : ''}
            type="button"
            role="tab"
            aria-selected={activeTab === 'pacs002'}
            onClick={() => setActiveTab('pacs002')}
          >
            PACS.002
          </button>
        </div>

        {activeTab === 'xml' && (
          <div className="employee-xml-panel" role="tabpanel">
            {isXmlLoading && (
              <div className="employee-xml-loading" role="status" aria-live="polite">
                Loading PACS.008 XML...
              </div>
            )}
            <pre>
              <code>{pacs008Content || transaction.pacs008Xml || 'Select an approved transaction to view PACS.008 XML.'}</code>
            </pre>
          </div>
        )}

        {activeTab === 'pacs002' && <div className="employee-pacs002-panel" role="tabpanel"></div>}
      </section>
    </div>
  )
}

export default TransactionDetails
