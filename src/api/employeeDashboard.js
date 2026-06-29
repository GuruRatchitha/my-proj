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

const getAccountType = (account) =>
  getFirstValue(account.accountType, account.account_type, account.type, account.productType, 'other')
    .toString()
    .toLowerCase()

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

export const fetchEmployeeDashboardSummary = async () =>
  Promise.all([
    fetchAllCustomers(),
    fetchDashboardPendingBeneficiaries(),
    fetchEmployeeTransactions(),
  ]).then(([customers, pendingBeneficiaries, transactions]) => {
    const accounts = customers.flatMap(getCustomerAccounts)
    const pendingTransactions = transactions.filter((transaction) =>
      isPendingStatus(getFirstValue(transaction.status, transaction.transferStatus, transaction.approvalStatus)),
    )

    return {
      totalCustomers: customers.length,
      totalAccounts: accounts.length,
      totalBalance: accounts.reduce((total, account) => total + getAccountBalance(account), 0),
      pendingBeneficiaries: pendingBeneficiaries.length,
      pendingTransactions: pendingTransactions.length,
      todayCustomers: customers.filter((customer) =>
        isSameDay(getFirstValue(customer.createdDate, customer.createdAt, customer.createdOn, customer.created_on, customer.created_date)),
      ).length,
    }
  })

export const fetchDashboardRecentCustomers = async () =>
  fetchAllCustomers().then((customers) =>
    [...customers]
      .sort((firstCustomer, secondCustomer) =>
        new Date(getFirstValue(secondCustomer.createdDate, secondCustomer.createdAt, 0)) -
        new Date(getFirstValue(firstCustomer.createdDate, firstCustomer.createdAt, 0)),
      )
      .slice(0, 5),
  )

export const fetchDashboardPendingBeneficiaries = async () =>
  httpClient
    .get('/api/employee/beneficiaries/pending')
    .then((response) => getCollection(response, ['beneficiaries', 'requests', 'pendingBeneficiaries']))

export const fetchDashboardPendingTransactions = async () =>
  fetchEmployeeTransactions().then((transactions) =>
    transactions.filter((transaction) =>
      isPendingStatus(getFirstValue(transaction.status, transaction.transferStatus, transaction.approvalStatus)),
    ),
  )

export const fetchDashboardAccountStatistics = async () =>
  fetchAllCustomers().then((customers) =>
    customers
      .flatMap(getCustomerAccounts)
      .reduce((stats, account) => {
        const accountType = getAccountType(account)

        return {
          ...stats,
          [accountType]: Number(stats[accountType] || 0) + 1,
        }
      }, {}),
  )

export const fetchDashboardRecentActivity = async () =>
  Promise.all([
    fetchDashboardRecentCustomers(),
    fetchDashboardPendingBeneficiaries(),
    fetchDashboardPendingTransactions(),
  ]).then(([customers, beneficiaries, transactions]) => [
    ...customers.map((customer) => ({
      id: `customer-${customer.userId || customer.id}`,
      activity: `Customer created: ${customer.userName || customer.name || customer.email || 'Customer'}`,
      createdAt: getFirstValue(customer.createdDate, customer.createdAt),
    })),
    ...beneficiaries.map((beneficiary) => ({
      id: `beneficiary-${beneficiary.beneficiaryId || beneficiary.id || beneficiary.accountNumber}`,
      activity: `Beneficiary pending: ${beneficiary.beneficiaryName || beneficiary.name || 'Beneficiary'}`,
      createdAt: getFirstValue(beneficiary.createdDate, beneficiary.createdAt, beneficiary.requestedDate),
    })),
    ...transactions.map((transaction) => ({
      id: `transaction-${transaction.transactionReference || transaction.transactionId || transaction.id}`,
      activity: `Transaction pending: ${transaction.transactionReference || transaction.transactionId || 'Transaction'}`,
      createdAt: getFirstValue(transaction.paymentDate, transaction.transactionDate, transaction.createdAt),
    })),
  ]
    .sort((firstActivity, secondActivity) =>
      new Date(secondActivity.createdAt || 0) - new Date(firstActivity.createdAt || 0),
    )
    .slice(0, 5))

export const fetchEmployeeDashboard = async () => {
  const sourceNames = ['customers', 'beneficiaries', 'transactions']
  const results = await Promise.allSettled([
    fetchAllCustomers(),
    fetchDashboardPendingBeneficiaries(),
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
  const recentCustomers = [...customers]
    .sort((firstCustomer, secondCustomer) =>
      new Date(getFirstValue(secondCustomer.createdDate, secondCustomer.createdAt, 0)) -
      new Date(getFirstValue(firstCustomer.createdDate, firstCustomer.createdAt, 0)),
    )
    .slice(0, 5)
  const accountStatistics = accounts.reduce((stats, account) => {
    const accountType = getAccountType(account)

    return {
      ...stats,
      [accountType]: Number(stats[accountType] || 0) + 1,
    }
  }, {})
  const recentActivity = [
    ...recentCustomers.map((customer) => ({
      id: `customer-${customer.userId || customer.id}`,
      activity: `Customer created: ${customer.userName || customer.name || customer.email || 'Customer'}`,
      createdAt: getFirstValue(customer.createdDate, customer.createdAt),
    })),
    ...pendingBeneficiaries.map((beneficiary) => ({
      id: `beneficiary-${beneficiary.beneficiaryId || beneficiary.id || beneficiary.accountNumber}`,
      activity: `Beneficiary pending: ${beneficiary.beneficiaryName || beneficiary.name || 'Beneficiary'}`,
      createdAt: getFirstValue(beneficiary.createdDate, beneficiary.createdAt, beneficiary.requestedDate),
    })),
    ...pendingTransactions.map((transaction) => ({
      id: `transaction-${transaction.transactionReference || transaction.transactionId || transaction.id}`,
      activity: `Transaction pending: ${transaction.transactionReference || transaction.transactionId || 'Transaction'}`,
      createdAt: getFirstValue(transaction.paymentDate, transaction.transactionDate, transaction.createdAt),
    })),
  ]
    .sort((firstActivity, secondActivity) =>
      new Date(secondActivity.createdAt || 0) - new Date(firstActivity.createdAt || 0),
    )
    .slice(0, 5)
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
    recentCustomers,
    pendingBeneficiaries,
    pendingTransactions,
    accountStatistics,
    recentActivity,
    warning: failures.length > 0
      ? `Some dashboard data could not be loaded (${failures.join('; ')}).`
      : '',
  }
}
