import httpClient from './httpClient'

export const makePayment = async (paymentPayload) => {
  return httpClient.post('/api/payments', paymentPayload)
}
