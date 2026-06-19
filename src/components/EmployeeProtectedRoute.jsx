import { Navigate, Outlet } from 'react-router-dom'
import { getStoredRoleName } from '../api/currentUser'

function EmployeeProtectedRoute() {
  return getStoredRoleName() === 'EMPLOYEE' ? <Outlet /> : <Navigate to="/login" replace />
}

export default EmployeeProtectedRoute
