import httpClient from './httpClient'

const unwrapResponse = (response) => {
  let source = response

  while (source?.data && source.data !== source) {
    source = source.data
  }

  return source
}

const getCollection = (response, keys = []) => {
  const source = unwrapResponse(response)

  if (Array.isArray(source)) {
    return source
  }

  if (Array.isArray(source?.content)) {
    return source.content
  }

  for (const key of keys) {
    if (Array.isArray(source?.[key])) {
      return source[key]
    }
  }

  return []
}

const getFirstValue = (...values) =>
  values.find((value) => value || value === 0) ?? ''

const isSameDay = (value, date = new Date()) => {
  if (!value) {
    return false
  }

  const parsedDate = new Date(value)

  return !Number.isNaN(parsedDate.getTime()) && parsedDate.toDateString() === date.toDateString()
}

const isPendingStatus = (status) => {
  const normalizedStatus = (status || '').toString().trim().toUpperCase()

  return Boolean(normalizedStatus) && !['APPROVED', 'COMPLETED', 'REJECTED', 'FAILED'].includes(normalizedStatus)
}

const getCustomerAccounts = (customer) =>
  getCollection(customer, ['accounts', 'accountDetails'])

const getAccountBalance = (account) =>
  Number(getFirstValue(
    account.balance,
    account.availableBalance,
    account.currentBalance,
    account.accountBalance,
    account.initialBalance,
    0,
  ))

const fetchAllCustomers = async () => {
  const pageSize = 100
  const firstResponse = await httpClient.get('/api/customers', {
    params: {
      page: 0,
      size: pageSize,
    },
  })
  const firstPage = unwrapResponse(firstResponse)
  const totalPages = Math.max(1, Number(firstPage?.totalPages || 1))

  if (totalPages === 1) {
    return getCollection(firstResponse, ['customers'])
  }

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      httpClient.get('/api/customers', {
        params: {
          page: index + 1,
          size: pageSize,
        },
      }),
    ),
  )
  return [firstResponse, ...remainingPages]
    .flatMap((response) => getCollection(response, ['customers']))
}

const fetchEmployeeTransactions = async () => {
  const response = await httpClient.get('/api/employee/transactions')

  return getCollection(response, ['transactions'])
}

const fetchPendingBeneficiaries = async () =>
  httpClient
    .get('/api/employee/beneficiaries/pending')
    .then((response) => getCollection(response, ['beneficiaries', 'requests', 'pendingBeneficiaries']))

export const fetchEmployeeDashboard = async () => {
  const sourceNames = ['customers', 'beneficiaries', 'transactions']
  const results = await Promise.allSettled([
    fetchAllCustomers(),
    fetchPendingBeneficiaries(),
    fetchEmployeeTransactions(),
  ])
  const failures = results
    .map((result, index) => result.status === 'rejected'
      ? `${sourceNames[index]}: ${result.reason?.message || 'request failed'}`
      : '')
    .filter(Boolean)

  if (failures.length === results.length) {
    throw new Error(`Unable to load employee dashboard. ${failures.join('; ')}`)
  }

  const customers = results[0].status === 'fulfilled' ? results[0].value : []
  const pendingBeneficiaries = results[1].status === 'fulfilled' ? results[1].value : []
  const transactions = results[2].status === 'fulfilled' ? results[2].value : []
  const pendingTransactions = transactions.filter((transaction) =>
    isPendingStatus(getFirstValue(transaction.status, transaction.transferStatus, transaction.approvalStatus)),
  )
  const accounts = customers.flatMap(getCustomerAccounts)
  const summary = {
    totalCustomers: customers.length,
    totalAccounts: accounts.length,
    totalBalance: accounts.reduce((total, account) => total + getAccountBalance(account), 0),
    pendingBeneficiaries: pendingBeneficiaries.length,
    pendingTransactions: pendingTransactions.length,
    todayCustomers: customers.filter((customer) =>
      isSameDay(getFirstValue(customer.createdDate, customer.createdAt, customer.createdOn, customer.created_on, customer.created_date)),
    ).length,
  }

  return {
    summary,
    warning: failures.length > 0
      ? `Some dashboard data could not be loaded (${failures.join('; ')}).`
      : '',
  }
}
