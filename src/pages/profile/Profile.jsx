import { useEffect, useState } from 'react'
import httpClient from '../../api/httpClient'

const PROFILE_ENDPOINT = '/api/users/profile'
const PASSWORD_MASK = '********'

const emptyProfile = {
  createdDate: '',
  roleId: '',
  userId: '',
  email: 'admin@bank.com',
  aadharNumber: '',
  address: '',
  panCardNumber: '',
  password: '',
  phoneNumber: '',
  username: '',
}

const readonlyFields = ['userId','createdDate', 'email','password']

const editableFields = [
  'username',
  'aadharNumber',
  'address',
  'phoneNumber',
  'panCardNumber',
]

const fieldLabels = {
  userId: 'User ID',
  createdDate: 'Created date',
  email: 'Email',
  aadharNumber: 'Aadhar number',
  address: 'Address',
  panCardNumber: 'PAN card number',
  password: 'Password',
  phoneNumber: 'Phone number',
  username: 'User name',
}

const formatDate = (value) => (value ? value.split('T')[0] : '')

const formatUserId = (value) => {
  if (!value) {
    return ''
  }

  return `USER-${String(value).padStart(3, '0')}`
}

// const formatRoleId = (value) => {
//   if (!value && value !== 0) {
//     return ''
//   }

//   return Number(value) === 1 ? 'ROLE-ADMIN' : `ROLE-${value}`
// }

const mapApiProfileToForm = (profile) => ({
  createdDate: formatDate(profile.createdDate),
  
  userId: formatUserId(profile.userId),
  email: profile.email || '',
  aadharNumber: profile.aadharNumber || '',
  address: profile.address || '',
  panCardNumber: profile.panCardNumber || '',
  password: profile.password || PASSWORD_MASK,
  phoneNumber: profile.phoneNumber || '',
  username: profile.username || '',
})

const buildProfilePayload = (profile) => {
  const payload = {
    aadharNumber: profile.aadharNumber.replace(/\s/g, ''),
    address: profile.address.trim(),
    panCardNumber: profile.panCardNumber.trim().toUpperCase(),
    password: profile.password || PASSWORD_MASK,
    phoneNumber: profile.phoneNumber.replace(/\s/g, ''),
    username: profile.username.trim(),
  }

  return payload
}

function Profile() {
  const [profile, setProfile] = useState(emptyProfile)
  const [lastSavedProfile, setLastSavedProfile] = useState(emptyProfile)
  const [statusMessage, setStatusMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadProfile = async () => {
      setIsLoading(true)
      setStatusMessage('')

      try {
        const response = await httpClient.get(PROFILE_ENDPOINT)
        const nextProfile = mapApiProfileToForm(response)

        if (isMounted) {
          setProfile(nextProfile)
          setLastSavedProfile(nextProfile)
        }
      } catch (error) {
        if (isMounted) {
          setStatusMessage(error.message || 'Unable to load profile details.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadProfile()

    return () => {
      isMounted = false
    }
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target

    setProfile((currentProfile) => ({
      ...currentProfile,
      [name]: value,
    }))
    setStatusMessage('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setStatusMessage('')

    try {
      const response = await httpClient.put(PROFILE_ENDPOINT, buildProfilePayload(profile))
      const nextProfile = mapApiProfileToForm(response)

      setProfile(nextProfile)
      setLastSavedProfile(nextProfile)
      alert('Profile changes saved successfully.')
    } catch (error) {
      setStatusMessage(error.message || 'Unable to save profile changes.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setProfile(lastSavedProfile)
    setStatusMessage('')
  }

  return (
    <div className="dashboard-main">
      <section className="title-block">
        <h1>Profile</h1>
        <p>Review and manage your banking profile.</p>
      </section>

      <section className="profile-summary-card">
        <div>
          <span>Primary account holder</span>
          <strong>{profile.username || 'Account holder'}</strong>
          <small>{profile.email}</small>
        </div>
        <div className="profile-summary-meta">
          <span>{profile.userId || 'USER'}</span>
          {/* <span>{profile.roleId || 'ROLE'}</span> */}
        </div>
      </section>

      <form className="profile-form-card" onSubmit={handleSubmit}>
        <div className="section-heading">
          <div>
            <h2>Account details</h2>
            <p>Locked fields are managed by the bank administrator.</p>
          </div>
        </div>

        {isLoading && <p className="dashboard-state">Loading profile details...</p>}

        <div className="form-grid">
          {readonlyFields.map((field) => (
            <label className="bank-field" key={field}>
              <span>{fieldLabels[field]}</span>
              <input value={profile[field]} disabled />
            </label>
          ))}

          {editableFields.map((field) => (
            <label className="bank-field" key={field}>
              <span>{fieldLabels[field]}</span>
              <input
                name={field}
                type={field === 'password' ? 'password' : 'text'}
                value={profile[field]}
                onChange={handleChange}
                disabled={isLoading || isSubmitting}
              />
            </label>
          ))}
        </div>

        <div className="form-actions">
          <button className="profile-action-button primary-action" type="submit" disabled={isLoading || isSubmitting}>
            <i className="bi bi-check2" aria-hidden="true"></i>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
          {/* <button
            className="profile-action-button secondary-action"
            type="button"
            onClick={handleReset}
            disabled={isLoading || isSubmitting}
          >
            <i className="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
            Cancel
          </button> */}
        </div>

        {statusMessage && <p className="dashboard-state error">{statusMessage}</p>}
      </form>
    </div>
  )
}

export default Profile
