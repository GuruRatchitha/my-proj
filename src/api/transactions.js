import httpClient from './httpClient'
import { getStoredCurrentUser, getStoredUserId } from './currentUser'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
})

const toTitleCase = (value = '') =>
  value
    .toString()
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

const formatTransactionDate = (transactionDate) => {
  if (!transactionDate) {
    return '-'
  }

  const date = new Date(transactionDate)
  return Number.isNaN(date.getTime()) ? '-' : dateFormatter.format(date)
}

const getTransactionTone = (transaction) => {
  const purpose = transaction.purpose?.toLowerCase() || ''
  const beneficiaryName = transaction.beneficiaryName?.toLowerCase() || ''

  if (purpose.includes('salary') || beneficiaryName.includes('stripe')) {
    return 'credit'
  }

  return 'debit'
}

const getDashboardIcon = (transaction) => {
  if (transaction.transferStatus === 'PENDING') {
    return 'arrow-left-right'
  }

  return getTransactionTone(transaction) === 'credit' ? 'arrow-down' : 'arrow-up-right'
}

const getAccountBalance = (transaction) => {
  const balance =
    transaction.accountBalance ??
    transaction.currentBalance ??
    transaction.availableBalance ??
    transaction.balance

  return balance || balance === 0 ? Number(balance) : null
}

const getAccountStatus = (account) => getFirstValue(account.status, account.accountStatus, 'ACTIVE')

const getCurrentUserId = async () => {
  const currentUser = getStoredCurrentUser()
  const userId = getStoredUserId() || currentUser?.userId || ''

  if (!userId) {
    throw new Error('Unable to identify the current user. Please sign in again.')
  }

  return userId
}

const getFirstValue = (...values) =>
  values.find((value) => value || value === 0) ?? ''

const normalizeTransactionCollection = (response) => {
  if (Array.isArray(response?.transactions)) {
    return response.transactions
  }

  if (Array.isArray(response?.data)) {
    return response.data
  }

  if (Array.isArray(response)) {
    return response
  }

  return []
}

const normalizeDashboardAccount = (account) => {
  const accountNumber = getFirstValue(account.accountNumber, account.id, account.accountNo, account.number)
  const accountType = getFirstValue(account.accountType, account.type, account.productType, 'Account')
  const balance = Number(
    getFirstValue(account.availableBalance, account.currentBalance, account.balance, account.accountBalance, 0),
  )

  return {
    id: accountNumber,
    accountNumber,
    type: toTitleCase(accountType),
    accountType: toTitleCase(accountType),
    amount: currencyFormatter.format(balance),
    balance,
    status: getAccountStatus(account),
    monthlyChange: Number(account.monthlyChange || 0),
  }
}

const isCompletedTransaction = (transaction) => {
  const status = getFirstValue(transaction.transferStatus, transaction.transactionStatus, transaction.status)
    .toString()
    .trim()
    .toUpperCase()

  return ['APPROVED', 'COMPLETED'].includes(status)
}

const isPendingTransaction = (transaction) => {
  const status = getFirstValue(transaction.transferStatus, transaction.transactionStatus, transaction.status)
    .toString()
    .trim()
    .toUpperCase()

  return Boolean(status) && !['APPROVED', 'COMPLETED', 'REJECTED', 'FAILED'].includes(status)
}

export const normalizeTransaction = (transaction) => {
  const tone = getTransactionTone(transaction)
  const rawAmount = Number(transaction.amount || 0)
  const amount = currencyFormatter.format(rawAmount)
  const transactionReference = getFirstValue(
    transaction.transactionReference,
    transaction.reference,
    transaction.paymentTransactionId,
    transaction.transactionId,
    transaction.id,
  )
  const transactionDate = getFirstValue(transaction.transactionDate, transaction.paymentDate, transaction.createdAt)
  const receiverName = getFirstValue(
    transaction.beneficiaryName,
    transaction.receiverName,
    transaction.creditorName,
    transaction.toAccountName,
  )
  const accountNumber = getFirstValue(
    transaction.accountNumber,
    transaction.sourceAccountNumber,
    transaction.senderAccountNumber,
    transaction.fromAccountNumber,
  )
  const accountType = getFirstValue(transaction.accountType, transaction.sourceAccountType, transaction.type, 'Transfer')
  const status = getFirstValue(transaction.transferStatus, transaction.transactionStatus, transaction.status)
  const remarks = getFirstValue(transaction.purpose, transaction.remarks, transaction.description)

  return {
    id: transactionReference,
    date: formatTransactionDate(transactionDate),
    receiverName,
    accountNumber,
    accountType,
    accountBalance: getAccountBalance(transaction),
    rawAmount,
    signedAmount: tone === 'credit' ? rawAmount : -rawAmount,
    currency: transaction.currency || 'USD',
    amount: tone === 'credit' ? `+${amount}` : `-${amount}`,
    type: toTitleCase(accountType),
    status: toTitleCase(status),
    remarks,
    tone,
    icon: getDashboardIcon(transaction),
    detail: `${transactionReference} - ${remarks}`,
  }
}

export const fetchDashboardSummary = async () => {
  const userId = await getCurrentUserId()
  const customer = await httpClient.get(`/api/customers/${encodeURIComponent(userId)}`)
  const accounts = Array.isArray(customer?.accounts) ? customer.accounts : []
  let transactions = []

  try {
    const response = await httpClient.get('/api/transactions')
    transactions = normalizeTransactionCollection(response)
  } catch (error) {
    console.error('Unable to load customer transactions.', error)
  }

  return {
    totalBalance: accounts.reduce(
      (total, account) => total + Number(getFirstValue(account.balance, account.availableBalance, account.currentBalance, 0)),
      0,
    ),
    accountCount: accounts.length,
    completedTransactions: transactions.filter(isCompletedTransaction).length,
    pendingTransactions: transactions.filter(isPendingTransaction).length,
    accounts: accounts.map(normalizeDashboardAccount),
  }
}

export const fetchTransactions = async (limit) => {
  await getCurrentUserId()

  const endpoint = '/api/transactions'
  const response = await httpClient.get(endpoint)
  const transactions = normalizeTransactionCollection(response)
  const limitedTransactions = limit || limit === 0 ? transactions.slice(0, limit) : transactions

  return limitedTransactions.map(normalizeTransaction)
}
