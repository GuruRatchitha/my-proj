import httpClient from './httpClient'
import { getStoredCurrentUser, getStoredUserId } from './currentUser'
import { fetchBeneficiaries } from './beneficiaries'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

const CUSTOMER_TRANSACTIONS_ENDPOINT = '/api/transactions'

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
  const statusAndDirection = [
    transaction.status,
    transaction.transferStatus,
    transaction.transactionStatus,
    transaction.direction,
    transaction.transactionDirection,
    transaction.movementType,
    transaction.debitCreditIndicator,
    transaction.creditDebitIndicator,
    transaction.transactionType,
    transaction.entryType,
  ]
    .filter(Boolean)
    .join(' ')
    .toUpperCase()

  if (statusAndDirection.includes('CREDIT')) {
    return 'credit'
  }

  if (statusAndDirection.includes('DEBIT')) {
    return 'debit'
  }

  const purpose = transaction.purpose?.toLowerCase() || ''
  const beneficiaryName = transaction.beneficiaryName?.toLowerCase() || ''

  if (purpose.includes('INVESTMENT') || beneficiaryName.includes('stripe')) {
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

const normalizeCustomerAccounts = (customer) => {
  if (Array.isArray(customer?.accounts)) {
    return customer.accounts
  }

  if (Array.isArray(customer?.customer?.accounts)) {
    return customer.customer.accounts
  }

  if (Array.isArray(customer?.data?.accounts)) {
    return customer.data.accounts
  }

  return []
}

const getTransactionReference = (transaction) => getFirstValue(
  transaction.transactionReference,
  transaction.reference,
  transaction.paymentTransactionId,
  transaction.transactionId,
  transaction.id,
).toString()

const getTransactionDate = (transaction) => getFirstValue(
  transaction.transactionDate,
  transaction.paymentDate,
  transaction.createdAt,
  transaction.postedAt,
  transaction.timestamp,
)

const getTransactionSortTime = (transaction) => {
  const parsedTime = new Date(getTransactionDate(transaction)).getTime()
  return Number.isNaN(parsedTime) ? 0 : parsedTime
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

const getTransactionStatuses = (transaction) => [
  transaction.status,
  transaction.currentStatus,
  transaction.transferStatus,
  transaction.transactionStatus,
  transaction.paymentStatus,
  transaction.processingStatus,
  transaction.approvalStatus,
  transaction.paymentDetails?.status,
  transaction.paymentDetails?.transactionStatus,
  transaction.paymentDetails?.paymentStatus,
  transaction.paymentDetails?.processingStatus,
  transaction.paymentDetails?.approvalStatus,
]
  .filter(Boolean)
  .map((status) => status.toString().trim().toUpperCase().replace(/[\s-]+/g, '_'))

const hasStatus = (statuses, expectedStatuses) => statuses.some((status) =>
  expectedStatuses.some((expectedStatus) =>
    status === expectedStatus || status.endsWith(`_${expectedStatus}`),
  ),
)

const clearedStatuses = [
  'APPROVED',
  'COMPLETED',
  'COMPLETE',
  'SETTLED',
  'ACSC',
  'DEBITED',
  'CREDITED',
  'REVERTED',
  'RETURNED',
]
const awaitingReviewStatuses = ['PENDING', 'HOLD', 'ON_HOLD']
const customerHistoryStatuses = [
  'ACCEPTED',
  'PAYMENT_ACCEPTED',
  'PROCESSING',
  'COMPLETED',
  'COMPLETE',
  'SETTLED',
  'ACSC',
  'DEBITED',
  'CREDITED',
  'REVERTED',
  'RETURNED',
]

const isCompletedTransaction = (transaction) =>
  hasStatus(getTransactionStatuses(transaction), clearedStatuses)

const isPendingTransaction = (transaction) => {
  const statuses = getTransactionStatuses(transaction)

  return !hasStatus(statuses, clearedStatuses) && hasStatus(statuses, awaitingReviewStatuses)
}

// APPROVED can be assigned when the customer confirms a payment, so it is not
// sufficient evidence of employee acceptance. Keep those requests in the
// employee queue until ACCEPTED (or a later processing status) is returned.
const isCustomerHistoryTransaction = (transaction) =>
  hasStatus(getTransactionStatuses(transaction), customerHistoryStatuses)

const findMatchingBeneficiary = (transaction, beneficiaries) => {
  const beneficiaryId = getFirstValue(
    transaction.beneficiaryId,
    transaction.receiverId,
    transaction.creditorId,
  )
  const beneficiaryName = getFirstValue(
    transaction.beneficiaryName,
    transaction.receiverName,
    transaction.creditorName,
  ).toString().trim().toLowerCase()

  return beneficiaries.find((beneficiary) => {
    const matchesId = beneficiaryId && String(
      getFirstValue(beneficiary.id, beneficiary.beneficiaryId),
    ) === String(beneficiaryId)
    const matchesName = beneficiaryName && getFirstValue(
      beneficiary.beneficiaryName,
      beneficiary.name,
    ).toString().trim().toLowerCase() === beneficiaryName

    return matchesId || matchesName
  }) || {}
}

export const normalizeTransaction = (transaction, beneficiaries = [], index = 0) => {
  const paymentDetails = transaction.paymentDetails || transaction.payment || {}
  const tone = getTransactionTone(transaction)
  const rawAmount = Math.abs(Number(transaction.amount || 0))
  const amount = currencyFormatter.format(rawAmount)
  const transactionReference = getTransactionReference(transaction)
  const transactionDate = getTransactionDate(transaction)
  const receiverName = getFirstValue(
    transaction.beneficiaryName,
    transaction.receiverName,
    transaction.creditorName,
    transaction.toAccountName,
  )
  const receiverDetails = transaction.receiverDetails || transaction.receiver ||
    transaction.beneficiaryDetails || transaction.beneficiary || {}
  const matchingBeneficiary = findMatchingBeneficiary(transaction, beneficiaries)
  const accountNumber = getFirstValue(
    transaction.beneficiaryAccountNumber,
    transaction.receiverAccountNumber,
    transaction.creditorAccountNumber,
    transaction.toAccountNumber,
    receiverDetails.accountNumber,
    receiverDetails.receiverAccountNumber,
    matchingBeneficiary.accountNumber,
    matchingBeneficiary.beneficiaryAccountNumber,
  )
  const accountType = getFirstValue(transaction.accountType, transaction.sourceAccountType, transaction.type, 'Transfer')
  const ledgerEntryId = getFirstValue(
    transaction.ledgerEntryId,
    transaction.entryId,
    transaction.historyId,
    transaction.settlementTransactionId,
  )
  const remarks = getFirstValue(transaction.purpose, transaction.remarks, transaction.description)
  const rejectionReason = getFirstValue(
    transaction.rejectionReason,
    transaction.rejectedReason,
    transaction.rejectReason,
    transaction.rejectionMessage,
    transaction.statusReason,
    paymentDetails.rejectionReason,
    paymentDetails.rejectedReason,
    paymentDetails.rejectReason,
    paymentDetails.reason,
  )

  return {
    id: transactionReference,
    rowKey: ledgerEntryId || `${transactionReference}-${tone}-${transactionDate || 'undated'}-${index}`,
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
    status: tone === 'credit' ? 'Credited' : 'Debited',
    rejectionReason,
    remarks,
    tone,
    icon: getDashboardIcon(transaction),
    detail: `${transactionReference} - ${remarks}`,
  }
}

export const fetchDashboardSummary = async () => {
  const userId = await getCurrentUserId()
  const customer = await httpClient.get(`/api/customers/${encodeURIComponent(userId)}`)
  const accounts = normalizeCustomerAccounts(customer)
  let transactions = []

  try {
    const response = await httpClient.get(CUSTOMER_TRANSACTIONS_ENDPOINT)
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

  const [transactionResult, beneficiaryResult] = await Promise.allSettled([
    httpClient.get(CUSTOMER_TRANSACTIONS_ENDPOINT),
    fetchBeneficiaries(),
  ])

  if (transactionResult.status === 'rejected') {
    throw transactionResult.reason
  }

  const response = transactionResult.value
  const beneficiaries = beneficiaryResult.status === 'fulfilled' &&
    Array.isArray(beneficiaryResult.value)
    ? beneficiaryResult.value
    : []
  const transactions = [...normalizeTransactionCollection(response)]
    .filter(isCustomerHistoryTransaction)
    .sort((first, second) => getTransactionSortTime(second) - getTransactionSortTime(first))
  const limitedTransactions = limit || limit === 0 ? transactions.slice(0, limit) : transactions

  return limitedTransactions.map((transaction, index) => normalizeTransaction(transaction, beneficiaries, index))
}
