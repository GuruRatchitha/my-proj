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
  const customerName =
    beneficiary.userName ||
    beneficiary.customerName ||
    beneficiary.customer?.userName ||
    beneficiary.customer?.name ||
    ''

  return {
    id: `${beneficiary.userId || 'USER'}-${beneficiary.accountNumber || index}-${beneficiary.routingNumber || index}`,
    userId: beneficiary.userId || '',
    customerName,
    beneficiaryName: beneficiary.beneficiaryName || '',
    townName: beneficiary.townName || '',
    countryCode: beneficiary.countryCode || 'US',
    accountNumber: beneficiary.accountNumber || '',
    routingNumber: beneficiary.routingNumber || '',
    submittedAt: formatSubmittedDate(beneficiary.createdDate),
    rejectionReason: beneficiary.rejectionReason || beneficiary.rejectReason || beneficiary.reason || '',
    status,
  }
}

function BeneficiaryQueue() {
  const [beneficiaryRequests, setBeneficiaryRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [queueError, setQueueError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [activeRequestId, setActiveRequestId] = useState('')
  const [rejectRequest, setRejectRequest] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')

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
    const updatedBeneficiary = response?.beneficiary || {}
    const nextStatus = updatedBeneficiary.status
      ? normalizeQueueStatus(updatedBeneficiary.status)
      : request.status
    const nextRejectionReason =
      updatedBeneficiary.rejectionReason ||
      updatedBeneficiary.rejectReason ||
      updatedBeneficiary.reason ||
      request.rejectionReason

    setBeneficiaryRequests((currentRequests) =>
      currentRequests.map((currentRequest) =>
        currentRequest.id === request.id
          ? {
            ...currentRequest,
            status: nextStatus,
            rejectionReason: nextRejectionReason,
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
        reason: rejectionReason.trim(),
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

  const openRejectDialog = (request) => {
    setRejectRequest(request)
    setRejectionReason('')
    setQueueError('')
  }

  const closeRejectDialog = () => {
    setRejectRequest(null)
    setRejectionReason('')
  }

  const handleRejectSubmit = async (event) => {
    event.preventDefault()

    if (!rejectRequest || !rejectionReason.trim()) {
      return
    }

    await handleReviewAction(rejectRequest, 'reject')
    closeRejectDialog()
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
                    <strong>{request.customerName || 'Customer record'}</strong>
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
                    onClick={() => openRejectDialog(request)}
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

      {rejectRequest && (
        <div className="payment-modal-backdrop" role="presentation">
          <section className="payment-modal" role="dialog" aria-modal="true" aria-labelledby="reject-modal-title">
            <header className="payment-modal-header">
              <div>
                <h2 id="reject-modal-title">Reject beneficiary</h2>
                <p>Provide a reason customers can review on their beneficiary page.</p>
              </div>
              <button
                className="modal-close-button"
                type="button"
                aria-label="Close reject beneficiary"
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
                  required
                />
              </label>
              <div className="modal-actions">
                <button className="profile-action-button secondary-action" type="button" onClick={closeRejectDialog}>
                  Cancel
                </button>
                <button className="profile-action-button primary-action" type="submit" disabled={!rejectionReason.trim() || Boolean(activeRequestId)}>
                  Reject
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}

export default BeneficiaryQueue
