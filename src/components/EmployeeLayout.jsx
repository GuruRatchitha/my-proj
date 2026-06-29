import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { clearStoredCurrentUser } from '../api/currentUser'
import '../pages/dashboard/Dashboard.css'
import '../pages/employee/Employee.css'

const employeeNavItems = [
  {
    to: '/employee/dashboard',
    icon: 'bi bi-grid-1x2',
    label: 'Dashboard',
  },
  {
    to: '/employee/customers',
    icon: 'bi bi-people',
    label: 'Customers',
  },
  {
    to: '/employee/beneficiary-queue',
    icon: 'bi bi-person-check',
    label: 'Beneficiaries',
  },
  {
    to: '/employee/transaction-queue',
    icon: 'bi bi-arrow-left-right',
    label: 'Transaction Queue',
  },
  {
    to: '/employee/settlement-account',
    icon: 'bi bi-bank',
    label: 'Settlement Account',
  },
]

function EmployeeLayout() {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    clearStoredCurrentUser()
    navigate('/login')
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

        <nav className="workspace-nav" aria-label="Employee workspace">
          <span className="nav-label">Workspace</span>
          {employeeNavItems.map((item) => (
            <NavLink className="sidebar-link" to={item.to} key={item.to}>
              <i className={item.icon} aria-hidden="true"></i>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="profile-card">
          <div className="profile-hit-area">
            <span className="avatar">D</span>
            <span className="profile-link">
              <strong>Daniel Hart</strong>
              <small>Operations - L2</small>
            </span>
          </div>
          <button className="sidebar-action" type="button" aria-label="Sign out" onClick={handleLogout}>
            <i className="bi bi-box-arrow-right" aria-hidden="true"></i>
          </button>
        </div>
      </aside>

      <section className="dashboard-content">
        <header className="topbar employee-topbar">
          <div className="topbar-actions">
            <button className="icon-button" type="button" aria-label="Notifications">
              <i className="bi bi-bell" aria-hidden="true"></i>
            </button>
          </div>
        </header>

        <Outlet />
      </section>
    </main>
  )
}

export default EmployeeLayout
