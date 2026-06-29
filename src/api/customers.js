import httpClient from './httpClient'

export const fetchCustomers = async ({ page = 0, size = 10, search = '' } = {}) => {
  return httpClient.get('/api/customers', {
    params: {
      page,
      size,
      ...(search ? { search } : {}),
    },
  })
}

export const createCustomer = async (customerPayload) => {
  return httpClient.post('/api/customers', customerPayload)
}

export const fetchCustomerById = async (userId) => {
  return httpClient.get(`/api/customers/${encodeURIComponent(userId)}`)
}

export const updateCustomer = async (userId, customerPayload) => {
  return httpClient.put(`/api/customers/${encodeURIComponent(userId)}`, customerPayload)
}
