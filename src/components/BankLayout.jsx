import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { clearStoredCurrentUser, getStoredCurrentUser } from '../api/currentUser'
import '../pages/dashboard/Dashboard.css'

function BankLayout() {
  const navigate = useNavigate()
  const currentUser = getStoredCurrentUser()
  const profileName = currentUser?.userName || localStorage.getItem('username') || 'Account holder'
  const roleName = currentUser?.roleName || localStorage.getItem('roleName') || ''
  const profilePath = roleName === 'EMPLOYEE' ? '/employee/profile' : '/customer/profile'
  const navItems =
    roleName === 'EMPLOYEE'
      ? [
        {
          to: '/employee/dashboard',
          icon: 'bi bi-grid-1x2',
          label: 'Dashboard',
        },
      ]
      : [
        {
          to: '/customer/dashboard',
          icon: 'bi bi-grid-1x2',
          label: 'Dashboard',
        },
        {
          to: '/customer/transactions',
          icon: 'bi bi-arrow-left-right',
          label: 'Transactions',
        },
        {
          to: '/customer/beneficiary',
          icon: 'bi bi-person-lines-fill',
          label: 'Beneficiary',
        },
      ]
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    name: '',
    ifscCode: '',
    accountNumber: '',
    address: '',
  })

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    clearStoredCurrentUser()
    navigate('/login')
  }

  const handlePaymentChange = (event) => {
    const { name, value } = event.target

    setPaymentForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  const handlePaymentSubmit = (event) => {
    event.preventDefault()
    alert('Payment beneficiary added successfully.')
    setPaymentForm({
      name: '',
      ifscCode: '',
      accountNumber: '',
      address: '',
    })
    setIsPaymentModalOpen(false)
  }

  return (
    <main className="bank-dashboard">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">
            <i className="bi bi-bank2" aria-hidden="true"></i>
          </span>
          <span>ABC Bank</span>
        </div>

        <nav className="workspace-nav" aria-label="Workspace">
          <span className="nav-label">Workspace</span>
          {navItems.map((item) => (
            <NavLink className="sidebar-link" to={item.to} key={item.to}>
              <i className={item.icon} aria-hidden="true"></i>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="profile-card">
          <NavLink className="profile-hit-area" to={profilePath}>
            <span className="avatar">{profileName.charAt(0).toUpperCase()}</span>
            <span className="profile-link">
              <strong>{profileName}</strong>
              <small>{roleName === 'EMPLOYEE' ? 'Employee' : 'Personal'}</small>
            </span>
          </NavLink>
          <button className="sidebar-action" type="button" aria-label="Sign out" onClick={handleLogout}>
            <i className="bi bi-box-arrow-right" aria-hidden="true"></i>
          </button>
        </div>
      </aside>

      <section className="dashboard-content">
        <header className="topbar">
          <div className="welcome">
            <span>Welcome back</span>
            <NavLink to={profilePath}>{profileName}</NavLink>
          </div>
          <div className="topbar-actions">
            {/* {isTransactionsScreen && (
              <button className="add-payment" type="button" onClick={() => setIsPaymentModalOpen(true)}>
                <i className="bi bi-plus-lg" aria-hidden="true"></i>
                <span>Add Payment</span>
              </button>
            )} */}
          </div>
        </header>

        <Outlet />
      </section>

      {isPaymentModalOpen && (
        <div className="payment-modal-backdrop" role="presentation">
          <section className="payment-modal" role="dialog" aria-modal="true" aria-labelledby="payment-modal-title">
            <header className="payment-modal-header">
              <div>
                <h2 id="payment-modal-title">Add Payment</h2>
                <p>Add beneficiary details for a new payment.</p>
              </div>
              <button
                className="modal-close-button"
                type="button"
                aria-label="Close add payment"
                onClick={() => setIsPaymentModalOpen(false)}
              >
                <i className="bi bi-x-lg" aria-hidden="true"></i>
              </button>
            </header>

            <form className="payment-form" onSubmit={handlePaymentSubmit}>
              <label className="bank-field">
                <span>Name</span>
                <input
                  name="name"
                  type="text"
                  value={paymentForm.name}
                  onChange={handlePaymentChange}
                  required
                />
              </label>
              <label className="bank-field">
                <span>IFSC code</span>
                <input
                  name="ifscCode"
                  type="text"
                  value={paymentForm.ifscCode}
                  onChange={handlePaymentChange}
                  required
                />
              </label>
              <label className="bank-field">
                <span>Account no</span>
                <input
                  name="accountNumber"
                  type="text"
                  value={paymentForm.accountNumber}
                  onChange={handlePaymentChange}
                  required
                />
              </label>
              <label className="bank-field payment-address-field">
                <span>Address</span>
                <input
                  name="address"
                  type="text"
                  value={paymentForm.address}
                  onChange={handlePaymentChange}
                  required
                />
              </label>

              <div className="modal-actions">
                <button className="profile-action-button secondary-action" type="button" onClick={() => setIsPaymentModalOpen(false)}>
                  Cancel
                </button>
                <button className="profile-action-button primary-action" type="submit">
                  Add Payment
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}

export default BankLayout
