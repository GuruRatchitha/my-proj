import { Navigate, Outlet } from 'react-router-dom'
import { getStoredRoleName } from '../api/currentUser'

function CustomerProtectedRoute() {
  return getStoredRoleName() === 'CUSTOMER' ? <Outlet /> : <Navigate to="/login" replace />
}

export default CustomerProtectedRoute
