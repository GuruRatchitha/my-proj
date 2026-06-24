import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  fetchEmployeeTransaction,
  updateEmployeeTransactionStatus,
} from '../../api/employeeTransactions'

const detailSections = [
  {
    title: 'Sender Details',
    key: 'sender',
    fields: [
      ['Sender Name', 'name'],
      ['Sender Account Number', 'accountNumber'],
      ['Sender Routing Number', 'routingNumber'],
      ['Sender Bank Name', 'bankName'],
      ['Country', 'country'],
    ],
  },
  {
    title: 'Receiver Details',
    key: 'receiver',
    fields: [
      ['Receiver Name', 'name'],
      ['Receiver Account Number', 'accountNumber'],
      ['Receiver Routing Number', 'routingNumber'],
      ['Receiver Bank Name', 'bankName'],
      ['Country', 'country'],
    ],
  },
]

const getStatusClass = (status = '') => status.toLowerCase().replace(/\s+/g, '-')

function DetailCard({ title, fields, source }) {
  return (
    <article className="employee-review-card">
      <h2>{title}</h2>
      <dl>
        {fields.map(([label, key]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{source?.[key] || '-'}</dd>
          </div>
        ))}
      </dl>
    </article>
  )
}

function TransactionDetails() {
  const { transactionReference = '' } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [transaction, setTransaction] = useState(location.state?.transaction || null)
  const [activeTab, setActiveTab] = useState('parties')
  const [isLoading, setIsLoading] = useState(!location.state?.transaction)
  const [errorMessage, setErrorMessage] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [activeAction, setActiveAction] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadTransaction = async () => {
      if (location.state?.transaction) {
        return
      }

      try {
        setIsLoading(true)
        setErrorMessage('')

        const nextTransaction = await fetchEmployeeTransaction(decodeURIComponent(transactionReference))

        if (isMounted) {
          setTransaction(nextTransaction)
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.message || 'Unable to load transaction details.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadTransaction()

    return () => {
      isMounted = false
    }
  }, [location.state, transactionReference])

  const handleReviewAction = async (action) => {
    if (!transaction) {
      return
    }

    try {
      setActiveAction(action)
      setActionMessage('')
      setErrorMessage('')

      const updatedTransaction = await updateEmployeeTransactionStatus(transaction, action)
      setTransaction(updatedTransaction)
      setActionMessage(`Transaction ${updatedTransaction.status.toLowerCase()} successfully.`)

      if (action === 'approve-release') {
        setActiveTab('xml')
      }
    } catch (error) {
      setErrorMessage(error.message || 'Unable to update transaction.')
    } finally {
      setActiveAction('')
    }
  }

  if (isLoading) {
    return (
      <div className="dashboard-main">
        <p className="dashboard-state">Loading transaction details...</p>
      </div>
    )
  }

  if (!transaction) {
    return (
      <div className="dashboard-main">
        <section className="title-block">
          <h1>Transaction Review</h1>
          <p>Open a transaction from the queue to review payment details.</p>
        </section>
        {errorMessage && <p className="dashboard-state error">{errorMessage}</p>}
        <button
          className="profile-action-button secondary-action"
          type="button"
          onClick={() => navigate('/employee/transaction-queue')}
        >
          Back to Queue
        </button>
      </div>
    )
  }

  const paymentFields = [
    ['Transaction Reference', transaction.reference],
    ['Amount', transaction.amount],
    ['Payment Date', transaction.paymentDate],
    ['Status', transaction.status],
    ['Channel', 'Fedwire'],
  ]

  return (
    <div className="dashboard-main employee-review-page">
      <section className="employee-review-hero">
        <div>
          <button
            className="employee-back-link"
            type="button"
            onClick={() => navigate('/employee/transaction-queue')}
          >
            <i className="bi bi-arrow-left" aria-hidden="true"></i>
            Queue
          </button>
          <span className="account-id">{transaction.reference}</span>
          <h1>{transaction.amount}</h1>
          <p>Fedwire payment approval review</p>
        </div>
        <div className="employee-review-actions" aria-label="Transaction actions">
          <span className={`transaction-status ${getStatusClass(transaction.status)}`}>
            {transaction.status}
          </span>
          <button
            className="profile-action-button secondary-action"
            type="button"
            disabled={Boolean(activeAction)}
            onClick={() => handleReviewAction('hold')}
          >
            Hold
          </button>
          <button
            className="profile-action-button secondary-action employee-reject-action"
            type="button"
            disabled={Boolean(activeAction)}
            onClick={() => handleReviewAction('reject')}
          >
            Reject
          </button>
          <button
            className="profile-action-button primary-action"
            type="button"
            disabled={Boolean(activeAction)}
            onClick={() => handleReviewAction('approve-release')}
          >
            Approve & Release
          </button>
        </div>
      </section>

      {actionMessage && (
        <div className="alert alert-success beneficiary-alert" role="alert">
          <i className="bi bi-check-circle-fill" aria-hidden="true"></i>
          <span>{actionMessage}</span>
        </div>
      )}
      {errorMessage && <p className="dashboard-state error">{errorMessage}</p>}

      <section className="employee-review-grid" aria-label="Transaction summary">
        {detailSections.map((section) => (
          <DetailCard
            key={section.title}
            title={section.title}
            fields={section.fields}
            source={transaction[section.key]}
          />
        ))}

        <article className="employee-review-card">
          <h2>Payment Details</h2>
          <dl>
            {paymentFields.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>
                  {label === 'Status' ? (
                    <span className={`transaction-status ${getStatusClass(transaction.status)}`}>
                      {transaction.status}
                    </span>
                  ) : (
                    value || '-'
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </article>
      </section>

      <section className="employee-review-tabs" aria-label="Transaction review tabs">
        <div className="employee-tab-list" role="tablist">
          <button
            className={activeTab === 'parties' ? 'active' : ''}
            type="button"
            role="tab"
            aria-selected={activeTab === 'parties'}
            onClick={() => setActiveTab('parties')}
          >
            Parties
          </button>
          <button
            className={activeTab === 'xml' ? 'active' : ''}
            type="button"
            role="tab"
            aria-selected={activeTab === 'xml'}
            onClick={() => setActiveTab('xml')}
          >
            PACS.008 XML
          </button>
        </div>

        {activeTab === 'parties' && (
          <div className="employee-parties-grid" role="tabpanel">
            <DetailCard
              title="Debtor (Originator)"
              fields={[
                ['Name', 'name'],
                ['Account Number', 'accountNumber'],
                ['Routing Number', 'routingNumber'],
                ['Bank Name', 'bankName'],
                ['Country', 'country'],
              ]}
              source={transaction.sender || transaction}
            />
            <DetailCard
              title="Creditor (Beneficiary)"
              fields={[
                ['Name', 'name'],
                ['Account Number', 'accountNumber'],
                ['Routing Number', 'routingNumber'],
                ['Bank Name', 'bankName'],
                ['Country', 'country'],
              ]}
              source={transaction.receiver || transaction}
            />
          </div>
        )}

        {activeTab === 'xml' && (
          <div className="employee-xml-panel" role="tabpanel">
            <pre>
              <code>{transaction.pacs008Xml}</code>
            </pre>
          </div>
        )}
      </section>
    </div>
  )
}

export default TransactionDetails
