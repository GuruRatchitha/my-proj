import httpClient from './httpClient'

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
})

const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const getFirstValue = (...values) =>
  values.find((value) => value || value === 0) ?? ''

const toTitleCase = (value = '') =>
  value
    .toString()
    .toLowerCase()
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

const normalizeDateInput = (value) => {
  if (typeof value !== 'string') {
    return value
  }

  return value.replace(/(\.\d{3})\d+/, '$1')
}

export const formatSettlementCurrency = (value) => {
  const amount = Number(value || 0)
  return currencyFormatter.format(Number.isNaN(amount) ? 0 : amount)
}

export const formatSettlementDateTime = (value) => {
  if (!value) {
    return '-'
  }

  const date = new Date(normalizeDateInput(value))
  return Number.isNaN(date.getTime()) ? '-' : dateTimeFormatter.format(date)
}

const getDateValue = (value) => {
  if (!value) {
    return 0
  }

  const date = new Date(normalizeDateInput(value))
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

const getNormalizedSettlementStatus = (value = '') =>
  value.toString().trim().toUpperCase().replace(/[\s-]+/g, '_')

const getDisplaySettlementStatus = (transaction) => {
  const statusValues = [transaction.transactionType, transaction.status].filter(Boolean)
  const settlementStatus = statusValues.find((value) => {
    const normalizedValue = getNormalizedSettlementStatus(value)
    return normalizedValue.includes('DEBIT') || normalizedValue.includes('CREDIT')
  })
  const statusText = settlementStatus || getFirstValue(transaction.status, transaction.transactionType)
  const normalizedStatus = getNormalizedSettlementStatus(statusText)

  if (normalizedStatus.includes('DEBIT')) {
    return 'Debited From Settlement'
  }

  if (normalizedStatus.includes('CREDIT')) {
    return 'Credited To Settlement'
  }

  return statusText || '-'
}

const getSettlementAccountNumber = (transaction) => {
  if (transaction.accountNumber) {
    return transaction.accountNumber
  }

  const displayStatus = getDisplaySettlementStatus(transaction)

  if (displayStatus === 'Debited From Settlement') {
    return transaction.beneficiaryAccountNumber || '-'
  }

  if (displayStatus === 'Credited To Settlement') {
    return transaction.senderAccountNumber || '-'
  }

  return transaction.senderAccountNumber || transaction.beneficiaryAccountNumber || '-'
}

const getTransactionSortValue = (transaction) => {
  if (transaction.createdDateValue) {
    return transaction.createdDateValue
  }

  const numericId = Number(transaction.id)
  if (!Number.isNaN(numericId)) {
    return numericId
  }

  const numericPaymentId = Number(transaction.paymentId)
  return Number.isNaN(numericPaymentId) ? 0 : numericPaymentId
}

const compareSettlementTransactions = (firstTransaction, secondTransaction) => {
  const sortDifference =
    getTransactionSortValue(secondTransaction) - getTransactionSortValue(firstTransaction)

  if (sortDifference !== 0) {
    return sortDifference
  }

  return String(secondTransaction.id || secondTransaction.paymentId || '').localeCompare(
    String(firstTransaction.id || firstTransaction.paymentId || ''),
    undefined,
    { numeric: true },
  )
}

const normalizeSettlementAccountResponse = (response) =>
  response?.settlementAccount || response?.account || response?.data || response || {}

const normalizeSettlementTransactionCollection = (response) => {
  if (Array.isArray(response?.content)) {
    return response.content
  }

  if (Array.isArray(response?.transactions)) {
    return response.transactions
  }

  if (Array.isArray(response?.settlementTransactions)) {
    return response.settlementTransactions
  }

  if (Array.isArray(response?.data)) {
    return response.data
  }

  if (Array.isArray(response?.data?.content)) {
    return response.data.content
  }

  if (Array.isArray(response?.data?.transactions)) {
    return response.data.transactions
  }

  if (Array.isArray(response?.data?.settlementTransactions)) {
    return response.data.settlementTransactions
  }

  if (Array.isArray(response)) {
    return response
  }

  return []
}

export const normalizeSettlementAccount = (account = {}) => {
  const currentBalance = getFirstValue(account.currentBalance, account.balance, account.availableBalance, 0)

  return {
    accountNumber: getFirstValue(account.accountNumber, account.settlementAccountNumber, account.number),
    accountName: getFirstValue(account.accountName, account.name, account.accountHolderName, 'Settlement Account'),
    currentBalance,
    formattedCurrentBalance: formatSettlementCurrency(currentBalance),
    accountType: toTitleCase(getFirstValue(account.accountType, account.type, 'Settlement')),
    lastUpdated: getFirstValue(account.lastUpdated, account.updatedAt, account.updatedDate, account.modifiedAt),
    formattedLastUpdated: formatSettlementDateTime(
      getFirstValue(account.lastUpdated, account.updatedAt, account.updatedDate, account.modifiedAt),
    ),
  }
}

export const normalizeSettlementTransaction = (transaction = {}, index = 0) => {
  const amount = getFirstValue(transaction.amount, transaction.settlementAmount, transaction.transactionAmount, 0)
  const status = toTitleCase(getFirstValue(transaction.status))
  const transactionType = toTitleCase(getFirstValue(transaction.transactionType))
  const createdDate = getFirstValue(transaction.createdDate, transaction.createdAt, transaction.createdOn)
  const updatedDate = getFirstValue(transaction.updatedDate, transaction.updatedAt, transaction.modifiedAt)

  return {
    id: getFirstValue(
      transaction.settlementTransactionId,
      transaction.id,
      transaction.transactionId,
      `SETTLEMENT-${index + 1}`,
    ),
    paymentId: getFirstValue(transaction.paymentId, transaction.paymentID, transaction.paymentReference),
    senderAccountNumber: getFirstValue(
      transaction.senderAccountNumber,
      transaction.debtorAccountNumber,
      transaction.fromAccountNumber,
    ),
    beneficiaryAccountNumber: getFirstValue(
      transaction.beneficiaryAccountNumber,
      transaction.receiverAccountNumber,
      transaction.creditorAccountNumber,
      transaction.toAccountNumber,
    ),
    settlementAccountNumber: getFirstValue(
      transaction.settlementAccountNumber,
      transaction.accountNumber,
      transaction.nostroAccountNumber,
    ),
    accountNumber: getFirstValue(transaction.accountNumber),
    amount,
    formattedAmount: formatSettlementCurrency(amount),
    transactionType,
    status,
    pacs008MessageId: getFirstValue(transaction.pacs008MessageId, transaction.pacs008MsgId, transaction.messageId),
    pacs002Status: toTitleCase(getFirstValue(transaction.pacs002Status, transaction.pacs002ResponseStatus, '-')),
    createdDate,
    updatedDate,
    formattedCreatedDate: formatSettlementDateTime(createdDate),
    formattedUpdatedDate: formatSettlementDateTime(updatedDate),
    createdDateValue: getDateValue(createdDate),
  }
}

export const fetchSettlementAccountDetails = async () => {
  const response = await httpClient.get('/api/employee/settlement-account')
  return normalizeSettlementAccount(normalizeSettlementAccountResponse(response))
}

export const fetchSettlementTransactions = async () => {
  const response = await httpClient.get('/api/employee/settlement-transactions')
  return normalizeSettlementTransactionCollection(response).map(normalizeSettlementTransaction)
}

export const fetchLatestSettlementTransactions = async () => {
  const transactions = await fetchSettlementTransactions()

  return [...transactions]
    .sort(compareSettlementTransactions)
    .slice(0, 5)
    .map((transaction) => ({
      id: transaction.id,
      paymentId: transaction.paymentId,
      accountNumber: getSettlementAccountNumber(transaction),
      amount: transaction.amount,
      formattedAmount: transaction.formattedAmount,
      status: getDisplaySettlementStatus(transaction),
      createdDate: transaction.createdDate,
    }))
}
