import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  approveEmployeeTransaction,
  fetchEmployeeTransactionAdmi002,
  fetchEmployeeTransaction,
  fetchEmployeeTransactionPacs002,
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
const pacs002PendingMessage = 'The PACS.002 has not been received yet.'
const admi002PendingMessage = 'No ADMI.002 message has been received for this transaction.'
const getHttpStatusText = (status) => status || 'unavailable'

const isFinalStatus = (status = '') =>
  ['APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'FAILED'].includes(status.toUpperCase())
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

const getXmlElementsByLocalName = (source, tagName) =>
  Array.from(source.getElementsByTagName('*')).filter((element) => element.localName === tagName)

const getAdmi002RejectReason = (xmlContent) => {
  if (!xmlContent || typeof window === 'undefined' || !window.DOMParser) {
    return null
  }

  const xmlDocument = new window.DOMParser().parseFromString(xmlContent, 'application/xml')

  if (xmlDocument.getElementsByTagName('parsererror').length > 0) {
    return null
  }

  const rejectingPartyReason = getXmlElementsByLocalName(xmlDocument, 'RjctgPtyRsn')[0]

  if (!rejectingPartyReason) {
    return null
  }

  const reasonCode = getXmlElementsByLocalName(rejectingPartyReason, 'Cd')[0]?.textContent?.trim() || ''
  const reasonDescription = getXmlElementsByLocalName(rejectingPartyReason, 'RsnDesc')[0]?.textContent?.trim() || ''

  if (!reasonDescription) {
    return null
  }

  return {
    code: reasonCode || '-',
    description: reasonDescription || '-',
  }
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
  const [pacs002Content, setPacs002Content] = useState('')
  const [isPacs002Loading, setIsPacs002Loading] = useState(false)
  const [hasRequestedPacs002, setHasRequestedPacs002] = useState(false)
  const [pacs002Status, setPacs002Status] = useState('idle')
  const [pacs002ErrorStatus, setPacs002ErrorStatus] = useState('')
  const [admi002Content, setAdmi002Content] = useState('')
  const [isAdmi002Loading, setIsAdmi002Loading] = useState(false)
  const [hasRequestedAdmi002, setHasRequestedAdmi002] = useState(false)
  const [admi002Status, setAdmi002Status] = useState('idle')
  const [admi002ErrorMessage, setAdmi002ErrorMessage] = useState('')

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

  const loadPacs002Xml = useCallback(async () => {
    setIsPacs002Loading(true)
    setHasRequestedPacs002(true)
    setPacs002Status('loading')
    setPacs002ErrorStatus('')

    try {
      const nextPacs002Content = await fetchEmployeeTransactionPacs002(transactionId)
      setPacs002Content(nextPacs002Content)
      setPacs002Status(nextPacs002Content ? 'ready' : 'empty')
      return nextPacs002Content
    } catch (error) {
      setPacs002Content('')
      if (error.status === 404) {
        setPacs002Status('empty')
        return ''
      }

      setPacs002ErrorStatus(getHttpStatusText(error.status))
      setPacs002Status('error')
      return ''
    } finally {
      setIsPacs002Loading(false)
    }
  }, [transactionId])

  const loadAdmi002Xml = useCallback(async () => {
    if (admi002Status === 'ready' && admi002Content) {
      return admi002Content
    }

    setIsAdmi002Loading(true)
    setHasRequestedAdmi002(true)
    setAdmi002Status('loading')
    setAdmi002ErrorMessage('')

    try {
      const nextAdmi002Content = await fetchEmployeeTransactionAdmi002(transactionId)
      setAdmi002Content(nextAdmi002Content)
      setAdmi002Status(nextAdmi002Content ? 'ready' : 'empty')
      return nextAdmi002Content
    } catch (error) {
      setAdmi002Content('')

      if (error.status === 404) {
        setAdmi002Status('empty')
        return ''
      }

      setAdmi002ErrorMessage(error.message || 'Unable to load ADMI.002 XML.')
      setAdmi002Status('error')
      return ''
    } finally {
      setIsAdmi002Loading(false)
    }
  }, [admi002Content, admi002Status, transactionId])

  useEffect(() => {
    let isMounted = true

    const loadInitialTransaction = async () => {
      try {
        setIsLoading(true)
        setErrorMessage('')
        setPacs008Content('')
        setPacs002Content('')
        setAdmi002Content('')
        setHasRequestedPacs008(false)
        setHasRequestedPacs002(false)
        setHasRequestedAdmi002(false)
        setPacs002Status('idle')
        setPacs002ErrorStatus('')
        setAdmi002Status('idle')
        setAdmi002ErrorMessage('')

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
    let isMounted = true

    const loadXmlForActiveTab = async () => {
      await Promise.resolve()

      if (isMounted) {
        await loadPacs008Xml()
      }
    }

    if (activeTab === 'xml' && transaction && !hasRequestedPacs008 && !isXmlLoading) {
      loadXmlForActiveTab()
    }

    return () => {
      isMounted = false
    }
  }, [activeTab, hasRequestedPacs008, isXmlLoading, loadPacs008Xml, transaction])

  useEffect(() => {
    if (activeTab === 'pacs002' && !hasRequestedPacs002 && !isPacs002Loading) {
      const loadTimer = window.setTimeout(() => {
        loadPacs002Xml()
      }, 0)

      return () => window.clearTimeout(loadTimer)
    }
  }, [activeTab, hasRequestedPacs002, isPacs002Loading, loadPacs002Xml])

  useEffect(() => {
    if (activeTab === 'admi002' && !hasRequestedAdmi002 && !isAdmi002Loading) {
      const loadTimer = window.setTimeout(() => {
        loadAdmi002Xml()
      }, 0)

      return () => window.clearTimeout(loadTimer)
    }
  }, [activeTab, hasRequestedAdmi002, isAdmi002Loading, loadAdmi002Xml])

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
        setHasRequestedPacs002(false)
        setHasRequestedAdmi002(false)
        setPacs008Content('')
        setPacs002Content('')
        setAdmi002Content('')
        setPacs002Status('idle')
        setPacs002ErrorStatus('')
        setAdmi002Status('idle')
        setAdmi002ErrorMessage('')
        setTransaction((currentTransaction) => ({
          ...currentTransaction,
          status: 'Processing',
        }))
        setActionMessage('Transaction approved successfully.')
      } else {
        await rejectEmployeeTransaction(transaction.id || transaction.reference)
        setHasRequestedPacs002(false)
        setHasRequestedAdmi002(false)
        setPacs002Content('')
        setAdmi002Content('')
        setPacs002Status('idle')
        setPacs002ErrorStatus('')
        setAdmi002Status('idle')
        setAdmi002ErrorMessage('')
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
  const admi002RejectReason = getAdmi002RejectReason(admi002Content)

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
            onClick={() => {
              setActiveTab('pacs002')
            }}
          >
            PACS.002
          </button>
          <button
            className={activeTab === 'admi002' ? 'active' : ''}
            type="button"
            role="tab"
            aria-selected={activeTab === 'admi002'}
            aria-busy={isAdmi002Loading}
            onClick={() => {
              setActiveTab('admi002')
            }}
          >
            ADMI.002
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

        {activeTab === 'pacs002' && (
          <div className="employee-xml-panel" role="tabpanel">
            {isPacs002Loading && (
              <div className="employee-xml-loading" role="status" aria-live="polite">
                Loading PACS.002 XML...
              </div>
            )}
            {pacs002Status === 'error' ? (
              <div className="employee-xml-state error" role="alert">
                <strong>Unable to load PACS.002 XML.</strong>
                <span>HTTP status: {pacs002ErrorStatus}</span>
                <button
                  className="profile-action-button secondary-action"
                  type="button"
                  onClick={loadPacs002Xml}
                >
                  Retry
                </button>
              </div>
            ) : pacs002Status === 'empty' ? (
              <div className="employee-xml-state">
                <strong>{pacs002PendingMessage}</strong>
              </div>
            ) : (
              <pre>
                <code>{pacs002Content}</code>
              </pre>
            )}
          </div>
        )}

        {activeTab === 'admi002' && (
          <div className="employee-xml-panel" role="tabpanel">
            {isAdmi002Loading && (
              <div className="employee-xml-loading" role="status" aria-live="polite">
                Loading ADMI.002 XML...
              </div>
            )}
            {admi002Status === 'error' ? (
              <div className="employee-xml-state error" role="alert">
                <strong>Unable to load ADMI.002 XML.</strong>
                <span>{admi002ErrorMessage}</span>
                <button
                  className="profile-action-button secondary-action"
                  type="button"
                  onClick={loadAdmi002Xml}
                >
                  Retry
                </button>
              </div>
            ) : admi002Status === 'empty' ? (
              <div className="employee-xml-state">
                <strong>{admi002PendingMessage}</strong>
              </div>
            ) : (
              <>
                {admi002RejectReason && (
                  <div className="employee-xml-summary">
                    <dl>
                      <div>
                        <dt>Reject Code:</dt>
                        <dd>{admi002RejectReason.code}</dd>
                      </div>
                      <div>
                        <dt>Reject Description:</dt>
                        <dd>{admi002RejectReason.description}</dd>
                      </div>
                    </dl>
                  </div>
                )}
                <pre>
                  <code>{admi002Content}</code>
                </pre>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

export default TransactionDetails
