import axios from 'axios'
import { getStoredUserId } from './currentUser'

const API_BASE_URL = 'http://localhost:8080'

const httpClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

httpClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  const userId = getStoredUserId()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  if (userId) {
    config.headers['X-User-Id'] = userId
  }

  return config
}, (error) => {
  return Promise.reject(error)
})

httpClient.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Something went wrong. Please try again.'

    return Promise.reject({
      message,
      status: error.response?.status,
      data: error.response?.data,
    })
  },
)

export default httpClient
