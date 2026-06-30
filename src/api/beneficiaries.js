import { getStoredUserId } from './currentUser'
import httpClient from './httpClient'

export const createBeneficiary = async (beneficiary) => {
  const userId = getStoredUserId()

  return httpClient.post('/api/beneficiaries', beneficiary, {
    headers: {
      'X-User-Id': userId,
    },
  })
}

export const fetchBeneficiaries = async () => {
  const userId = getStoredUserId()

  return httpClient.get('/api/beneficiaries', {
    headers: {
      'X-User-Id': userId,
    },
  })
}

export const fetchPendingBeneficiaries = async () =>
  httpClient.get('/api/employee/beneficiaries/pending')

export const fetchEmployeeBeneficiariesByStatus = async (status) =>
  httpClient.get(`/api/employee/beneficiaries/${status}`)

export const approveBeneficiary = async (beneficiaryId) =>
  httpClient.put(`/api/employee/beneficiaries/${beneficiaryId}/approve`, {
    status: 'APPROVED',
  })

export const rejectBeneficiary = async (beneficiaryId, reason) =>
  httpClient.put(`/api/employee/beneficiaries/${beneficiaryId}/reject`, {
    status: 'REJECTED',
    reason,
    rejectionReason: reason,
  })
