import { useEffect, useState } from 'react'
import {
  approveBeneficiary,
  fetchPendingBeneficiaries,
  rejectBeneficiary,
} from '../../api/beneficiaries'

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const formatSubmittedDate = (createdDate) => {
  if (!createdDate) {
    return '-'
  }

  const date = new Date(createdDate)
  return Number.isNaN(date.getTime()) ? '-' : dateTimeFormatter.format(date)
}

const normalizeQueueStatus = (status) => {
  const normalizedStatus = (status || '').toString().trim().toUpperCase()

  if (normalizedStatus === 'ACTIVE') {
    return 'Approved'
  }

  if (normalizedStatus === 'REJECTED') {
    return 'Rejected'
  }

  return 'Pending'
}

const normalizeBeneficiaryRequest = (beneficiary, index = 0) => {
  const status = normalizeQueueStatus(beneficiary.status)

  return {
    id: `${beneficiary.userId || 'USER'}-${beneficiary.accountNumber || index}-${beneficiary.routingNumber || index}`,
    userId: beneficiary.userId || '',
    customerName: beneficiary.userName || beneficiary.customerName || `Customer ${beneficiary.userId || ''}`.trim(),
    beneficiaryName: beneficiary.beneficiaryName || '',
    townName: beneficiary.townName || '',
    countryCode: beneficiary.countryCode || 'US',
    accountNumber: beneficiary.accountNumber || '',
    routingNumber: beneficiary.routingNumber || '',
    submittedAt: formatSubmittedDate(beneficiary.createdDate),
    status,
  }
}

function BeneficiaryQueue() {
  const [beneficiaryRequests, setBeneficiaryRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [queueError, setQueueError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [activeRequestId, setActiveRequestId] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadPendingBeneficiaries = async () => {
      try {
        setIsLoading(true)
        setQueueError('')

        const response = await fetchPendingBeneficiaries()
        const pendingBeneficiaries = Array.isArray(response) ? response : []

        if (isMounted) {
          setBeneficiaryRequests(pendingBeneficiaries.map(normalizeBeneficiaryRequest))
        }
      } catch (error) {
        if (isMounted) {
          setBeneficiaryRequests([])
          setQueueError(error.message || 'Unable to load beneficiary queue.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadPendingBeneficiaries()

    return () => {
      isMounted = false
    }
  }, [])

  const updateRequestFromResponse = (request, response) => {
    const updatedBeneficiary = normalizeBeneficiaryRequest(response?.beneficiary || request)

    setBeneficiaryRequests((currentRequests) =>
      currentRequests.map((currentRequest) =>
        currentRequest.id === request.id
          ? {
            ...currentRequest,
            ...updatedBeneficiary,
            id: currentRequest.id,
          }
          : currentRequest,
      ),
    )
    setActionMessage(response?.message || 'Beneficiary updated successfully')
  }

  const handleReviewAction = async (request, action) => {
    try {
      setActiveRequestId(request.id)
      setActionMessage('')
      setQueueError('')

      const payload = {
        userId: request.userId,
        accountNumber: request.accountNumber,
        routingNumber: request.routingNumber,
      }
      const response = action === 'approve'
        ? await approveBeneficiary(payload)
        : await rejectBeneficiary(payload)

      updateRequestFromResponse(request, response)
    } catch (error) {
      setQueueError(error.message || 'Unable to update beneficiary request.')
    } finally {
      setActiveRequestId('')
    }
  }

  return (
    <div className="dashboard-main">
      <section className="title-block">
        <h1>Beneficiary queue</h1>
        <p>Review and approve new payees so payments can flow.</p>
      </section>

      {actionMessage && (
        <div className="alert alert-success beneficiary-alert" role="alert">
          <i className="bi bi-check-circle-fill" aria-hidden="true"></i>
          <span>{actionMessage}</span>
        </div>
      )}
      {queueError && <p className="dashboard-state error">{queueError}</p>}

      <section className="employee-queue-list" aria-label="Beneficiary approval queue">
        {isLoading && (
          <div className="transaction-list">
            <div className="section-loader" role="status" aria-live="polite">
              <span className="section-loader-spinner" aria-hidden="true"></span>
              <span>Loading beneficiary queue...</span>
            </div>
          </div>
        )}

        {!isLoading && beneficiaryRequests.length === 0 && (
          <article className="card employee-queue-card">
            <div className="card-body">
              <div className="employee-queue-header">
                <div>
                  <span className="account-id">Queue clear</span>
                  <h2>No pending beneficiaries</h2>
                  <p>New beneficiary requests will appear here.</p>
                </div>
              </div>
            </div>
          </article>
        )}

        {beneficiaryRequests.map((request) => {
          const isPending = request.status === 'Pending'
          const isActiveRequest = activeRequestId === request.id
          const statusClass = request.status === 'Approved' ? 'approved' : request.status === 'Rejected' ? 'inactive' : 'pending'

          return (
            <article className="card employee-queue-card" key={request.id}>
              <div className="card-body">
                <div className="employee-queue-header">
                  <div>
                    <span className="account-id">{request.id}</span>
                    <h2>{request.beneficiaryName}</h2>
                    <p>{request.townName}, {request.countryCode}</p>
                  </div>
                  <span className={`beneficiary-status-badge ${statusClass}`}>{request.status}</span>
                </div>

                <div className="employee-queue-grid">
                  <div className="employee-detail-block">
                    <span>Added by</span>
                    <strong>{request.customerName}</strong>
                    <small>User ID {request.userId}</small>
                  </div>
                  <div className="employee-detail-block">
                    <span>Sending to</span>
                    <strong>{request.beneficiaryName}</strong>
                    <small>Account {request.accountNumber}</small>
                    <small>Routing {request.routingNumber}</small>
                  </div>
                  <div className="employee-detail-block">
                    <span>Request details</span>
                    <strong>{request.townName || request.countryCode}</strong>
                    <small>Submitted {request.submittedAt}</small>
                  </div>
                </div>

                <div className="employee-queue-actions">
                  <button
                    className="profile-action-button secondary-action"
                    type="button"
                    disabled={!isPending || isActiveRequest}
                    onClick={() => handleReviewAction(request, 'reject')}
                  >
                    <i className="bi bi-x-circle" aria-hidden="true"></i>
                    {isActiveRequest ? 'Updating...' : 'Reject'}
                  </button>
                  <button
                    className="profile-action-button primary-action"
                    type="button"
                    disabled={!isPending || isActiveRequest}
                    onClick={() => handleReviewAction(request, 'approve')}
                  >
                    <i className="bi bi-check-circle" aria-hidden="true"></i>
                    {isActiveRequest ? 'Updating...' : 'Approve'}
                  </button>
                </div>
              </div>
            </article>
          )
        })}
      </section>
    </div>
  )
}

export default BeneficiaryQueue
