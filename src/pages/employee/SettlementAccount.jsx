import { useCallback, useEffect, useState } from 'react'
import {
  fetchSettlementAccountDetails,
  fetchSettlementTransactions,
} from '../../api/SettlementAccountService'
import SettlementSummaryCard from './SettlementSummaryCard'
import SettlementTransactionTable from './SettlementTransactionTable'

const settlementRefreshIntervalMs = 10000

function SettlementAccount() {
  const [account, setAccount] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [lastRefreshedAt, setLastRefreshedAt] = useState('')

  const loadSettlementData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true)
      }

      setErrorMessage('')

      const [nextAccount, nextTransactions] = await Promise.all([
        fetchSettlementAccountDetails(),
        fetchSettlementTransactions(),
      ])

      setAccount(nextAccount)
      setTransactions(nextTransactions)
      setLastRefreshedAt(new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }))
    } catch (error) {
      setErrorMessage(error.message || 'Unable to load settlement account data.')
      if (showLoading) {
        setAccount(null)
        setTransactions([])
      }
    } finally {
      if (showLoading) {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadIfMounted = async (showLoading = true) => {
      if (isMounted) {
        await loadSettlementData(showLoading)
      }
    }

    loadIfMounted()
    const refreshTimer = window.setInterval(() => {
      loadIfMounted(false)
    }, settlementRefreshIntervalMs)

    return () => {
      isMounted = false
      window.clearInterval(refreshTimer)
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

      {!isLoading && errorMessage && !account && <p className="dashboard-state error">{errorMessage}</p>}

      {account && <SettlementSummaryCard account={account} />}

      <SettlementTransactionTable
        transactions={transactions}
        isLoading={isLoading && transactions.length === 0}
        errorMessage={account ? errorMessage : ''}
      />
    </div>
  )
}

export default SettlementAccount
