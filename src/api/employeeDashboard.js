import httpClient from './httpClient'

export const fetchEmployeeDashboardSummary = async () =>
  httpClient.get('/api/dashboard/summary')

export const fetchDashboardRecentCustomers = async () =>
  httpClient.get('/api/dashboard/recent-customers')

export const fetchDashboardPendingBeneficiaries = async () =>
  httpClient.get('/api/dashboard/pending-beneficiaries')

export const fetchDashboardPendingTransactions = async () =>
  httpClient.get('/api/dashboard/pending-transactions')

export const fetchDashboardAccountStatistics = async () =>
  httpClient.get('/api/dashboard/account-statistics')

export const fetchDashboardRecentActivity = async () =>
  httpClient.get('/api/dashboard/recent-activity')

export const fetchEmployeeDashboard = async () => {
  const [
    summary,
    recentCustomers,
    pendingBeneficiaries,
    pendingTransactions,
    accountStatistics,
    recentActivity,
  ] = await Promise.all([
    fetchEmployeeDashboardSummary(),
    fetchDashboardRecentCustomers(),
    fetchDashboardPendingBeneficiaries(),
    fetchDashboardPendingTransactions(),
    fetchDashboardAccountStatistics(),
    fetchDashboardRecentActivity(),
  ])

  return {
    summary,
    recentCustomers,
    pendingBeneficiaries,
    pendingTransactions,
    accountStatistics,
    recentActivity,
  }
}
