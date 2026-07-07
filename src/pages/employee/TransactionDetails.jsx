import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  acceptEmployeeTransaction,
  fetchEmployeeTransactionAdmi002,
  fetchEmployeeTransaction,
  fetchEmployeeTransactionPacs002,
  fetchEmployeeTransactionProcessingPipeline,
  fetchEmployeeTransactionXml,
  rejectEmployeeTransaction,
  revertEmployeeTransaction,
  sendEmployeeTransactionToPayapt,
} from '../../api/employeeTransactions'
import LoadingSpinner from '../../components/LoadingSpinner'

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

const getStatusClass = (status = '') => status.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const getHttpStatusText = (status) => status || 'unavailable'
const pipelineRefreshIntervalMs = 5000
const hasXmlContent = (value) => Boolean(value && value.toString().trim())

const isFinalStatus = (status = '') =>
  [
    'APPROVED',
    'REJECTED',
    'PROCESSING',
    'COMPLETED',
    'COMPLETED (ADMI.002)',
    'FAILED',
    'RETURN',
    'REVERTED',
  ].includes(status.toUpperCase())

const normalizeLifecycleValue = (value = '') =>
  value.toString().trim().toUpperCase().replace(/[\s_-]+/g, '_')

const getBackendLifecycleValue = (transaction, pipeline, ...keys) =>
  getPipelineValue(transaction, ...keys) || getPipelineValue(pipeline, ...keys)

const getPayaptStatus = (transaction, pipeline) =>
  normalizeLifecycleValue(getBackendLifecycleValue(
    transaction,
    pipeline,
    'payaptStatus',
    'payAptStatus',
    'pacs002Status',
    'pacs002ResponseStatus',
    'paymentStatus',
  ))

const getBackendRejectionReason = (transaction, pipeline) =>
  getBackendLifecycleValue(
    transaction,
    pipeline,
    'rejectionReason',
    'rejectReason',
    'returnReason',
    'reason',
    'statusReason',
    'errorReason',
  )

const getPaymentStatus = (transaction, pipeline, hasAdmi002) => {
  const payaptStatus = getPayaptStatus(transaction, pipeline)
  const backendStatus = getBackendLifecycleValue(
    transaction,
    pipeline,
    'displayStatus',
    'paymentDisplayStatus',
    'status',
    'currentStatus',
    'transactionStatus',
  )
  const normalizedStatus = normalizeLifecycleValue(backendStatus)

  if (['REVERTED', 'RETURNED'].includes(normalizedStatus)) {
    return 'Reverted'
  }

  if (payaptStatus === 'RJCT') {
    return 'Return'
  }

  if (hasAdmi002) {
    return normalizedStatus === 'COMPLETED_ADMI_002' ? backendStatus : 'Completed (ADMI.002)'
  }

  if (payaptStatus === 'ACSC') {
    return 'Completed'
  }

  return backendStatus || 'Pending'
}

const pipelineStepDefinitions = [
  {
    key: 'formatValidation',
    aliases: ['formatValidation', 'format_validation', 'format-validation', 'validation'],
    name: 'Format Validation',
    description: 'PACS.008 XML successfully generated.',
  },
  {
    key: 'pacs008Sent',
    aliases: ['pacs008Sent', 'pacs008SentToPayApt', 'pacs008Submission', 'submission'],
    name: 'PACS.008 Sent to PayApt',
    description: 'Fedwire payment submitted to PayApt.',
  },
  {
    key: 'responseReceived',
    aliases: ['responseReceived', 'response_received', 'response-received', 'payaptResponse', 'response'],
    name: 'Response Received',
  },
  {
    key: 'transactionDecision',
    aliases: ['transactionDecision', 'transaction_decision', 'transaction-decision', 'decision'],
    name: 'Transaction Decision',
  },
  {
    key: 'settlement',
    aliases: ['settlement'],
    name: 'Settlement',
  },
  {
    key: 'processCompleted',
    aliases: ['processCompleted', 'process_completed', 'process-completed', 'completed'],
    name: 'Process Completed',
  },
]

const pipelineDateFormatter = new Intl.DateTimeFormat('en-US', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const pipelineTimeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

const normalizePipelineKey = (value = '') => value.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '')
const normalizePipelineStatus = (status = '') =>
  status.toString().trim().toLowerCase().replace(/[\s_-]+/g, '-')

const getPipelineValue = (source, ...keys) => {
  if (!source || typeof source !== 'object') {
    return ''
  }

  return keys.map((key) => source[key]).find((value) => value || value === 0) ?? ''
}

const formatPipelineTimestamp = (value) => {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return {
    date: pipelineDateFormatter.format(date),
    time: pipelineTimeFormatter.format(date),
  }
}

const getPipelineStepPayload = (pipeline, definition) => {
  if (!pipeline || typeof pipeline !== 'object') {
    return null
  }

  const normalizedAliases = definition.aliases.map(normalizePipelineKey)
  const stepCollection = Array.isArray(pipeline)
    ? pipeline
    : [pipeline.steps, pipeline.pipelineSteps, pipeline.stages, pipeline.data]
      .find(Array.isArray) || []

  const matchingStep = stepCollection.find((step) => {
    const stepKey = normalizePipelineKey(getPipelineValue(
      step,
      'key',
      'code',
      'id',
      'name',
      'step',
      'stepName',
      'stepCode',
      'stepType',
      'stage',
    ))
    return normalizedAliases.includes(stepKey)
  })

  if (matchingStep) {
    return typeof matchingStep === 'object' ? matchingStep : { status: matchingStep }
  }

  const directKey = Object.keys(pipeline).find((key) => normalizedAliases.includes(normalizePipelineKey(key)))
  if (directKey) {
    const directValue = pipeline[directKey]
    return typeof directValue === 'object' ? directValue : { status: directValue }
  }

  const getFlatValue = (...suffixes) => {
    const matchingKey = Object.keys(pipeline).find((key) => {
      const normalizedKey = normalizePipelineKey(key)
      return normalizedAliases.some((alias) => suffixes.some(
        (suffix) => normalizedKey === `${alias}${normalizePipelineKey(suffix)}`,
      ))
    })
    return matchingKey ? pipeline[matchingKey] : ''
  }
  const status = getFlatValue('Status', 'State')

  if (!status) {
    return null
  }

  return {
    status,
    timestamp: getFlatValue(
      'Timestamp',
      'CompletedAt',
      'UpdatedAt',
      'SubmittedAt',
      'SentAt',
      'ReceivedAt',
    ),
    message: getFlatValue('Message', 'Description', 'Detail', 'StatusMessage'),
    reason: getFlatValue(
      'Reason',
      'RejectReason',
      'RejectionReason',
      'ReturnReason',
      'StatusReason',
      'ErrorReason',
      'FailureReason',
      'ValidationReason',
      'ValidationFailureReason',
    ),
    reasonTitle: getFlatValue('ReasonTitle', 'ReasonLabel'),
    responseType: getFlatValue('ResponseType', 'MessageType', 'Type'),
    decision: getFlatValue('Decision', 'TransactionDecision'),
  }
}

const getResponseReceivedName = (step, fallbackName) => {
  const responseType = getPipelineValue(step, 'responseType', 'messageType', 'type')
    .toString()
    .toUpperCase()

  if (responseType.includes('ADMI')) {
    return 'ADMI.002 Received'
  }

  if (responseType.includes('PACS')) {
    return 'PACS.002 Received'
  }

  return getPipelineValue(step, 'displayName', 'label', 'name', 'stepName') || fallbackName
}

const getDecisionMessage = (decision) => {
  const normalizedDecision = decision.toString().trim().toUpperCase()

  if (normalizedDecision === 'ACCEPTED' || normalizedDecision === 'ACSC') {
    return 'Transaction Accepted (ACSC)'
  }

  if (normalizedDecision === 'REJECTED' || normalizedDecision === 'RJCT') {
    return 'Transaction Rejected (RJCT)'
  }

  return ''
}

const getSettlementMessage = (decision) => {
  const normalizedDecision = decision.toString().trim().toUpperCase()

  if (normalizedDecision === 'ACCEPTED' || normalizedDecision === 'ACSC') {
    return 'Amount credited to beneficiary.'
  }

  if (normalizedDecision === 'REJECTED' || normalizedDecision === 'RJCT') {
    return 'Amount returned to sender.'
  }

  return ''
}

const normalizePipelineSteps = (pipeline) => {
  const decisionValue = getPipelineValue(pipeline, 'transactionDecision', 'decision', 'decisionStatus')

  return pipelineStepDefinitions.map((definition) => {
    const step = getPipelineStepPayload(pipeline, definition)
    const status = getPipelineValue(step, 'status', 'currentStatus', 'state') || 'Pending'
    const timestamp = getPipelineValue(
      step,
      'timestamp',
      'completedAt',
      'updatedAt',
      'createdAt',
      'submittedAt',
      'sentAt',
      'receivedAt',
    )
    const message = getPipelineValue(step, 'message', 'description', 'detail', 'statusMessage')
    const reason = getPipelineValue(
      step,
      'reason',
      'rejectReason',
      'rejectionReason',
      'returnReason',
      'statusReason',
      'errorReason',
      'failureReason',
      'validationReason',
      'validationFailureReason',
      'reasonDescription',
    )
    const stepDecision = getPipelineValue(step, 'decision', 'transactionDecision') || decisionValue
    const displayName = definition.key === 'responseReceived'
      ? getResponseReceivedName(step, definition.name)
      : getPipelineValue(step, 'displayName', 'label', 'name', 'stepName') || definition.name

    return {
      key: definition.key,
      name: displayName,
      description: definition.description,
      status,
      timestamp,
      message:
        message ||
        (definition.key === 'transactionDecision' ? getDecisionMessage(stepDecision) : '') ||
        (definition.key === 'settlement' ? getSettlementMessage(stepDecision) : ''),
      reasonTitle: getPipelineValue(step, 'reasonTitle', 'reasonLabel') || (reason ? 'Reason' : ''),
      reason,
      decision: stepDecision,
      responseType: getPipelineValue(step, 'responseType', 'messageType', 'type'),
    }
  })
}

const getPipelineVisualState = (step) => {
  if (step.isInactive) {
    return 'inactive'
  }

  const status = normalizePipelineStatus(step.status)

  if (['failed', 'rejected', 'rjct'].includes(status)) {
    return 'failed'
  }

  if (['running', 'sending', 'processing', 'in-progress'].includes(status)) {
    return 'running'
  }

  if (
    step.visualState === 'warning' ||
    (step.key === 'responseReceived' && step.name.toUpperCase().includes('ADMI'))
  ) {
    return 'warning'
  }

  if (['completed', 'sent', 'received', 'accepted', 'acsc', 'settled'].includes(status)) {
    return 'completed'
  }

  return 'pending'
}

const isPipelineAwaitingApproval = (transactionStatus = '') =>
  ['', 'PENDING', 'HOLD', 'ON_HOLD'].includes(
    transactionStatus.toString().trim().toUpperCase().replace(/\s+/g, '_'),
  )

const getDisplayedPipelineSteps = (steps, transactionStatus, hasAdmi002, lifecycle = {}) => {
  if (isPipelineAwaitingApproval(transactionStatus) || lifecycle.isAwaitingSend) {
    return steps.map((step) => ({
      ...step,
      status: 'Not Started',
      description: '',
      message: '',
      timestamp: '',
    }))
  }

  if (lifecycle.isReverted) {
    return steps.map((step) => ({
      ...step,
      status: ['settlement', 'processCompleted'].includes(step.key) ? 'Completed' : step.status,
      message: step.key === 'settlement'
        ? 'Funds Returned'
        : step.key === 'processCompleted'
          ? 'Process Completed'
          : step.message,
    }))
  }

  if (lifecycle.payaptStatus === 'ACSC') {
    return steps.map((step) => ({
      ...step,
      name: step.key === 'responseReceived' ? 'PACS.002 Received' : step.name,
      status: 'Completed',
    }))
  }

  if (lifecycle.payaptStatus === 'RJCT') {
    return steps.map((step) => ({
      ...step,
      name: step.key === 'responseReceived' ? 'PACS.002 Received' : step.name,
      reasonTitle: ['formatValidation', 'pacs008Sent'].includes(step.key) && lifecycle.pacs008Reason
        ? 'PACS.008 Reason'
        : step.key === 'transactionDecision' && lifecycle.pacs002Reason
          ? 'Reason for Rejection'
          : step.reasonTitle,
      reason: ['formatValidation', 'pacs008Sent'].includes(step.key) && lifecycle.pacs008Reason
        ? lifecycle.pacs008Reason
        : step.key === 'transactionDecision'
          ? lifecycle.pacs002Reason || step.reason
          : step.reason,
    }))
  }

  if (!hasAdmi002) {
    return steps
  }

  return steps.map((step) => {
    if (['formatValidation', 'pacs008Sent'].includes(step.key)) {
      return {
        ...step,
        status: 'Completed',
      }
    }

    if (step.key === 'responseReceived') {
      const admi002Reason = lifecycle.admi002Reason || step.reason

      return {
        ...step,
        name: 'ADMI.002 Received',
        status: 'Completed',
        visualState: 'warning',
        description: '',
        reasonTitle: admi002Reason ? 'Validation Failure' : '',
        reason: admi002Reason,
      }
    }

    if (['transactionDecision', 'settlement', 'processCompleted'].includes(step.key)) {
      return {
        ...step,
        status: 'Not Executed',
        description: '',
        message: '',
        timestamp: '',
        isInactive: true,
      }
    }

    return step
  })
}

const isPipelineComplete = (steps) =>
  getPipelineVisualState(steps.find((step) => step.key === 'processCompleted') || {}) === 'completed'

function ProcessingPipeline({ steps, isLoading, errorMessage }) {
  return (
    <section className="processing-pipeline-card" aria-label="Processing Pipeline">
      <div className="processing-pipeline-header">
        <h2>Processing Pipeline</h2>
        <div className="processing-pipeline-meta">
          <span>{steps.length} Steps</span>
          {isLoading && (
            <span className="processing-pipeline-refresh" role="status">
              <LoadingSpinner label="Refreshing" size="sm" variant="inline" />
            </span>
          )}
        </div>
      </div>

      {errorMessage && <p className="processing-pipeline-error">{errorMessage}</p>}

      <ol className="processing-pipeline-list">
        {steps.map((step, index) => {
          const visualState = getPipelineVisualState(step)
          const timestamp = formatPipelineTimestamp(step.timestamp)
          const isLastStep = index === steps.length - 1

          return (
            <li
              className={`processing-pipeline-step ${visualState}`}
              key={step.key}
            >
              <div className={`processing-pipeline-marker ${visualState}`}>
                {visualState === 'running' ? (
                  <span className="processing-pipeline-spinner" aria-hidden="true" />
                ) : (
                  <i
                    className={`bi ${
                      visualState === 'completed'
                        ? 'bi-check-lg'
                        : visualState === 'failed'
                          ? 'bi-x-lg'
                          : visualState === 'warning'
                            ? 'bi-exclamation-triangle-fill'
                            : 'bi-clock'
                    }`}
                    aria-hidden="true"
                  ></i>
                )}
              </div>
              {!isLastStep && (
                <span
                  className={`processing-pipeline-connector ${
                    visualState === 'running' ? 'running' : ''
                  }`}
                  aria-hidden="true"
                />
              )}
              <div className="processing-pipeline-content">
                <div className="processing-pipeline-title-row">
                  <h3>{step.name}</h3>
                  <span className={`transaction-status ${getStatusClass(step.status)}`}>
                    {step.status || 'Pending'}
                  </span>
                </div>
                {step.description && <p>{step.description}</p>}
                {step.message && <p className="processing-pipeline-message">{step.message}</p>}
                {step.reason && (
                  <div className="processing-pipeline-reason">
                    <strong>{step.reasonTitle}</strong>
                    <span>{step.reason}</span>
                  </div>
                )}
                {timestamp && (
                  <time className="processing-pipeline-time" dateTime={step.timestamp}>
                    <span>{timestamp.date}</span>
                    <span>{timestamp.time}</span>
                  </time>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

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

function CopyableValue({ value, onCopy, isCopied }) {
  return (
    <span className="employee-copyable-value">
      <span>{value || '-'}</span>
      {value && (
        <button
          className="employee-icon-button"
          type="button"
          onClick={() => onCopy(value)}
          aria-label="Copy UETR"
          title="Copy UETR"
        >
          <i className={`bi ${isCopied ? 'bi-check-lg' : 'bi-copy'}`} aria-hidden="true"></i>
        </button>
      )}
    </span>
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
  const [acceptedTransactionId, setAcceptedTransactionId] = useState('')
  const [sentToPayaptTransactionId, setSentToPayaptTransactionId] = useState('')
  const [pacs008Content, setPacs008Content] = useState('')
  const [pacs008Status, setPacs008Status] = useState('idle')
  const [pacs002Content, setPacs002Content] = useState('')
  const [isPacs002Loading, setIsPacs002Loading] = useState(false)
  const [pacs002Status, setPacs002Status] = useState('idle')
  const [pacs002ErrorStatus, setPacs002ErrorStatus] = useState('')
  const [admi002Content, setAdmi002Content] = useState('')
  const [isAdmi002Loading, setIsAdmi002Loading] = useState(false)
  const [admi002Status, setAdmi002Status] = useState('idle')
  const [admi002ErrorMessage, setAdmi002ErrorMessage] = useState('')
  const [processingPipeline, setProcessingPipeline] = useState(null)
  const [isPipelineLoading, setIsPipelineLoading] = useState(false)
  const [pipelineErrorMessage, setPipelineErrorMessage] = useState('')
  const [copiedField, setCopiedField] = useState('')
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  const transactionId = decodeURIComponent(transactionReference)
  const processingPipelineTransactionId = transaction?.id || transactionId

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

  const loadPacs008Xml = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setIsXmlLoading(true)
      setPacs008Status('loading')
    }
    try {
      const nextXmlContent = await fetchEmployeeTransactionXml(transactionId)
      setPacs008Content(nextXmlContent)
      setPacs008Status(nextXmlContent ? 'ready' : 'empty')
      return nextXmlContent
    } catch (error) {
      setPacs008Content('')
      setPacs008Status(error.status === 404 ? 'empty' : 'error')
      return ''
    } finally {
      if (showLoading) {
        setIsXmlLoading(false)
      }
    }
  }, [transactionId])

  const loadPacs002Xml = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setIsPacs002Loading(true)
      setPacs002Status('loading')
    }
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
      if (showLoading) {
        setIsPacs002Loading(false)
      }
    }
  }, [transactionId])

  const loadAdmi002Xml = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setIsAdmi002Loading(true)
      setAdmi002Status('loading')
    }
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
      if (showLoading) {
        setIsAdmi002Loading(false)
      }
    }
  }, [transactionId])

  const loadAvailableXmls = useCallback(async (showLoading = true) => {
    const [pacs008, pacs002, admi002] = await Promise.all([
      loadPacs008Xml(showLoading),
      loadPacs002Xml(showLoading),
      loadAdmi002Xml(showLoading),
    ])

    return { pacs008, pacs002, admi002 }
  }, [loadAdmi002Xml, loadPacs002Xml, loadPacs008Xml])

  const loadProcessingPipeline = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsPipelineLoading(true)
      }

      setPipelineErrorMessage('')
      const nextPipeline = await fetchEmployeeTransactionProcessingPipeline(processingPipelineTransactionId)
      setProcessingPipeline(nextPipeline)
      return nextPipeline
    } catch (error) {
      setPipelineErrorMessage(error.message || 'Unable to load processing pipeline.')
      return null
    } finally {
      if (showLoading) {
        setIsPipelineLoading(false)
      }
    }
  }, [processingPipelineTransactionId])

  useEffect(() => {
    let isMounted = true

    const loadInitialTransaction = async () => {
      try {
        setIsLoading(true)
        setErrorMessage('')
        setPacs008Content('')
        setPacs002Content('')
        setAdmi002Content('')
        setPacs008Status('idle')
        setPacs002Status('idle')
        setPacs002ErrorStatus('')
        setAdmi002Status('idle')
        setAdmi002ErrorMessage('')
        setProcessingPipeline(null)
        setPipelineErrorMessage('')
        setAcceptedTransactionId('')
        setSentToPayaptTransactionId('')

        const nextTransaction = await fetchEmployeeTransaction(transactionId)

        if (isMounted) {
          setTransaction(nextTransaction)
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
    let refreshTimer

    const refreshTransactionDetails = async (showLoading = true) => {
      if (!isMounted) {
        return null
      }

      const [pipelineResult, transactionResult, xmlResult] = await Promise.allSettled([
        loadProcessingPipeline(showLoading),
        loadTransaction(false),
        loadAvailableXmls(showLoading),
      ])
      const nextPipeline = pipelineResult.status === 'fulfilled' ? pipelineResult.value : null
      const nextTransaction = transactionResult.status === 'fulfilled'
        ? transactionResult.value
        : null

      if (!isMounted) {
        return nextPipeline
      }

      const nextSteps = normalizePipelineSteps(nextPipeline)
      const normalizedTransactionStatus = nextTransaction?.status?.toUpperCase() || ''
      const hasAdmi002Response = hasXmlContent(nextTransaction?.admi002Xml) ||
        (xmlResult.status === 'fulfilled' && hasXmlContent(xmlResult.value?.admi002))
      const nextPayaptStatus = getPayaptStatus(nextTransaction, nextPipeline)
      const displayedSteps = getDisplayedPipelineSteps(
        nextSteps,
        normalizedTransactionStatus,
        hasAdmi002Response,
        { payaptStatus: nextPayaptStatus },
      )
      const pipelineHasStarted = nextSteps.some(
        (step) => getPipelineVisualState(step) !== 'pending',
      )
      const pipelineComplete = isPipelineComplete(displayedSteps)
      const shouldContinuePolling = !nextTransaction ||
        normalizedTransactionStatus === 'PENDING' ||
        normalizedTransactionStatus === 'PROCESSING' ||
        (normalizedTransactionStatus === 'APPROVED' && !pipelineComplete && !hasAdmi002Response && nextPayaptStatus !== 'ACSC') ||
        (normalizedTransactionStatus === 'REJECTED' && pipelineHasStarted && !pipelineComplete)

      if (shouldContinuePolling) {
        refreshTimer = window.setTimeout(() => {
          refreshTransactionDetails(false)
        }, pipelineRefreshIntervalMs)
      }

      return nextPipeline
    }

    refreshTransactionDetails()

    return () => {
      isMounted = false
      window.clearTimeout(refreshTimer)
    }
  }, [loadAvailableXmls, loadProcessingPipeline, loadTransaction])

  const pacs008DisplayContent = pacs008Content || transaction?.pacs008Xml || ''
  const pacs002DisplayContent = pacs002Content || transaction?.pacs002Xml || ''
  const admi002DisplayContent = admi002Content || transaction?.admi002Xml || ''
  const isPacs008Available = pacs008Status === 'ready' || hasXmlContent(pacs008DisplayContent)
  const isPacs002Available = pacs002Status === 'ready' || hasXmlContent(pacs002DisplayContent)
  const isAdmi002Available = admi002Status === 'ready' || hasXmlContent(admi002DisplayContent)
  const isPacs002Disabled = isAdmi002Available
  const isAdmi002Disabled = isPacs002Available
  const hasAvailableXml = isPacs008Available || isPacs002Available || isAdmi002Available
  const requestedActiveTab = ['xml', 'pacs002', 'admi002'].includes(activeTab) ? activeTab : 'xml'
  const visibleActiveTab = requestedActiveTab === 'pacs002' && isPacs002Disabled
    ? 'admi002'
    : requestedActiveTab === 'admi002' && isAdmi002Disabled
      ? 'pacs002'
      : requestedActiveTab

  const handleCopyValue = async (value, field = 'uetr') => {
    if (!value) {
      return
    }

    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(field)
      window.setTimeout(() => setCopiedField(''), 1600)
    } catch {
      setCopiedField('')
    }
  }

  const handleReviewAction = async (action, reason = '') => {
    if (!transaction || activeAction) {
      return
    }

    const lifecycleStatus = normalizeLifecycleValue(transaction.status)
    const currentTransactionId = String(transaction.id || transaction.reference)

    if (action === 'accept' && lifecycleStatus !== 'PENDING') {
      return
    }

    if (
      action === 'send' &&
      !['ACCEPTED', 'PAYMENT_ACCEPTED'].includes(lifecycleStatus) &&
      acceptedTransactionId !== currentTransactionId
    ) {
      return
    }

    if (action === 'reject' && isFinalStatus(transaction.status)) {
      return
    }

    try {
      setActiveAction(action)
      setActionMessage('')
      setErrorMessage('')

      if (action === 'accept') {
        await acceptEmployeeTransaction(transaction.id || transaction.reference)
        setAcceptedTransactionId(currentTransactionId)
        setTransaction((currentTransaction) => currentTransaction
          ? { ...currentTransaction, status: 'Accepted' }
          : currentTransaction)
        setActionMessage('Transaction accepted successfully.')
        await loadTransaction(false)
      } else if (action === 'send') {
        await sendEmployeeTransactionToPayapt(transaction.id || transaction.reference)
        setSentToPayaptTransactionId(currentTransactionId)
        setActionMessage('Transaction sent to PayApt successfully.')
        await Promise.allSettled([
          loadTransaction(false),
          loadProcessingPipeline(false),
          loadAvailableXmls(false),
        ])
      } else {
        const trimmedReason = reason.trim()
        await rejectEmployeeTransaction(transaction.id || transaction.reference, trimmedReason)
        setTransaction((currentTransaction) => currentTransaction
          ? {
              ...currentTransaction,
              status: 'Rejected',
              rejectionReason: trimmedReason,
            }
          : currentTransaction)
        setActionMessage('Transaction rejected successfully.')
        await Promise.allSettled([
          loadTransaction(false),
          loadProcessingPipeline(false),
          loadAvailableXmls(false),
        ])
      }
      return true
    } catch (error) {
      setErrorMessage(error.message || 'Unable to update transaction.')
      return false
    } finally {
      setActiveAction('')
    }
  }

  const openRejectDialog = () => {
    setRejectionReason('')
    setErrorMessage('')
    setIsRejectDialogOpen(true)
  }

  const closeRejectDialog = () => {
    if (activeAction === 'reject') {
      return
    }

    setIsRejectDialogOpen(false)
    setRejectionReason('')
  }

  const handleRejectSubmit = async (event) => {
    event.preventDefault()

    if (!rejectionReason.trim()) {
      return
    }

    const wasRejected = await handleReviewAction('reject', rejectionReason)
    if (wasRejected) {
      setIsRejectDialogOpen(false)
      setRejectionReason('')
    }
  }

  const handleRevert = async () => {
    if (!transaction || activeAction || !transaction.canRevert) {
      return
    }

    try {
      setActiveAction('revert')
      setActionMessage('')
      setErrorMessage('')

      await revertEmployeeTransaction(transaction.id || transaction.reference)
      setActionMessage('Transaction reverted successfully.')
      setTransaction((currentTransaction) => currentTransaction
        ? {
            ...currentTransaction,
            status: 'Reverted',
            canRevert: false,
          }
        : currentTransaction)

      await Promise.allSettled([
        loadTransaction(false),
        loadProcessingPipeline(false),
        loadAvailableXmls(false),
      ])
    } catch (error) {
      setErrorMessage(error.message || 'Unable to revert transaction.')
    } finally {
      setActiveAction('')
    }
  }

  if (isLoading) {
    return (
      <div className="dashboard-main">
        <p className="dashboard-state">
          <LoadingSpinner label="Loading transaction details" variant="inline" />
        </p>
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
    ['Payment Date & Time', [transaction.paymentDate, transaction.paymentTime].filter((value) => value && value !== '-')],
    ['UETR', transaction.uetr],
    ['Status', getPaymentStatus(transaction, processingPipeline, isAdmi002Available)],
    ['Channel', transaction.channel],
  ]
  const isActionInProgress = Boolean(activeAction)
  const admi002RejectReason = getAdmi002RejectReason(admi002DisplayContent)
  const xmlRejectReason = admi002RejectReason?.description || ''
  const backendRejectionReason = getBackendRejectionReason(transaction, processingPipeline)
  const pacs008Reason = transaction.pacs008Reason
  const pacs002Reason = transaction.pacs002Reason
  const admi002Reason = transaction.admi002Reason
  const lifecycleRejectionReason = isAdmi002Available
    ? xmlRejectReason || backendRejectionReason
    : backendRejectionReason || xmlRejectReason
  const payaptStatus = getPayaptStatus(transaction, processingPipeline)
  const transactionStatus = getPaymentStatus(transaction, processingPipeline, isAdmi002Available)
  const pacs002PendingMessage = payaptStatus === 'RJCT'
    ? 'PACS.002 has not been received yet.'
    : 'PACS.002 will be available after PayApt responds.'
  const admi002PendingMessage = 'ADMI.002 will be available if validation fails.'
  const isReturnStatus = payaptStatus === 'RJCT'
  const isReverted = normalizeLifecycleValue(transactionStatus) === 'REVERTED'
  const lifecycleStatus = normalizeLifecycleValue(transaction.status)
  const currentTransactionId = String(transaction.id || transaction.reference)
  const wasAcceptedLocally = acceptedTransactionId === currentTransactionId
  const wasSentToPayaptLocally = sentToPayaptTransactionId === currentTransactionId
  const normalizedPipelineSteps = normalizePipelineSteps(processingPipeline)
  const hasPacs008BeenSent = wasSentToPayaptLocally ||
    normalizedPipelineSteps.some((step) => {
      const visualState = getPipelineVisualState(step)
      return step.key === 'pacs008Sent' && ['running', 'completed'].includes(visualState)
    }) ||
    ['PROCESSING', 'COMPLETED', 'FAILED'].includes(lifecycleStatus)
  const isPendingTransaction = lifecycleStatus === 'PENDING'
  const isAcceptedTransaction = ['ACCEPTED', 'PAYMENT_ACCEPTED'].includes(lifecycleStatus)
  const showSendToPayapt = wasAcceptedLocally ||
    (!isPendingTransaction && (isAcceptedTransaction || hasPacs008BeenSent))
  const isRejectDisabled = isActionInProgress || !isPendingTransaction || showSendToPayapt
  const isAcceptDisabled = isActionInProgress || !isPendingTransaction
  const isSendDisabled = isActionInProgress || hasPacs008BeenSent ||
    (!wasAcceptedLocally && !isAcceptedTransaction)
  const isRevertDisabled = isActionInProgress || !transaction.canRevert || isReverted
  const displayedPipelineSteps = getDisplayedPipelineSteps(
    normalizedPipelineSteps,
    transactionStatus,
    isAdmi002Available,
    {
      isReverted,
      isAwaitingSend: showSendToPayapt && !hasPacs008BeenSent,
      payaptStatus,
      rejectionReason: lifecycleRejectionReason,
      pacs008Reason,
      pacs002Reason: pacs002Reason || lifecycleRejectionReason,
      admi002Reason: admi002Reason || lifecycleRejectionReason,
    },
  )
  const pipelineSteps = displayedPipelineSteps.map((step) => {
    if (['formatValidation', 'pacs008Sent'].includes(step.key) && pacs008Reason) {
      return {
        ...step,
        reasonTitle: 'PACS.008 Reason',
        reason: pacs008Reason,
      }
    }

    if (step.key !== 'transactionDecision' || !pacs002Reason) {
      return step
    }

    return {
      ...step,
      reasonTitle: 'Reason for Rejection',
      reason: pacs002Reason,
    }
  })

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
          <span className={`transaction-status ${getStatusClass(transactionStatus)}`}>
            {transactionStatus}
          </span>
          {isReturnStatus ? (
            <button
              className="profile-action-button primary-action employee-revert-action"
              type="button"
              disabled={isRevertDisabled}
              onClick={handleRevert}
            >
              {activeAction === 'revert' ? (
                <LoadingSpinner label="Reverting" size="sm" variant="button" />
              ) : 'Revert'}
            </button>
          ) : (
            <>
              <button
                className="profile-action-button secondary-action employee-reject-action"
                type="button"
                disabled={isRejectDisabled}
                onClick={openRejectDialog}
              >
                {activeAction === 'reject' ? (
                  <LoadingSpinner label="Rejecting" size="sm" variant="button" />
                ) : 'Reject'}
              </button>
              <button
                className="profile-action-button primary-action"
                type="button"
                disabled={showSendToPayapt ? isSendDisabled : isAcceptDisabled}
                onClick={() => handleReviewAction(showSendToPayapt ? 'send' : 'accept')}
              >
                {activeAction === 'accept' ? (
                  <LoadingSpinner label="Accepting" size="sm" variant="button" />
                ) : activeAction === 'send' ? (
                  <LoadingSpinner label="Sending" size="sm" variant="button" />
                ) : showSendToPayapt ? 'Send To PayApt' : 'Accept'}
              </button>
            </>
          )}
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
                    <span className={`transaction-status ${getStatusClass(transactionStatus)}`}>
                      {transactionStatus}
                    </span>
                  ) : label === 'Payment Date & Time' ? (
                    <span className="employee-date-time-value">
                      {(value.length ? value : ['-']).map((line) => (
                        <span key={line}>{line}</span>
                      ))}
                    </span>
                  ) : label === 'UETR' ? (
                    <CopyableValue
                      value={value}
                      isCopied={copiedField === 'uetr'}
                      onCopy={(nextValue) => handleCopyValue(nextValue, 'uetr')}
                    />
                  ) : (
                    value || '-'
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </article>
      </section>

      <section className="employee-review-workspace" aria-label="Transaction processing and messages">
        <ProcessingPipeline
          steps={pipelineSteps}
          isLoading={isPipelineLoading}
          errorMessage={pipelineErrorMessage}
        />

        <section className="employee-review-tabs" aria-label="Transaction review tabs">
          <div className="employee-tab-list" role="tablist">
            <button
              className={visibleActiveTab === 'xml' ? 'active' : ''}
              type="button"
              role="tab"
              aria-selected={visibleActiveTab === 'xml'}
              onClick={() => setActiveTab('xml')}
            >
              PACS.008
            </button>
            <button
              className={visibleActiveTab === 'pacs002' ? 'active' : ''}
              type="button"
              role="tab"
              aria-selected={visibleActiveTab === 'pacs002'}
              disabled={isPacs002Disabled}
              title={isPacs002Disabled ? 'ADMI.002 was generated for this transaction.' : undefined}
              onClick={() => setActiveTab('pacs002')}
            >
              PACS.002
            </button>
            <button
              className={visibleActiveTab === 'admi002' ? 'active' : ''}
              type="button"
              role="tab"
              aria-selected={visibleActiveTab === 'admi002'}
              disabled={isAdmi002Disabled}
              title={isAdmi002Disabled ? 'PACS.002 was generated for this transaction.' : undefined}
              onClick={() => setActiveTab('admi002')}
            >
              ADMI.002
            </button>
          </div>

          {!hasAvailableXml && (
            <div className="employee-xml-state">
              <strong>
                {isXmlLoading || isPacs002Loading || isAdmi002Loading
                  ? 'Loading available XML messages...'
                  : 'No XML messages are available for this transaction.'}
              </strong>
            </div>
          )}

          {visibleActiveTab === 'xml' && isPacs008Available && (
            <div className="employee-xml-panel" role="tabpanel">
              {isXmlLoading && (
                <div className="employee-xml-loading" role="status" aria-live="polite">
                  Loading PACS.008 XML...
                </div>
              )}
              <pre>
                <code>{pacs008DisplayContent}</code>
              </pre>
            </div>
          )}

          {visibleActiveTab === 'pacs002' && isPacs002Available && (
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
              ) : pacs002Status === 'empty' && !hasXmlContent(pacs002DisplayContent) ? (
                <div className="employee-xml-state">
                  <strong>{pacs002PendingMessage}</strong>
                </div>
              ) : (
                <pre>
                  <code>{pacs002DisplayContent}</code>
                </pre>
              )}
            </div>
          )}

          {visibleActiveTab === 'admi002' && isAdmi002Available && (
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
              ) : admi002Status === 'empty' && !hasXmlContent(admi002DisplayContent) ? (
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
                    <code>{admi002DisplayContent}</code>
                  </pre>
                </>
              )}
            </div>
          )}
        </section>
      </section>

      {isRejectDialogOpen && (
        <div className="payment-modal-backdrop" role="presentation">
          <section
            className="payment-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-transaction-modal-title"
          >
            <header className="payment-modal-header">
              <div>
                <h2 id="reject-transaction-modal-title">Reject transaction</h2>
                <p>Provide a reason the customer can review.</p>
              </div>
              <button
                className="modal-close-button"
                type="button"
                aria-label="Close reject transaction dialog"
                disabled={activeAction === 'reject'}
                onClick={closeRejectDialog}
              >
                <i className="bi bi-x-lg" aria-hidden="true"></i>
              </button>
            </header>

            <form className="employee-reject-form" onSubmit={handleRejectSubmit}>
              <label className="bank-field">
                <span>Reason</span>
                <textarea
                  className="form-control"
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                  maxLength={180}
                  placeholder="Enter the reason for rejecting this transaction"
                  autoFocus
                  required
                />
              </label>
              <div className="modal-actions">
                <button
                  className="profile-action-button secondary-action"
                  type="button"
                  disabled={activeAction === 'reject'}
                  onClick={closeRejectDialog}
                >
                  Cancel
                </button>
                <button
                  className="profile-action-button primary-action"
                  type="submit"
                  disabled={!rejectionReason.trim() || activeAction === 'reject'}
                >
                  {activeAction === 'reject' ? (
                    <LoadingSpinner label="Rejecting" size="sm" variant="button" />
                  ) : 'Reject Transaction'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}

export default TransactionDetails
