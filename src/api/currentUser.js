export const getStoredUserId = () => localStorage.getItem('userId') || ''

export const getStoredCurrentUser = () => {
  const storedCurrentUser = localStorage.getItem('currentUser')

  if (!storedCurrentUser) {
    return null
  }

  try {
    return JSON.parse(storedCurrentUser)
  } catch {
    localStorage.removeItem('currentUser')
    return null
  }
}

export const storeUserId = (userId) => {
  if (userId || userId === 0) {
    localStorage.setItem('userId', String(userId))
  }
}

export const storeCurrentUser = (user) => {
  if (!user) {
    localStorage.removeItem('currentUser')
    return
  }

  const userId = getUserIdFromData(user)
  const userName =
    user.userName ||
    user.username ||
    user.name ||
    user.user?.userName ||
    user.user?.username ||
    user.data?.userName ||
    user.data?.username ||
    ''

  const currentUser = {
    userId: userId || userId === 0 ? String(userId) : '',
    userName,
    email: user.email || user.user?.email || user.data?.email || '',
    roleId: user.roleId || user.user?.roleId || user.data?.roleId || '',
    roleName: user.roleName || user.user?.roleName || user.data?.roleName || '',
  }

  localStorage.setItem('currentUser', JSON.stringify(currentUser))

  if (currentUser.userId) {
    storeUserId(currentUser.userId)
  }

  if (currentUser.userName) {
    localStorage.setItem('username', currentUser.userName)
  } else {
    localStorage.removeItem('username')
  }
}

export const clearStoredUserId = () => {
  localStorage.removeItem('userId')
}

export const clearStoredCurrentUser = () => {
  localStorage.removeItem('currentUser')
  localStorage.removeItem('username')
  clearStoredUserId()
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
