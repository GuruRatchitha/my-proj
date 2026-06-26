import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import httpClient from '../../api/httpClient'
import {
  clearStoredCurrentUser,
  getUserIdFromData,
  getUserIdFromToken,
  storeCurrentUser,
  storeUserId,
} from '../../api/currentUser'
import './login.css'

const initialForm = {
  email: '',
  password: '',
}

const getUsernameFromLoginResponse = (response) =>
  response?.userName ||
  response?.username ||
  response?.name ||
  response?.user?.userName ||
  response?.user?.username ||
  response?.user?.name ||
  response?.data?.userName ||
  response?.data?.username ||
  response?.data?.name ||
  response?.data?.user?.userName ||
  response?.data?.user?.username ||
  response?.data?.user?.name

const getRoleNameFromLoginResponse = (response) =>
  response?.roleName ||
  response?.role ||
  response?.authority ||
  response?.user?.roleName ||
  response?.user?.role ||
  response?.user?.authority ||
  response?.data?.roleName ||
  response?.data?.role ||
  response?.data?.authority ||
  response?.data?.user?.roleName ||
  response?.data?.user?.role ||
  response?.data?.user?.authority ||
  ''

const normalizeRoleName = (roleName = '') => {
  const normalizedRole = roleName.toString().trim().toUpperCase()

  if (normalizedRole.includes('EMPLOYEE')) {
    return 'EMPLOYEE'
  }

  if (normalizedRole.includes('CUSTOMER')) {
    return 'CUSTOMER'
  }

  return normalizedRole
}

function LoginPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [statusMessage, setStatusMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateForm = () => {
    const nextErrors = {}
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!formData.email.trim()) {
      nextErrors.email = 'Email is required.'
    } else if (!emailPattern.test(formData.email)) {
      nextErrors.email = 'Enter a valid email address.'
    }

    if (!formData.password) {
      nextErrors.password = 'Password is required.'
    } else if (formData.password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }))

    setErrors((currentErrors) => ({
      ...currentErrors,
      [name]: '',
    }))
    setStatusMessage('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!validateForm()) {
      setStatusMessage('')
      return
    }

    setIsSubmitting(true)
    setStatusMessage('')
    clearStoredCurrentUser()
    localStorage.removeItem('authToken')

    try {
      const payload = {
        email: formData.email.trim(),
        password: formData.password,
      }
      const response = await httpClient.post('/api/auth/login', payload)
      const token = response?.token || response?.accessToken || response?.data?.token
      const username = getUsernameFromLoginResponse(response)
      const roleName = normalizeRoleName(getRoleNameFromLoginResponse(response))
      const responseUserId = getUserIdFromData(response)
      const userId =
        responseUserId || responseUserId === 0 ? responseUserId : getUserIdFromToken(token)

      if (token) {
        localStorage.setItem('authToken', token)
      }

      if (userId || userId === 0) {
        storeUserId(userId)
      } else {
        clearStoredCurrentUser()
      }

      if (username) {
        storeCurrentUser({
          ...response,
          userId,
          userName: username,
        })
      } else {
        storeCurrentUser({
          ...response,
          userId,
        })
      }

      setStatusMessage('Login successful. Redirecting to your dashboard...')
      if (roleName === 'EMPLOYEE') {
        navigate('/employee/dashboard')
      } else if (roleName === 'CUSTOMER') {
        navigate('/customer/dashboard')
      } else {
        setStatusMessage('Login successful, but no valid role was returned.')
      }
    } catch (error) {
      setStatusMessage(error.message || 'Unable to sign in. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="bank-login-page">
      <div className="container-fluid bank-shell">
        <div className="row align-items-center min-vh-100 g-0">
          <section className="col-12 col-xl-7 bank-hero">
            <div className="brand-mark">
              <span className="brand-icon">
                <i className="bi bi-bank2" aria-hidden="true"></i>
              </span>
              <span className="brand-name">ABC Bank</span>
            </div>

            <div className="hero-content">
              <div className="feature-badge">
                <i className="bi bi-stars" aria-hidden="true"></i>
                <span>New &middot; Secure online banking workspace</span>
              </div>

              <h1 className="hero-title">
                Banking that
                <br />
                feels
                <br />
                <span>effortless.</span>
              </h1>

              <p className="hero-description">
                Move money, manage beneficiaries, and approve
                <br />
                transactions &mdash; all from one luminous interface
                <br />
                designed for clarity and speed.
              </p>

              <div className="trust-row">
                <span>
                  <i className="bi bi-shield-check" aria-hidden="true"></i>
                  SOC 2 Type II
                </span>
                <span>
                  <i className="bi bi-lock" aria-hidden="true"></i>
                  256-bit encryption
                </span>
                <span>
                  <i className="bi bi-stars" aria-hidden="true"></i>
                  99.99% uptime
                </span>
              </div>
            </div>

            <p className="copyright">
              &copy; 2026 ABC Bank Financial. All rights reserved.
            </p>
          </section>

          <section className="col-12 col-xl-5 login-pane">
            <div className="login-card">
              <div className="login-card-header">
                <h2>Welcome back !!</h2>
                <p>Sign in to continue to your account.</p>
              </div>

              <p className="mode-helper">
                Access your accounts, transactions, and beneficiaries.
              </p>

              <form className="login-form" onSubmit={handleSubmit} noValidate>
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                    placeholder="ava@abcbank.com"
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleChange}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                  />
                  {errors.email && (
                    <p className="field-error" id="email-error">
                      {errors.email}
                    </p>
                  )}
                </div>

                <div className="form-group">
                  <div className="password-label-row">
                    <label htmlFor="password">Password</label>
                    {/* <button
                      className="forgot-button"
                      type="button"
                      onClick={handleForgotPassword}
                    >
                      Forgot?
                    </button> */}
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    className={`form-control ${errors.password ? 'is-invalid' : ''
                      }`}
                    placeholder="********"
                    autoComplete="current-password"
                    value={formData.password}
                    onChange={handleChange}
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={
                      errors.password ? 'password-error' : undefined
                    }
                  />
                  {errors.password && (
                    <p className="field-error" id="password-error">
                      {errors.password}
                    </p>
                  )}
                </div>

                <button type="submit" className="sign-in-button" disabled={isSubmitting}>
                  <span>{isSubmitting ? 'Signing in...' : 'Sign in'}</span>
                  <i className="bi bi-arrow-right" aria-hidden="true"></i>
                </button>
              </form>

              {statusMessage && <p className="status-message">{statusMessage}</p>}

              <p className="demo-note">Use your registered banking credentials.</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

export default LoginPage
