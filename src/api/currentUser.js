export const getStoredUserId = () => localStorage.getItem('user_id') || localStorage.getItem('userId') || ''

export const getStoredRoleName = () => {
  const currentUser = getStoredCurrentUser()
  return currentUser?.roleName || localStorage.getItem('roleName') || ''
}

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
    localStorage.setItem('user_id', String(userId))
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
    createdDate: user.createdDate || user.created_date || user.user?.createdDate || user.user?.created_date || user.data?.createdDate || user.data?.created_date || '',
    aadharNumber: user.aadharNumber || user.aadhar_number || user.user?.aadharNumber || user.user?.aadhar_number || user.data?.aadharNumber || user.data?.aadhar_number || '',
    address: user.address || user.user?.address || user.data?.address || '',
    panCardNumber: user.panCardNumber || user.pan_card_number || user.user?.panCardNumber || user.user?.pan_card_number || user.data?.panCardNumber || user.data?.pan_card_number || '',
    password: user.password || user.user?.password || user.data?.password || '',
    phoneNumber: user.phoneNumber || user.phone_number || user.user?.phoneNumber || user.user?.phone_number || user.data?.phoneNumber || user.data?.phone_number || '',
  }

  localStorage.setItem('currentUser', JSON.stringify(currentUser))
  localStorage.setItem('created_date', currentUser.createdDate)
  localStorage.setItem('role_id', String(currentUser.roleId || ''))
  localStorage.setItem('user_id', currentUser.userId)
  localStorage.setItem('aadhar_number', currentUser.aadharNumber)
  localStorage.setItem('address', currentUser.address)
  localStorage.setItem('email', currentUser.email)
  localStorage.setItem('pan_card_number', currentUser.panCardNumber)
  localStorage.setItem('password', currentUser.password)
  localStorage.setItem('phone_number', currentUser.phoneNumber)
  localStorage.setItem('user_name', currentUser.userName)
  localStorage.setItem('roleName', currentUser.roleName)

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
  localStorage.removeItem('user_id')
}

export const clearStoredCurrentUser = () => {
  localStorage.removeItem('currentUser')
  localStorage.removeItem('username')
  localStorage.removeItem('created_date')
  localStorage.removeItem('role_id')
  localStorage.removeItem('aadhar_number')
  localStorage.removeItem('address')
  localStorage.removeItem('email')
  localStorage.removeItem('pan_card_number')
  localStorage.removeItem('password')
  localStorage.removeItem('phone_number')
  localStorage.removeItem('user_name')
  localStorage.removeItem('roleName')
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
