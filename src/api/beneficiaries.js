import { getStoredUserId } from './currentUser'
import httpClient from './httpClient'

export const createBeneficiary = async (beneficiary) => {
  const userId = getStoredUserId() || '1'

  return httpClient.post('/api/beneficiaries?=', beneficiary, {
    headers: {
      'X-User-Id': userId,
    },
  })
}

export const fetchBeneficiaries = async () => {
  const userId = getStoredUserId() || '1'

  return httpClient.get('/api/beneficiaries?=', {
    headers: {
      'X-User-Id': userId,
    },
  })
}
