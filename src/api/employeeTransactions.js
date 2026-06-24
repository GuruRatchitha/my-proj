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

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : dateTimeFormatter.format(date)
}

const formatDate = (value) => {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : dateFormatter.format(date)
}

const getValidDate = (value) => {
  if (!value) {
    return null
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const normalizeStatus = (status) => {
  const normalizedStatus = (status || '').toString().trim().toUpperCase()

  if (normalizedStatus === 'APPROVED' || normalizedStatus === 'RELEASED' || normalizedStatus === 'COMPLETED') {
    return 'Approved'
  }

  if (normalizedStatus === 'REJECTED' || normalizedStatus === 'FAILED') {
    return 'Rejected'
  }

  if (normalizedStatus === 'HOLD' || normalizedStatus === 'ON_HOLD') {
    return 'Hold'
  }

  return 'Pending'
}

const escapeXml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

export const buildPacs008Xml = (transaction) => {
  const reference = escapeXml(transaction.reference)
  const amount = Number(transaction.rawAmount || 0).toFixed(2)

  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>${reference}</MsgId>
      <CreDtTm>${escapeXml(transaction.isoPaymentDate)}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <SttlmInf>
        <SttlmMtd>CLRG</SttlmMtd>
        <ClrSys>
          <Cd>FDW</Cd>
        </ClrSys>
      </SttlmInf>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>${reference}</InstrId>
        <EndToEndId>${reference}</EndToEndId>
        <TxId>${reference}</TxId>
      </PmtId>
      <IntrBkSttlmAmt Ccy="${escapeXml(transaction.currency)}">${amount}</IntrBkSttlmAmt>
      <IntrBkSttlmDt>${escapeXml(transaction.paymentDateValue)}</IntrBkSttlmDt>
      <Dbtr>
        <Nm>${escapeXml(transaction.sender.name)}</Nm>
        <PstlAdr>
          <Ctry>${escapeXml(transaction.sender.country)}</Ctry>
        </PstlAdr>
      </Dbtr>
      <DbtrAcct>
        <Id>
          <Othr>
            <Id>${escapeXml(transaction.sender.accountNumber)}</Id>
          </Othr>
        </Id>
      </DbtrAcct>
      <DbtrAgt>
        <FinInstnId>
          <ClrSysMmbId>
            <MmbId>${escapeXml(transaction.sender.routingNumber)}</MmbId>
          </ClrSysMmbId>
          <Nm>${escapeXml(transaction.sender.bankName)}</Nm>
        </FinInstnId>
      </DbtrAgt>
      <CdtrAgt>
        <FinInstnId>
          <ClrSysMmbId>
            <MmbId>${escapeXml(transaction.receiver.routingNumber)}</MmbId>
          </ClrSysMmbId>
          <Nm>${escapeXml(transaction.receiver.bankName)}</Nm>
        </FinInstnId>
      </CdtrAgt>
      <Cdtr>
        <Nm>${escapeXml(transaction.receiver.name)}</Nm>
        <PstlAdr>
          <Ctry>${escapeXml(transaction.receiver.country)}</Ctry>
        </PstlAdr>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <Othr>
            <Id>${escapeXml(transaction.receiver.accountNumber)}</Id>
          </Othr>
        </Id>
      </CdtrAcct>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`
}

export const normalizeEmployeeTransaction = (transaction, index = 0) => {
  const id = getFirstValue(
    transaction.id,
    transaction.transactionId,
    transaction.paymentId,
    transaction.paymentTransactionId,
    transaction.transactionReference,
    `TXN-${index + 1}`,
  )
  const createdAt = getFirstValue(
    transaction.createdAt,
    transaction.createdDate,
    transaction.transactionDate,
    transaction.paymentDate,
  )
  const paymentDate = getFirstValue(transaction.paymentDate, transaction.transactionDate, createdAt)
  const rawAmount = Number(getFirstValue(transaction.amount, transaction.transferAmount, 0))
  const reference = getFirstValue(
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
    currency: transaction.currency || 'USD',
    status: normalizeStatus(getFirstValue(transaction.transferStatus, transaction.status, transaction.approvalStatus)),
    paymentDate: formatDate(paymentDate),
    paymentDateValue: validPaymentDate ? validPaymentDate.toISOString().slice(0, 10) : '',
    isoPaymentDate: validPaymentDate ? validPaymentDate.toISOString() : new Date().toISOString(),
    channel: 'Fedwire',
    sender: {
      name: getFirstValue(transaction.senderName, transaction.debtorName, transaction.customerName, transaction.userName, 'Account holder'),
      accountNumber: getFirstValue(transaction.senderAccountNumber, transaction.debtorAccountNumber, transaction.fromAccountNumber, transaction.accountNumber),
      routingNumber: getFirstValue(transaction.senderRoutingNumber, transaction.debtorRoutingNumber, transaction.fromRoutingNumber, transaction.routingNumber),
      bankName: getFirstValue(transaction.senderBankName, transaction.debtorBankName, transaction.fromBankName, 'ABC Bank'),
      country: getFirstValue(transaction.senderCountry, transaction.debtorCountry, transaction.countryCode, 'US'),
    },
    receiver: {
      name: getFirstValue(transaction.receiverName, transaction.creditorName, transaction.beneficiaryName),
      accountNumber: getFirstValue(transaction.receiverAccountNumber, transaction.creditorAccountNumber, transaction.beneficiaryAccountNumber, transaction.toAccountNumber),
      routingNumber: getFirstValue(transaction.receiverRoutingNumber, transaction.creditorRoutingNumber, transaction.beneficiaryRoutingNumber, transaction.toRoutingNumber),
      bankName: getFirstValue(transaction.receiverBankName, transaction.creditorBankName, transaction.beneficiaryBankName, 'Beneficiary Bank'),
      country: getFirstValue(transaction.receiverCountry, transaction.creditorCountry, transaction.beneficiaryCountry, transaction.countryCode, 'US'),
    },
  }

  return {
    ...normalized,
    pacs008Xml: transaction.pacs008Xml || transaction.pacs008 || transaction.xmlMessage || buildPacs008Xml(normalized),
    searchableStatus: toTitleCase(normalized.status),
  }
}

export const fetchEmployeeTransactions = async () => {
  try {
    const response = await httpClient.get('/api/employee/transactions')
    const transactions = normalizeTransactionCollection(response)

    if (transactions.length > 0) {
      return transactions.map(normalizeEmployeeTransaction)
    }
  } catch {
    // Fall through to the dashboard transaction feed below.
  }

  const fallbackResponse = await httpClient.get('/api/dashboard/transactions')
  const fallbackTransactions = normalizeTransactionCollection(fallbackResponse)

  return fallbackTransactions.map(normalizeEmployeeTransaction)
}

export const fetchEmployeeTransaction = async (transactionReference) => {
  const response = await httpClient.get(`/api/employee/transactions/${encodeURIComponent(transactionReference)}`)
  const transaction = response?.transaction || response

  return normalizeEmployeeTransaction(transaction)
}

export const updateEmployeeTransactionStatus = async (transaction, action) => {
  const endpointAction = action === 'approve-release' ? 'approve' : action
  const transactionId = transaction.id || transaction.reference
  const response = await httpClient.put(
    `/api/employee/transactions/${encodeURIComponent(transactionId)}/${endpointAction}`,
    null,
    {
      headers: {
        Accept: 'application/xml, text/xml, application/json, text/plain, */*',
      },
      responseType: 'text',
      transformResponse: [(data) => data],
    },
  )
  const parsedResponse = parseMaybeJson(response)

  if (isXmlResponse(parsedResponse)) {
    return {
      ...transaction,
      status: 'Approved',
      pacs008Xml: parsedResponse,
    }
  }

  const updatedTransaction = parsedResponse?.transaction || parsedResponse

  if (updatedTransaction && typeof updatedTransaction === 'object') {
    return {
      ...transaction,
      ...normalizeEmployeeTransaction(updatedTransaction),
    }
  }

  return {
    ...transaction,
    status: endpointAction === 'reject' ? 'Rejected' : endpointAction === 'hold' ? 'Hold' : transaction.status,
  }
}
