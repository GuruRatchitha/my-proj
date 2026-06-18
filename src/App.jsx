import { Route, Routes } from 'react-router-dom'
import BankLayout from './components/BankLayout'
import Beneficiary from './pages/beneficiary/Beneficiary'
import Dashboard from './pages/dashboard/Dashboard'
import LoginPage from './pages/login/Login'
import Profile from './pages/profile/Profile'
import Transactions from './pages/transactions/Transactions'

function App() {
  return (
    <>
      <Routes>
        {/* <Route path="/" element={<Navigate to="/dashboard" replace />} /> */}
        <Route path="/" element={<LoginPage />} />
        <Route element={<BankLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/beneficiary" element={<Beneficiary />} />
        </Route>
      </Routes>
    </>
  )
}

export default App
