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
    monthlyChange: Number(account.monthlyChange || 0),
  }
}

export const normalizeTransaction = (transaction) => {
  const tone = getTransactionTone(transaction)
  const rawAmount = Number(transaction.amount || 0)
  const amount = currencyFormatter.format(rawAmount)

  return {
    id: transaction.transactionReference,
    date: formatTransactionDate(transaction.transactionDate),
    receiverName: transaction.beneficiaryName,
    accountNumber: transaction.accountNumber,
    accountType: transaction.accountType,
    accountBalance: getAccountBalance(transaction),
    rawAmount,
    signedAmount: tone === 'credit' ? rawAmount : -rawAmount,
    currency: transaction.currency || 'USD',
    amount: tone === 'credit' ? `+${amount}` : `-${amount}`,
    type: toTitleCase(transaction.accountType),
    status: toTitleCase(transaction.transferStatus),
    remarks: transaction.purpose,
    tone,
    icon: getDashboardIcon(transaction),
    detail: `${transaction.transactionReference} - ${transaction.purpose}`,
  }
}

export const fetchDashboardSummary = async () => {
  const params = new URLSearchParams()
  const userId = await getCurrentUserId()

  params.set('userId', userId)

  const endpoint = `/api/dashboard/summary?${params.toString()}`
  console.log('fetchDashboardSummary userId:', userId)
  console.log('fetchDashboardSummary endpoint:', endpoint)

  const response = await httpClient.get(endpoint)
  const accounts = Array.isArray(response?.accounts) ? response.accounts : []

  console.log('fetchDashboardSummary accounts returned:', accounts.length)

  return {
    totalBalance: Number(response?.totalBalance || 0),
    accountCount: Number(response?.accountCount || accounts.length || 0),
    completedTransactions: Number(response?.completedTransactions || 0),
    pendingTransactions: Number(response?.pendingTransactions || 0),
    accounts: accounts.map(normalizeDashboardAccount),
  }
}

export const fetchTransactions = async (limit) => {
  const params = new URLSearchParams()
  const userId = await getCurrentUserId()

  params.set('userId', userId)

  if (limit || limit === 0) {
    params.set('limit', limit)
  }

  const endpoint = `/api/dashboard/transactions?${params.toString()}`
  console.log('fetchTransactions userId:', userId)
  console.log('fetchTransactions endpoint:', endpoint)

  const response = await httpClient.get(endpoint)
  const transactions = Array.isArray(response?.transactions) ? response.transactions : []

  console.log('fetchTransactions returned:', transactions.length)

  return transactions.map(normalizeTransaction)
}
