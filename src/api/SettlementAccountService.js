import httpClient from './httpClient'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
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

const getSettlementStatus = (transaction) => {
  const statusValues = [
    transaction.settlementStatus,
    transaction.ledgerStatus,
    transaction.movementStatus,
    transaction.movementType,
    transaction.queueStatus,
    transaction.transactionQueueStatus,
    transaction.paymentStatus,
    transaction.transactionStatus,
    transaction.transferStatus,
    transaction.approvalStatus,
    transaction.status,
    transaction.paymentDetails?.status,
    transaction.payment?.status,
    transaction.pacs002Status,
    transaction.transactionType,
  ].filter(Boolean)

  const normalizedStatuses = statusValues.map(getNormalizedSettlementStatus)

  if (normalizedStatuses.some((value) => value.includes('REVERT'))) {
    return 'Reverted'
  }

  if (normalizedStatuses.some((value) => value.includes('RETURN'))) {
    return 'Returned'
  }

  const normalizedStatus = normalizedStatuses
    .find((value) => value.includes('DEBIT') || value.includes('CREDIT')) || ''

  if (normalizedStatus.includes('DEBIT')) {
    return 'Debited'
  }

  if (normalizedStatus.includes('CREDIT')) {
    return 'Credited'
  }

  if (normalizedStatuses.some((value) =>
    value === 'RJCT' || value.includes('REJECT') || value.includes('FAIL'))) {
    return 'Failed'
  }

  return '-'
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

  if (Array.isArray(response?.transactionHistory)) {
    return response.transactionHistory
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

  if (Array.isArray(response?.data?.transactionHistory)) {
    return response.data.transactionHistory
  }

  if (Array.isArray(response)) {
    return response
  }

  return []
}

export const normalizeSettlementAccount = (account = {}) => {
  const currentBalance = getFirstValue(account.currentBalance, account.balance, account.availableBalance, 0)
  const revertAmountValues = [
    account.revertAmount,
    account.revertAmountBalance,
    account.revertedAmountBalance,
    account.totalRevertedAmount,
    account.returnedAmountBalance,
    account.revertedBalance,
  ]
  const hasRevertAmount = revertAmountValues.some(
    (value) => value !== undefined && value !== null && value !== '',
  )
  const revertAmount = getFirstValue(...revertAmountValues, 0)

  return {
    accountNumber: getFirstValue(account.accountNumber, account.settlementAccountNumber, account.number),
    accountName: getFirstValue(account.accountName, account.name, account.accountHolderName, 'Settlement Account'),
    currentBalance,
    formattedCurrentBalance: formatSettlementCurrency(currentBalance),
    revertAmount,
    formattedRevertAmount: formatSettlementCurrency(revertAmount),
    hasRevertAmount,
    // Temporary compatibility aliases for callers using the previous contract.
    revertedAmountBalance: revertAmount,
    formattedRevertedAmountBalance: formatSettlementCurrency(revertAmount),
    hasRevertedAmountBalance: hasRevertAmount,
    accountType: toTitleCase(getFirstValue(account.accountType, account.type, 'Settlement')),
    lastUpdated: getFirstValue(account.lastUpdated, account.updatedAt, account.updatedDate, account.modifiedAt),
    formattedLastUpdated: formatSettlementDateTime(
      getFirstValue(account.lastUpdated, account.updatedAt, account.updatedDate, account.modifiedAt),
    ),
  }
}

export const normalizeSettlementTransaction = (transaction = {}, index = 0) => {
  const senderDetails = transaction.senderDetails || transaction.sender || transaction.debtor || {}
  const receiverDetails = transaction.receiverDetails || transaction.receiver ||
    transaction.beneficiaryDetails || transaction.beneficiary || {}
  const paymentDetails = transaction.paymentDetails || transaction.payment || {}
  const amount = getFirstValue(transaction.amount, transaction.settlementAmount, transaction.transactionAmount, 0)
  const status = toTitleCase(getFirstValue(transaction.status))
  const transactionType = toTitleCase(getFirstValue(transaction.transactionType))
  const dateTime = getFirstValue(
    transaction.dateTime,
    transaction.createdDate,
    transaction.createdAt,
    transaction.createdOn,
    transaction.transactionDate,
    transaction.paymentDate,
  )
  const updatedDate = getFirstValue(transaction.updatedDate, transaction.updatedAt, transaction.modifiedAt)

  return {
    id: getFirstValue(
      transaction.settlementTransactionId,
      transaction.id,
      transaction.transactionId,
      `SETTLEMENT-${index + 1}`,
    ),
    paymentId: getFirstValue(transaction.paymentId, transaction.paymentID, transaction.paymentReference),
    // The ledger service determines the parties for each movement (credit,
    // beneficiary debit, or revert). Keep its display values intact instead
    // of trying to infer the direction again in the browser.
    senderDisplay: transaction.senderDisplay ?? null,
    receiverDisplay: transaction.receiverDisplay ?? null,
    senderAccountNumber: getFirstValue(
      transaction.senderAccountNumber,
      transaction.debtorAccountNumber,
      transaction.fromAccountNumber,
      senderDetails.accountNumber,
      senderDetails.senderAccountNumber,
    ),
    senderName: getFirstValue(
      transaction.senderName,
      transaction.debtorName,
      transaction.customerName,
      senderDetails.name,
      senderDetails.senderName,
    ),
    senderAccountType: toTitleCase(getFirstValue(
      transaction.senderAccountType,
      transaction.debtorAccountType,
      transaction.sourceAccountType,
      transaction.accountType,
      senderDetails.accountType,
      senderDetails.senderAccountType,
    )),
    beneficiaryAccountNumber: getFirstValue(
      transaction.beneficiaryAccountNumber,
      transaction.receiverAccountNumber,
      transaction.creditorAccountNumber,
      transaction.toAccountNumber,
      receiverDetails.accountNumber,
      receiverDetails.receiverAccountNumber,
    ),
    receiverAccountNumber: getFirstValue(
      transaction.receiverAccountNumber,
      transaction.beneficiaryAccountNumber,
      transaction.creditorAccountNumber,
      transaction.toAccountNumber,
      receiverDetails.accountNumber,
      receiverDetails.receiverAccountNumber,
    ),
    receiverName: getFirstValue(
      transaction.receiverName,
      transaction.beneficiaryName,
      transaction.creditorName,
      receiverDetails.name,
      receiverDetails.receiverName,
    ),
    receiverAccountType: toTitleCase(getFirstValue(
      transaction.receiverAccountType,
      transaction.beneficiaryAccountType,
      transaction.creditorAccountType,
      receiverDetails.accountType,
      receiverDetails.receiverAccountType,
    )),
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
    settlementStatus: getSettlementStatus(transaction),
    paymentStatus: toTitleCase(getFirstValue(
      transaction.paymentStatus,
      transaction.transactionStatus,
      transaction.transferStatus,
      paymentDetails.status,
    )),
    queueStatus: toTitleCase(getFirstValue(
      transaction.queueStatus,
      transaction.transactionQueueStatus,
      transaction.approvalStatus,
    )),
    uetr: getFirstValue(
      transaction.uetr,
      transaction.uetrId,
      transaction.pacs008Uetr,
      transaction.pacs008UETR,
      paymentDetails.uetr,
      paymentDetails.uetrId,
    ),
    pacs008MessageId: getFirstValue(transaction.pacs008MessageId, transaction.pacs008MsgId, transaction.messageId),
    pacs002Status: toTitleCase(getFirstValue(transaction.pacs002Status, transaction.pacs002ResponseStatus, '-')),
    dateTime,
    createdDate: dateTime,
    updatedDate,
    formattedDateTime: formatSettlementDateTime(dateTime),
    formattedCreatedDate: formatSettlementDateTime(dateTime),
    formattedUpdatedDate: formatSettlementDateTime(updatedDate),
    createdDateValue: getDateValue(dateTime),
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
}
