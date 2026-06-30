import httpClient from './httpClient'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
})

const getFirstValue = (...values) =>
  values.find((value) => value || value === 0) ?? ''

const isXmlResponse = (value) =>
  typeof value === 'string' && value.trim().startsWith('<?xml')

const parseMaybeJson = (value) => {
  if (typeof value !== 'string') {
    return value
  }

  const trimmedValue = value.trim()

  if (!trimmedValue || isXmlResponse(trimmedValue)) {
    return value
  }

  try {
    return JSON.parse(trimmedValue)
  } catch {
    return value
  }
}

const getObjectValue = (source, ...keys) => {
  if (!source || typeof source !== 'object') {
    return ''
  }

  return getFirstValue(...keys.map((key) => source[key]))
}

const normalizeDateInput = (value) => {
  if (typeof value !== 'string') {
    return value
  }

  return value.replace(/(\.\d{3})\d+/, '$1')
}

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

const toTitleCase = (value = '') =>
  value
    .toString()
    .toLowerCase()
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

const formatDateTime = (value) => {
  if (!value) {
    return '-'
  }

  const date = new Date(normalizeDateInput(value))
  return Number.isNaN(date.getTime()) ? '-' : dateTimeFormatter.format(date)
}

const formatDate = (value) => {
  if (!value) {
    return '-'
  }

  const date = new Date(normalizeDateInput(value))
  return Number.isNaN(date.getTime()) ? '-' : dateFormatter.format(date)
}

const getValidDate = (value) => {
  if (!value) {
    return null
  }

  const date = new Date(normalizeDateInput(value))
  return Number.isNaN(date.getTime()) ? null : date
}

const normalizeStatus = (status) => {
  const normalizedStatus = (status || '').toString().trim().toUpperCase()

  if (!normalizedStatus) {
    return ''
  }

  if (['COMPLETED', 'COMPLETE', 'ACSC', 'ACCEPTED', 'SETTLED'].includes(normalizedStatus)) {
    return 'Completed'
  }

  if (normalizedStatus === 'FAILED') {
    return 'Failed'
  }

  if (normalizedStatus === 'PROCESSING') {
    return 'Processing'
  }

  if (normalizedStatus === 'APPROVED' || normalizedStatus === 'RELEASED') {
    return 'Approved'
  }

  if (normalizedStatus === 'REJECTED' || normalizedStatus === 'RJCT') {
    return 'Rejected'
  }

  if (normalizedStatus === 'HOLD' || normalizedStatus === 'ON_HOLD') {
    return 'Hold'
  }

  return toTitleCase(normalizedStatus)
}

export const normalizeEmployeeTransaction = (transaction, index = 0) => {
  const senderDetails = transaction.senderDetails || {}
  const receiverDetails = transaction.receiverDetails || {}
  const paymentDetails = transaction.paymentDetails || {}
  const xmlDetails = transaction.xmlDetails || transaction.messages || transaction.messageDetails || {}
  const id = getFirstValue(
    transaction.id,
    transaction.transactionId,
    paymentDetails.transactionId,
    transaction.paymentId,
    transaction.paymentTransactionId,
    transaction.transactionReference,
    paymentDetails.transactionReference,
    `TXN-${index + 1}`,
  )
  const createdAt = getFirstValue(
    transaction.createdAt,
    transaction.createdDate,
    transaction.transactionDate,
    transaction.paymentDate,
    paymentDetails.paymentDate,
  )
  const paymentDate = getFirstValue(paymentDetails.paymentDate, transaction.paymentDate, transaction.transactionDate, createdAt)
  const rawAmount = Number(getFirstValue(paymentDetails.amount, transaction.amount, transaction.transferAmount, 0))
  const reference = getFirstValue(
    paymentDetails.transactionReference,
    transaction.transactionReference,
    transaction.paymentTransactionId,
    transaction.bankTransactionId,
    transaction.reference,
    id,
  )

  const validPaymentDate = getValidDate(paymentDate)

  const normalized = {
    id,
    reference,
    time: formatDateTime(createdAt),
    rawAmount,
    amount: currencyFormatter.format(rawAmount),
    currency: paymentDetails.currency || transaction.currency || 'USD',
    status: normalizeStatus(getFirstValue(
      transaction.status,
      transaction.currentStatus,
      transaction.transactionStatus,
      transaction.transferStatus,
      transaction.paymentStatus,
      transaction.processingStatus,
      paymentDetails.status,
      paymentDetails.transactionStatus,
      paymentDetails.paymentStatus,
      paymentDetails.processingStatus,
      transaction.approvalStatus,
    )),
    paymentDate: formatDate(paymentDate),
    paymentDateValue: validPaymentDate ? validPaymentDate.toISOString().slice(0, 10) : '',
    isoPaymentDate: validPaymentDate ? validPaymentDate.toISOString() : new Date().toISOString(),
    channel: getFirstValue(paymentDetails.channel, transaction.channel, 'Fedwire'),
    sender: {
      name: getFirstValue(getObjectValue(transaction.sender, 'name'), senderDetails.senderName, transaction.senderName, transaction.debtorName, transaction.customerName, transaction.userName, 'Account holder'),
      accountNumber: getFirstValue(getObjectValue(transaction.sender, 'accountNumber'), senderDetails.senderAccountNumber, transaction.senderAccountNumber, transaction.debtorAccountNumber, transaction.fromAccountNumber, transaction.accountNumber),
      routingNumber: getFirstValue(getObjectValue(transaction.sender, 'routingNumber'), senderDetails.senderRoutingNumber, transaction.senderRoutingNumber, transaction.debtorRoutingNumber, transaction.fromRoutingNumber, transaction.routingNumber),
      bankName: getFirstValue(getObjectValue(transaction.sender, 'bankName'), senderDetails.senderBankName, transaction.senderBankName, transaction.debtorBankName, transaction.fromBankName, 'ABC Bank'),
      country: getFirstValue(getObjectValue(transaction.sender, 'country'), senderDetails.senderCountry, transaction.senderCountry, transaction.debtorCountry, transaction.countryCode, 'US'),
    },
    receiver: {
      name: getFirstValue(getObjectValue(transaction.receiver, 'name'), receiverDetails.receiverName, transaction.receiverName, transaction.creditorName, transaction.beneficiaryName),
      accountNumber: getFirstValue(getObjectValue(transaction.receiver, 'accountNumber'), receiverDetails.receiverAccountNumber, transaction.receiverAccountNumber, transaction.creditorAccountNumber, transaction.beneficiaryAccountNumber, transaction.toAccountNumber),
      routingNumber: getFirstValue(getObjectValue(transaction.receiver, 'routingNumber'), receiverDetails.receiverRoutingNumber, transaction.receiverRoutingNumber, transaction.creditorRoutingNumber, transaction.beneficiaryRoutingNumber, transaction.toRoutingNumber),
      bankName: getFirstValue(getObjectValue(transaction.receiver, 'bankName'), receiverDetails.receiverBankName, transaction.receiverBankName, transaction.creditorBankName, transaction.beneficiaryBankName, 'Beneficiary Bank'),
      country: getFirstValue(getObjectValue(transaction.receiver, 'country'), receiverDetails.receiverCountry, transaction.receiverCountry, transaction.creditorCountry, transaction.beneficiaryCountry, transaction.countryCode, 'US'),
    },
  }

  return {
    ...normalized,
    pacs008Xml: getFirstValue(
      transaction.pacs008Xml,
      transaction.pacs008XML,
      transaction.pacs008,
      transaction.pacs008Message,
      transaction.pacs008MessageXml,
      transaction.pacs008MessageXML,
      transaction.xmlMessage,
      transaction.xml,
      paymentDetails.pacs008Xml,
      paymentDetails.pacs008,
      xmlDetails.pacs008Xml,
      xmlDetails.pacs008,
    ),
    pacs002Xml: getFirstValue(
      transaction.pacs002Xml,
      transaction.pacs002XML,
      transaction.pacs002,
      transaction.pacs002Message,
      transaction.pacs002MessageXml,
      transaction.pacs002MessageXML,
      paymentDetails.pacs002Xml,
      paymentDetails.pacs002,
      xmlDetails.pacs002Xml,
      xmlDetails.pacs002,
    ),
    admi002Xml: getFirstValue(
      transaction.admi002Xml,
      transaction.admi002XML,
      transaction.admi002,
      transaction.admi002Message,
      transaction.admi002MessageXml,
      transaction.admi002MessageXML,
      paymentDetails.admi002Xml,
      paymentDetails.admi002,
      xmlDetails.admi002Xml,
      xmlDetails.admi002,
    ),
    searchableStatus: toTitleCase(normalized.status),
  }
}

const formatXml = (value) => {
  const xml = String(value || '').trim()

  if (!xml.startsWith('<')) {
    return xml
  }

  const normalizedXml = xml.replace(/>\s*</g, '>\n<')
  let indentLevel = 0

  return normalizedXml
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.startsWith('</')) {
        indentLevel = Math.max(indentLevel - 1, 0)
      }

      const formattedLine = `${'  '.repeat(indentLevel)}${line}`

      if (
        line.startsWith('<') &&
        !line.startsWith('</') &&
        !line.startsWith('<?') &&
        !line.startsWith('<!') &&
        !line.endsWith('/>') &&
        !line.includes('</')
      ) {
        indentLevel += 1
      }

      return formattedLine
    })
    .join('\n')
}

const normalizePacs008Response = (response) => {
  const parsedResponse = parseMaybeJson(response)

  if (typeof parsedResponse === 'string') {
    return formatXml(parsedResponse)
  }

  if (!parsedResponse || typeof parsedResponse !== 'object') {
    return ''
  }

  return formatXml(getFirstValue(
    parsedResponse.xml,
    parsedResponse.pacs008Xml,
    parsedResponse.pacs008,
    parsedResponse.pacs008Message,
    parsedResponse.pacs008MessageXml,
    parsedResponse.xmlMessage,
    parsedResponse.message,
    parsedResponse.error,
  ))
}

export const fetchEmployeeTransactions = async () => {
  const response = await httpClient.get('/api/employee/transactions')
  const transactions = normalizeTransactionCollection(response)

  return transactions.map(normalizeEmployeeTransaction)
}

export const fetchEmployeeTransaction = async (transactionReference) => {
  const response = await httpClient.get(`/api/employee/transactions/${encodeURIComponent(transactionReference)}`)
  const transaction = response?.transaction || response

  return normalizeEmployeeTransaction(transaction)
}

export const fetchEmployeeTransactionXml = async (transactionReference) => {
  const response = await httpClient.get(
    `/api/employee/transactions/${encodeURIComponent(transactionReference)}/xml`,
    {
      headers: {
        Accept: 'application/xml, text/xml, application/json, text/plain, */*',
      },
      responseType: 'text',
      transformResponse: [(data) => data],
    },
  )

  return normalizePacs008Response(response)
}

export const fetchEmployeeTransactionPacs002 = async (transactionReference) => {
  const response = await httpClient.get(
    `/api/employee/transactions/${encodeURIComponent(transactionReference)}/pacs002`,
    {
      headers: {
        Accept: 'application/xml, text/xml, application/json, text/plain, */*',
      },
      responseType: 'text',
      transformResponse: [(data) => data],
    },
  )

  const parsedResponse = parseMaybeJson(response)

  if (typeof parsedResponse === 'string') {
    return formatXml(parsedResponse)
  }

  if (!parsedResponse || typeof parsedResponse !== 'object') {
    return ''
  }

  return formatXml(getFirstValue(
    parsedResponse.xml,
    parsedResponse.pacs002Xml,
    parsedResponse.pacs002,
    parsedResponse.pacs002Message,
    parsedResponse.pacs002MessageXml,
    parsedResponse.message,
  ))
}

export const fetchEmployeeTransactionAdmi002 = async (transactionReference) => {
  const response = await httpClient.get(
    `/api/employee/transactions/${encodeURIComponent(transactionReference)}/admi002`,
    {
      headers: {
        Accept: 'application/xml, text/xml, application/json, text/plain, */*',
      },
      responseType: 'text',
      transformResponse: [(data) => data],
    },
  )

  const parsedResponse = parseMaybeJson(response)

  if (typeof parsedResponse === 'string') {
    return formatXml(parsedResponse)
  }

  if (!parsedResponse || typeof parsedResponse !== 'object') {
    return ''
  }

  return formatXml(getFirstValue(
    parsedResponse.xml,
    parsedResponse.admi002Xml,
    parsedResponse.admi002,
    parsedResponse.admi002Message,
    parsedResponse.admi002MessageXml,
    parsedResponse.message,
  ))
}

export const fetchEmployeeTransactionProcessingPipeline = async (transactionId) => {
  const response = await httpClient.get(
    `/api/employee/transactions/${encodeURIComponent(transactionId)}/processing-pipeline`,
  )
  const payload = response?.data || response

  return payload?.pipeline || payload?.processingPipeline || payload
}

export const approveEmployeeTransaction = async (transactionReference) => {
  const response = await httpClient.post(
    `/api/employee/transactions/${encodeURIComponent(transactionReference)}/approve`,
    null,
    {
      headers: {
        Accept: 'application/json, text/plain, */*',
      },
      responseType: 'text',
      transformResponse: [(data) => data],
    },
  )

  return parseMaybeJson(response)
}

export const rejectEmployeeTransaction = async (transactionReference) => {
  const response = await httpClient.post(
    `/api/employee/transactions/${encodeURIComponent(transactionReference)}/reject`,
    null,
    {
      headers: {
        Accept: 'application/json, text/plain, */*',
      },
      responseType: 'text',
      transformResponse: [(data) => data],
    },
  )

  return parseMaybeJson(response)
}
