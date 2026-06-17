import { NavLink, Outlet } from 'react-router-dom'
import '../pages/dashboard/Dashboard.css'

function BankLayout() {
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
          <NavLink className="nav-link" to="/dashboard">
            <i className="bi bi-grid-1x2" aria-hidden="true"></i>
            <span>Dashboard</span>
          </NavLink>
          <NavLink className="nav-link" to="/profile">
            <i className="bi bi-person" aria-hidden="true"></i>
            <span>Profile</span>
          </NavLink>
          <NavLink className="nav-link" to="/transactions">
            <i className="bi bi-arrow-left-right" aria-hidden="true"></i>
            <span>Transactions</span>
          </NavLink>
        </nav>

        <div className="profile-card">
          <span className="avatar">A</span>
          <div>
            <strong>Ava Thompson</strong>
            <small>Personal</small>
          </div>
          <button className="sidebar-action" type="button" aria-label="Sign out">
            <i className="bi bi-box-arrow-right" aria-hidden="true"></i>
          </button>
        </div>
      </aside>

      <section className="dashboard-content">
        <header className="topbar">
          <div className="welcome">
            <span>Welcome back</span>
            <strong>Ava Thompson</strong>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" type="button" aria-label="Notifications">
              <i className="bi bi-bell" aria-hidden="true"></i>
            </button>
            <button className="btn add-payment" type="button">
              <i className="bi bi-plus-lg" aria-hidden="true"></i>
              Add payment
            </button>
          </div>
        </header>

        <Outlet />
      </section>
    </main>
  )
}

export default BankLayout
