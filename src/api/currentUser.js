export const getStoredUserId = () => localStorage.getItem('userId') || ''

export const storeUserId = (userId) => {
  if (userId || userId === 0) {
    localStorage.setItem('userId', String(userId))
  }
}

export const clearStoredUserId = () => {
  localStorage.removeItem('userId')
}

export const getUserIdFromData = (data) =>
  data?.userId ||
  data?.userid ||
  data?.user_id ||
  data?.id ||
  data?.user?.userId ||
  data?.user?.userid ||
  data?.user?.user_id ||
  data?.user?.id ||
  data?.data?.userId ||
  data?.data?.userid ||
  data?.data?.user_id ||
  data?.data?.id ||
  data?.data?.user?.userId ||
  data?.data?.user?.userid ||
  data?.data?.user?.user_id ||
  data?.data?.user?.id

export const getUserIdFromToken = (token) => {
  if (!token) {
    return ''
  }

  const [, payload] = token.split('.')

  if (!payload) {
    return ''
  }

  try {
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decodedPayload = JSON.parse(atob(normalizedPayload))

    return getUserIdFromData(decodedPayload) || decodedPayload.sub || ''
  } catch {
    return ''
  }
}
