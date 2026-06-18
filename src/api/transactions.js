import httpClient from './httpClient'

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

export const normalizeTransaction = (transaction) => {
  const tone = getTransactionTone(transaction)
  const amount = currencyFormatter.format(Number(transaction.amount || 0))

  return {
    id: transaction.transactionReference,
    date: formatTransactionDate(transaction.transactionDate),
    receiverName: transaction.beneficiaryName,
    accountNumber: transaction.accountNumber,
    amount: tone === 'credit' ? `+${amount}` : `-${amount}`,
    type: toTitleCase(transaction.accountType),
    status: toTitleCase(transaction.transferStatus),
    remarks: transaction.purpose,
    tone,
    icon: getDashboardIcon(transaction),
    detail: `${transaction.transactionReference} - ${transaction.purpose}`,
  }
}

export const fetchTransactions = async (limit) => {
  const endpoint = limit ? `/api/transactions?limit=${limit}` : '/api/transactions'
  const transactions = await httpClient.get(endpoint)

  return Array.isArray(transactions) ? transactions.map(normalizeTransaction) : []
}
