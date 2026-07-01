import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchSettlementAccountDetails,
  fetchSettlementTransactions,
} from '../../api/SettlementAccountService'
import { API_BASE_URL } from '../../api/httpClient'
import SettlementSummaryCard from './SettlementSummaryCard'
import SettlementTransactionTable from './SettlementTransactionTable'

const settlementRefreshIntervalMs = 10000

const mergeSettlementTransactions = (currentTransactions, incomingTransactions) => {
  const transactionMap = new Map(
    currentTransactions.map((transaction) => [String(transaction.id), transaction]),
  )

  incomingTransactions.forEach((transaction) => {
    transactionMap.set(String(transaction.id), transaction)
  })

  return Array.from(transactionMap.values())
}

const getSettlementRequestError = (label, error) => {
  const message = error?.message || 'Request failed.'

  if (error?.isTimeout || message.toLowerCase().includes('timeout')) {
    return `${label} timed out because the backend at ${API_BASE_URL} did not respond within 30 seconds.`
  }

  if (error?.isNetworkError) {
    return `Unable to reach the backend at ${API_BASE_URL}. Start the backend service or set VITE_API_BASE_URL to its address.`
  }

  return `Unable to load ${label.toLowerCase()}. ${message}`
}

function SettlementAccount() {
  const isRequestInFlightRef = useRef(false)
  const [account, setAccount] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [accountErrorMessage, setAccountErrorMessage] = useState('')
  const [transactionErrorMessage, setTransactionErrorMessage] = useState('')
  const [lastRefreshedAt, setLastRefreshedAt] = useState('')

  const loadSettlementData = useCallback(async (showLoading = true) => {
    if (isRequestInFlightRef.current) {
      return
    }

    isRequestInFlightRef.current = true

    try {
      if (showLoading) {
        setIsLoading(true)
      }

      setAccountErrorMessage('')
      setTransactionErrorMessage('')

      const [accountResult, transactionResult] = await Promise.allSettled([
        fetchSettlementAccountDetails(),
        fetchSettlementTransactions(),
      ])

      if (transactionResult.status === 'fulfilled') {
        setTransactions((currentTransactions) =>
          mergeSettlementTransactions(currentTransactions, transactionResult.value),
        )
      } else {
        setTransactionErrorMessage(
          getSettlementRequestError('Settlement transaction history', transactionResult.reason),
        )
      }

      if (accountResult.status === 'fulfilled') {
        setAccount(accountResult.value)
      } else {
        setAccountErrorMessage(
          getSettlementRequestError('Settlement account details', accountResult.reason),
        )
      }

      if (accountResult.status === 'fulfilled' || transactionResult.status === 'fulfilled') {
        setLastRefreshedAt(new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }))
      }
    } finally {
      isRequestInFlightRef.current = false

      if (showLoading) {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    let refreshTimer

    const loadIfMounted = async (showLoading = true) => {
      if (isMounted) {
        await loadSettlementData(showLoading)
      }
    }

    const scheduleRefresh = () => {
      refreshTimer = window.setTimeout(async () => {
        await loadIfMounted(false)

        if (isMounted) {
          scheduleRefresh()
        }
      }, settlementRefreshIntervalMs)
    }

    loadIfMounted().finally(() => {
      if (isMounted) {
        scheduleRefresh()
      }
    })

    return () => {
      isMounted = false
      window.clearTimeout(refreshTimer)
    }
  }, [loadSettlementData])

  return (
    <div className="dashboard-main settlement-account-page">
      <section className="title-block employee-title-row">
        <div>
          <h1>Settlement Account</h1>
          <p>Monitor settlement balance and transaction movement.</p>
        </div>
        <button
          className="profile-action-button secondary-action"
          type="button"
          onClick={() => loadSettlementData()}
          disabled={isLoading}
        >
          <i className="bi bi-arrow-clockwise" aria-hidden="true"></i>
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </section>

      <div className="employee-channel-bar settlement-refresh-chip" aria-label="Settlement refresh status">
        <span>Auto refresh:</span>
        <strong>10 seconds</strong>
        {lastRefreshedAt && <span>Last updated {lastRefreshedAt}</span>}
      </div>

      {isLoading && !account && (
        <div className="settlement-page-loading" role="status">
          <span className="spinner-border" aria-hidden="true"></span>
          <span>Loading settlement account...</span>
        </div>
      )}

      {!isLoading && accountErrorMessage && !account && (
        <p className="dashboard-state error">{accountErrorMessage}</p>
      )}

      {account && <SettlementSummaryCard account={account} />}

      <SettlementTransactionTable
        transactions={transactions}
        isLoading={isLoading && transactions.length === 0}
        errorMessage={transactionErrorMessage}
        hideMissingReceiverAccountType
        useDetailedDateTime
      />
    </div>
  )
}

export default SettlementAccount
