import { Navigate, Route, Routes } from 'react-router-dom'
import BankLayout from './components/BankLayout'
import CustomerProtectedRoute from './components/CustomerProtectedRoute'
import EmployeeLayout from './components/EmployeeLayout'
import EmployeeProtectedRoute from './components/EmployeeProtectedRoute'
import Beneficiary from './pages/beneficiary/Beneficiary'
import Dashboard from './pages/dashboard/Dashboard'
import BeneficiaryQueue from './pages/employee/BeneficiaryQueue'
import Customers from './pages/employee/Customers'
import EmployeeDashboard from './pages/employee/EmployeeDashboard'
import TransactionDetails from './pages/employee/TransactionDetails'
import TransactionQueue from './pages/employee/TransactionQueue'
import LoginPage from './pages/login/Login'
import Payment from './pages/payment/Payment'
import Profile from './pages/profile/Profile'
import Transactions from './pages/transactions/Transactions'

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} /> 

        <Route element={<CustomerProtectedRoute />}>
          <Route element={<BankLayout />}>
            <Route path="/customer/dashboard" element={<Dashboard />} />
            <Route path="/customer/profile" element={<Profile />} />
            <Route path="/customer/transactions" element={<Transactions />} />
            <Route path="/customer/beneficiary" element={<Beneficiary />} />
            <Route path="/payment" element={<Payment />} />
            <Route path="/payment/confirmation" element={<Payment />} />
            <Route path="/payment/success" element={<Payment />} />
          </Route>
        </Route>

        <Route element={<EmployeeProtectedRoute />}>
          <Route element={<EmployeeLayout />}>
            <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
            <Route path="/employee/customers" element={<Customers />} />
            <Route path="/employee/beneficiary-queue" element={<BeneficiaryQueue />} />
            <Route path="/employee/transaction-queue" element={<TransactionQueue />} />
            <Route path="/employee/transaction-queue/:transactionReference" element={<TransactionDetails />} />
          </Route>
        </Route>
      </Routes>
    </>
  )
}

export default App
