import { Route, Routes } from 'react-router-dom'
import AppLoader from './components/AppLoader'
import BankLayout from './components/BankLayout'
import Dashboard from './pages/dashboard/Dashboard'
import LoginPage from './pages/login/Login'
import Profile from './pages/profile/Profile'
import Transactions from './pages/transactions/Transactions'

function App() {
  return (
    <>
      <AppLoader />
      <Routes>
        {/* <Route path="/" element={<Navigate to="/dashboard" replace />} /> */}
        <Route path="/" element={<LoginPage />} />
        <Route element={<BankLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/transactions" element={<Transactions />} />
        </Route>
      </Routes>
    </>
  )
}

export default App
