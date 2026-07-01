import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createBeneficiary, fetchBeneficiaries } from '../../api/beneficiaries'
import LoadingSpinner from '../../components/LoadingSpinner'

const COUNTRY_CODE = 'US'

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
})

const initialFormValues = {
  accountNumber: '',
  routingNumber: '',
  beneficiaryName: '',
  townName: '',
}

const formatCreatedDate = (createdDate) => {
  if (!createdDate) {
    return '-'
  }

  const date = new Date(createdDate)
  return Number.isNaN(date.getTime()) ? '-' : dateFormatter.format(date)
}

const normalizeStatus = (status) => {
  const normalizedStatus = (status || '').toString().trim().toLowerCase()

  if (['active', 'approved'].includes(normalizedStatus)) {
    return 'Active'
  }

  if (normalizedStatus === 'pending') {
    return 'Pending'
  }

  if (normalizedStatus === 'rejected') {
    return 'Rejected'
  }

  return 'Inactive'
}

const normalizeBeneficiary = (beneficiary, index = 0) => {
  const createdDate =
    beneficiary.createdDate ||
    beneficiary.createdAt ||
    beneficiary.createdOn ||
    beneficiary.creationDate
  const status = normalizeStatus(
    beneficiary.status ||
      beneficiary.beneficiaryStatus ||
      beneficiary.approvalStatus ||
      beneficiary.approvedStatus,
  )

  return {
    id:
      beneficiary.id ||
      beneficiary.beneficiaryId ||
      `${beneficiary.accountNumber || 'BEN'}-${beneficiary.routingNumber || index}`,
    accountNumber: beneficiary.accountNumber || '',
    routingNumber: beneficiary.routingNumber || '',
    beneficiaryName: beneficiary.beneficiaryName || '',
    countryCode: beneficiary.countryCode || COUNTRY_CODE,
    townName: beneficiary.townName || '',
    status,
    createdDate: formatCreatedDate(createdDate),
    rejectionReason: beneficiary.rejectionReason || beneficiary.rejectReason || beneficiary.reason || '',
    statusClass: status === 'Active' ? 'approved' : status === 'Rejected' ? 'inactive' : status.toLowerCase(),
    isPaymentEnabled: status === 'Active',
  }
}

function Beneficiary() {
  const navigate = useNavigate()
  const [formValues, setFormValues] = useState(initialFormValues)
  const [beneficiaries, setBeneficiaries] = useState([])
  const [saveMessage, setSaveMessage] = useState('')
  const [saveError, setSaveError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingBeneficiaries, setIsLoadingBeneficiaries] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadBeneficiaries = async () => {
      try {
        setIsLoadingBeneficiaries(true)
        setLoadError('')

        const response = await fetchBeneficiaries()
        const nextBeneficiaries = Array.isArray(response) ? response : []

        if (isMounted) {
          setBeneficiaries(nextBeneficiaries.map(normalizeBeneficiary))
        }
      } catch (error) {
        if (isMounted) {
          setBeneficiaries([])
          setLoadError(error.message || 'Unable to load beneficiaries.')
        }
      } finally {
        if (isMounted) {
          setIsLoadingBeneficiaries(false)
        }
      }
    }

    loadBeneficiaries()

    return () => {
      isMounted = false
    }
  }, [])

  const handleInputChange = (event) => {
    const { name, value } = event.target
    const normalizedValue = {
      accountNumber: value.replace(/\D/g, ''),
      routingNumber: value.replace(/\D/g, ''),
      townName: value.replace(/[^a-zA-Z\s]/g, '').slice(0, 35),
    }[name] ?? value

    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: normalizedValue,
    }))
  }

  const handleSaveBeneficiary = async (event) => {
    event.preventDefault()

    setSaveMessage('')
    setSaveError('')
    setIsSaving(true)

    const payload = {
      beneficiaryName: formValues.beneficiaryName.trim(),
      townName: formValues.townName.trim(),
      countryCode: COUNTRY_CODE,
      accountNumber: formValues.accountNumber.trim(),
      routingNumber: formValues.routingNumber.trim(),
    }

    try {
      const response = await createBeneficiary(payload)
      const savedBeneficiary = response?.beneficiary || payload

      setBeneficiaries((currentBeneficiaries) => [
        normalizeBeneficiary(savedBeneficiary, Date.now()),
        ...currentBeneficiaries,
      ])
      setFormValues(initialFormValues)
      setSaveMessage(response?.message || 'Beneficiary saved successfully')
    } catch (error) {
      setSaveError(error.message || 'Unable to save beneficiary.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleMakePayment = (beneficiary) => {
    if (!beneficiary.isPaymentEnabled) {
      return
    }

    navigate('/payment', {
      state: {
        beneficiary,
      },
    })
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
          <p>Add verified beneficiary details for payment setup.</p>
        </div>
        <span className="beneficiary-hero-icon">
          <i className="bi bi-person-vcard" aria-hidden="true"></i>
        </span>
      </section>

      <section className="profile-form-card beneficiary-form-card">
        <div className="section-heading">
          <div>
            <h2>Beneficiary Details</h2>
            <p>Enter the account and location information for this beneficiary.</p>
          </div>
        </div>

        {saveMessage && (
          <div className="alert alert-success beneficiary-alert" role="alert">
            <i className="bi bi-check-circle-fill" aria-hidden="true"></i>
            <span>{saveMessage}</span>
          </div>
        )}
        {saveError && (
          <div className="alert alert-danger beneficiary-alert" role="alert">
            <i className="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
            <span>{saveError}</span>
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
                inputMode="numeric"
                value={formValues.accountNumber}
                onChange={handleInputChange}
                required
              />
            </label>
            <label className="bank-field">
              <span>Routing Number</span>
              <input
                className="form-control"
                name="routingNumber"
                type="text"
                inputMode="numeric"
                value={formValues.routingNumber}
                onChange={handleInputChange}
                required
              />
            </label>
            <label className="bank-field">
              <span>Country Code</span>
              <input
                className="form-control"
                name="countryCode"
                type="text"
                value={COUNTRY_CODE}
                disabled
                readOnly
              />
            </label>
            <label className="bank-field">
              <span>Town Name</span>
              <input
                className="form-control"
                name="townName"
                type="text"
                maxLength={35}
                pattern="[A-Za-z\s]{1,35}"
                title="Town name can contain only letters and spaces, up to 35 characters."
                value={formValues.townName}
                onChange={handleInputChange}
                required
              />
            </label>
          </div>

          <div className="form-actions">
            <button className="profile-action-button primary-action" type="submit" disabled={isSaving}>
              <i className="bi bi-bookmark-check" aria-hidden="true"></i>
              {isSaving ? (
                <LoadingSpinner label="Saving" size="sm" variant="button" />
              ) : 'Save Beneficiary'}
            </button>
          </div>
        </form>
      </section>

      <section className="transactions-section">
        <div className="section-heading transactions-heading">
          <div>
            <h2>Saved Beneficiaries</h2>
            <p>Beneficiary records captured for transfer setup.</p>
          </div>
        </div>

        <div className="transaction-table-wrap beneficiary-table-wrap">
          {loadError && <p className="dashboard-state error">{loadError}</p>}
          <table className="table bank-table beneficiary-table mb-0">
            <thead>
              <tr>
                <th>Account Number</th>
                <th>Routing Number</th>
                <th>Beneficiary Name</th>
                <th>Country Code</th>
                <th>Town Name</th>
                <th>Status</th>
                <th>Reason</th>
                <th>Created Date</th>
                <th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingBeneficiaries && (
                <tr>
                  <td colSpan="9">
                    <div className="table-loading-state">
                      <LoadingSpinner label="Loading beneficiaries" />
                    </div>
                  </td>
                </tr>
              )}
              {!isLoadingBeneficiaries && beneficiaries.map((beneficiary) => (
                <tr key={beneficiary.id}>
                  <td>{beneficiary.accountNumber}</td>
                  <td>{beneficiary.routingNumber}</td>
                  <td>
                    <span className="beneficiary-name-cell">
                      <i className="bi bi-person-circle" aria-hidden="true"></i>
                      {beneficiary.beneficiaryName}
                    </span>
                  </td>
                  <td>{beneficiary.countryCode}</td>
                  <td>{beneficiary.townName}</td>
                  <td>
                    <span
                      className={`beneficiary-status-badge ${beneficiary.statusClass}`}
                    >
                      {beneficiary.status}
                    </span>
                  </td>
                  <td>{beneficiary.status === 'Rejected' ? beneficiary.rejectionReason || '-' : '-'}</td>
                  <td>{beneficiary.createdDate}</td>
                  <td>
                    <button
                      className="table-payment-button"
                      type="button"
                      disabled={!beneficiary.isPaymentEnabled}
                      onClick={() => handleMakePayment(beneficiary)}
                    >
                      <i className="bi bi-send" aria-hidden="true"></i>
                      Make Payment
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoadingBeneficiaries && beneficiaries.length === 0 && (
                <tr>
                  <td colSpan="9">No beneficiaries found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default Beneficiary
