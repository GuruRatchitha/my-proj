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

export const approveBeneficiary = async ({ userId, accountNumber, routingNumber }) =>
  httpClient.put(`/api/employee/beneficiaries/${userId}/${accountNumber}/${routingNumber}/approve`)

export const rejectBeneficiary = async ({ userId, accountNumber, routingNumber }) =>
  httpClient.put(`/api/employee/beneficiaries/${userId}/${accountNumber}/${routingNumber}/reject`)
