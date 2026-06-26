import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createCustomer, fetchCustomerById, updateCustomer } from '../../api/customers'

const initialCustomerForm = {
  aadharNumber: '',
  address: '',
  email: '',
  panCardNumber: '',
  password: '',
  phoneNumber: '',
  fullName: '',
  countryCode: '',
  townName: '',
}

const initialAccount = {
  initialBalance: '',
  accountType: '',
  accountId: '',
  accountNumber: '',
  iban: '',
  currency: '',
  status: '',
  createdDate: '',
  isExisting: false,
}

const accountTypeOptions = [
  { value: 'SAVINGS', label: 'Savings' },
  { value: 'CURRENT', label: 'Current' },
  { value: 'SALARY', label: 'Salary' },
]

const accountStatusOptions = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'SUSPENDED', label: 'Suspended' },
]

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phonePattern = /^[6-9]\d{9}$/
const aadharPattern = /^\d{12}$/
const panCardPattern = /^[A-Z]{5}\d{4}[A-Z]$/

const firstValue = (...values) => values.find((value) => value !== null && value !== undefined && value !== '') ?? ''

const normalizeOptionValue = (value) => firstValue(value).toString().trim().toUpperCase()

const getSelectOptions = (options, selectedValue) => {
  if (!selectedValue || options.some((option) => option.value === selectedValue)) {
    return options
  }

  return [
    ...options,
    {
      value: selectedValue,
      label: selectedValue
        .toLowerCase()
        .replace(/(^|_)\w/g, (letter) => letter.replace('_', ' ').toUpperCase()),
    },
  ]
}

const getFullName = (customer) => {
  const nameParts = [customer.firstName, customer.middleName, customer.lastName].filter(Boolean).join(' ')

  return firstValue(customer.fullName, customer.userName, customer.name, nameParts)
}

const normalizeAccount = (account = {}) => ({
  accountId: firstValue(account.accountId, account.id),
  initialBalance: firstValue(account.initialBalance, account.balance, account.currentBalance),
  accountType: normalizeOptionValue(account.accountType, account.account_type, account.type),
  accountNumber: firstValue(account.accountNumber, account.number),
  iban: firstValue(account.iban, account.ibanNumber),
  currency: firstValue(account.currency, account.currencyCode),
  status: normalizeOptionValue(account.status, 'ACTIVE'),
  createdDate: firstValue(account.createdDate, account.created_date),
  isExisting: Boolean(firstValue(account.accountId, account.id, account.accountNumber, account.iban)),
})

const normalizeCustomerDetails = (response = {}) => {
  const customer = response.customer || response.user || response.data || response
  const accounts = firstValue(customer.accounts, customer.accountDetails, response.accounts)

  return {
    customerForm: {
      aadharNumber: firstValue(customer.aadharNumber, customer.aadhaarNumber),
      address: firstValue(customer.address),
      email: firstValue(customer.email),
      panCardNumber: firstValue(customer.panCardNumber, customer.panNumber),
      password: firstValue(customer.password),
      phoneNumber: firstValue(customer.phoneNumber, customer.mobileNumber, customer.phone),
      fullName: getFullName(customer),
      countryCode: firstValue(customer.countryCode),
      townName: firstValue(customer.townName, customer.city),
    },
    accounts: Array.isArray(accounts) && accounts.length > 0
      ? accounts.map(normalizeAccount)
      : [{ ...initialAccount }],
  }
}

function AddCustomer() {
  const navigate = useNavigate()
  const { userId } = useParams()
  const isEditMode = Boolean(userId)
  const [customerForm, setCustomerForm] = useState(initialCustomerForm)
  const [accounts, setAccounts] = useState([{ ...initialAccount }])
  const [formErrors, setFormErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const pageTitle = isEditMode ? 'Edit Customer' : 'Add Customer'
  const submitLabel = useMemo(() => {
    if (isSubmitting) {
      return isEditMode ? 'Updating...' : 'Creating...'
    }

    return isEditMode ? 'Update Customer' : 'Create Customer'
  }, [isEditMode, isSubmitting])

  useEffect(() => {
    if (!isEditMode) {
      return
    }

    let isMounted = true

    const loadCustomer = async () => {
      try {
        setIsLoadingCustomer(true)
        setSubmitError('')
        setSuccessMessage('')

        const response = await fetchCustomerById(userId)
        const nextCustomer = normalizeCustomerDetails(response)

        if (isMounted) {
          setCustomerForm(nextCustomer.customerForm)
          setAccounts(nextCustomer.accounts)
        }
      } catch (error) {
        if (isMounted) {
          setSubmitError(error.message || 'Unable to load customer details.')
        }
      } finally {
        if (isMounted) {
          setIsLoadingCustomer(false)
        }
      }
    }

    loadCustomer()

    return () => {
      isMounted = false
    }
  }, [isEditMode, userId])

  const handleFieldChange = (event) => {
    const { name, value } = event.target

    setCustomerForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
    setFormErrors((currentErrors) => ({
      ...currentErrors,
      [name]: '',
    }))
    setSubmitError('')
    setSuccessMessage('')
  }

  const handleAccountChange = (index, field, value) => {
    setAccounts((currentAccounts) =>
      currentAccounts.map((account, accountIndex) =>
        accountIndex === index
          ? {
            ...account,
            [field]: value,
          }
          : account,
      ),
    )
    setFormErrors((currentErrors) => ({
      ...currentErrors,
      accounts: {
        ...(currentErrors.accounts || {}),
        [index]: {
          ...(currentErrors.accounts?.[index] || {}),
          [field]: '',
        },
      },
    }))
    setSubmitError('')
    setSuccessMessage('')
  }

  const handleAddAccount = () => {
    setAccounts((currentAccounts) => [...currentAccounts, { ...initialAccount }])
    setSubmitError('')
    setSuccessMessage('')
  }

  const validateForm = () => {
    const nextErrors = {}
    const customerFields = {
      fullName: 'Full Name is required.',
      email: 'Email is required.',
      phoneNumber: 'Phone Number is required.',
      aadharNumber: 'Aadhar Number is required.',
      panCardNumber: 'PAN Card Number is required.',
      address: 'Address is required.',
      townName: 'Town Name is required.',
      countryCode: 'Country Code is required.',
    }

    if (!isEditMode) {
      customerFields.password = 'Password is required.'
    }

    Object.entries(customerFields).forEach(([field, message]) => {
      if (!customerForm[field].trim()) {
        nextErrors[field] = message
      }
    })

    if (customerForm.email.trim() && !emailPattern.test(customerForm.email.trim())) {
      nextErrors.email = 'Enter a valid email address.'
    }

    if (customerForm.phoneNumber.trim() && !phonePattern.test(customerForm.phoneNumber.trim())) {
      nextErrors.phoneNumber = 'Enter a valid 10-digit phone number.'
    }

    if (customerForm.aadharNumber.trim() && !aadharPattern.test(customerForm.aadharNumber.trim())) {
      nextErrors.aadharNumber = 'Enter a valid 12-digit Aadhar Number.'
    }

    if (
      customerForm.panCardNumber.trim() &&
      !panCardPattern.test(customerForm.panCardNumber.trim().toUpperCase())
    ) {
      nextErrors.panCardNumber = 'Enter a valid PAN Card Number.'
    }

    const accountErrors = {}

    accounts.forEach((account, index) => {
      const isNewAccount = !account.isExisting
      const initialBalance = account.initialBalance.toString().trim()
      const accountType = account.accountType.trim()
      const status = account.status.trim()
      const currentAccountErrors = {}

      if (isNewAccount) {
        const balance = Number(initialBalance)

        if (!initialBalance || Number.isNaN(balance) || balance < 100) {
          currentAccountErrors.initialBalance = 'Initial Balance must be at least $100.'
        }

        if (!accountType) {
          currentAccountErrors.accountType = 'Account Type is required.'
        }
      }

      if (isEditMode && account.isExisting && !status) {
        currentAccountErrors.status = 'Status is required.'
      }

      if (Object.keys(currentAccountErrors).length > 0) {
        accountErrors[index] = currentAccountErrors
      }
    })

    if (Object.keys(accountErrors).length > 0) {
      nextErrors.accounts = accountErrors
    }

    setFormErrors(nextErrors)

    return Object.keys(nextErrors).length === 0
  }

  const buildAccountPayload = (account) => {
    const payload = {
      accountType: account.accountType.trim(),
    }

    if (account.isExisting && account.accountId) {
      payload.accountId = Number.isNaN(Number(account.accountId)) ? account.accountId : Number(account.accountId)
    } else {
      payload.balance = Number(account.initialBalance.toString().trim())
    }

    if (account.isExisting && account.status.trim()) {
      payload.status = account.status.trim()
    }

    return payload
  }

  const buildCustomerPayload = () => {
    const customerPayload = {
      userName: customerForm.fullName.trim(),
      email: customerForm.email.trim(),
      phoneNumber: customerForm.phoneNumber.trim(),
      aadharNumber: customerForm.aadharNumber.trim(),
      panCardNumber: customerForm.panCardNumber.trim().toUpperCase(),
      address: customerForm.address.trim(),
      townName: customerForm.townName.trim(),
      countryCode: customerForm.countryCode.trim(),
      accounts: accounts.map(buildAccountPayload),
    }

    if (isEditMode) {
      customerPayload.userId = Number.isNaN(Number(userId)) ? userId : Number(userId)
    } else {
      const primaryAccount = accounts[0]

      customerPayload.initialBalance = Number(primaryAccount.initialBalance)
      customerPayload.accountType = primaryAccount.accountType.trim()
    }

    if (customerForm.password) {
      customerPayload.password = customerForm.password
    }

    return customerPayload
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!validateForm()) {
      setSuccessMessage('')
      setSubmitError('')
      return
    }

    const customerPayload = buildCustomerPayload()

    try {
      setIsSubmitting(true)
      setSubmitError('')
      if (import.meta.env.DEV) {
        console.log(`${isEditMode ? 'Update' : 'Create'} customer payload:`, customerPayload)
      }

      if (isEditMode) {
        await updateCustomer(userId, customerPayload)
        setSuccessMessage('Customer updated successfully.')
      } else {
        await createCustomer(customerPayload)
        setSuccessMessage('Customer created successfully.')
      }
    } catch (error) {
      setSubmitError(error.message || `Unable to ${isEditMode ? 'update' : 'create'} customer.`)
      setSuccessMessage('')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="dashboard-main">
      <button className="employee-back-link" type="button" onClick={() => navigate('/employee/customers')}>
        <i className="bi bi-arrow-left" aria-hidden="true"></i>
        Back to customers
      </button>

      <section className="title-block">
        <h1>{pageTitle}</h1>
        <p>Capture identity, contact, and address details for the customer.</p>
      </section>

      {successMessage && (
        <div className="alert alert-success beneficiary-alert" role="alert">
          <i className="bi bi-check-circle-fill" aria-hidden="true"></i>
          <span>{successMessage}</span>
        </div>
      )}
      {submitError && <p className="dashboard-state error">{submitError}</p>}

      {isLoadingCustomer ? (
        <div className="section-loader inline-section-loader" role="status" aria-live="polite">
          <span className="section-loader-spinner" aria-hidden="true"></span>
          <span>Loading customer details...</span>
        </div>
      ) : (
        <form className="employee-customer-form" onSubmit={handleSubmit} noValidate>
          <section className="employee-form-section" aria-labelledby="customer-details-title">
            <h2 id="customer-details-title">Customer details</h2>
            <div className="employee-form-grid">
              <label className="bank-field">
                <span>Full Name</span>
                <input
                  name="fullName"
                  type="text"
                  value={customerForm.fullName}
                  onChange={handleFieldChange}
                  autoComplete="name"
                  required
                />
                {formErrors.fullName && <small className="field-error">{formErrors.fullName}</small>}
              </label>
              <label className="bank-field">
                <span>Email</span>
                <input
                  name="email"
                  type="email"
                  value={customerForm.email}
                  onChange={handleFieldChange}
                  autoComplete="email"
                  required
                />
                {formErrors.email && <small className="field-error">{formErrors.email}</small>}
              </label>
              <label className="bank-field">
                <span>Password</span>
                <input
                  name="password"
                  type="password"
                  value={customerForm.password}
                  onChange={handleFieldChange}
                  autoComplete="new-password"
                  required={!isEditMode}
                />
                {formErrors.password && <small className="field-error">{formErrors.password}</small>}
              </label>
              <label className="bank-field">
                <span>Phone Number</span>
                <input
                  name="phoneNumber"
                  type="tel"
                  value={customerForm.phoneNumber}
                  onChange={handleFieldChange}
                  autoComplete="tel"
                  required
                />
                {formErrors.phoneNumber && <small className="field-error">{formErrors.phoneNumber}</small>}
              </label>
              <label className="bank-field">
                <span>Aadhar Number</span>
                <input
                  name="aadharNumber"
                  type="text"
                  value={customerForm.aadharNumber}
                  onChange={handleFieldChange}
                  inputMode="numeric"
                  required
                />
                {formErrors.aadharNumber && <small className="field-error">{formErrors.aadharNumber}</small>}
              </label>
              <label className="bank-field">
                <span>PAN Card Number</span>
                <input
                  name="panCardNumber"
                  type="text"
                  value={customerForm.panCardNumber}
                  onChange={handleFieldChange}
                  required
                />
                {formErrors.panCardNumber && <small className="field-error">{formErrors.panCardNumber}</small>}
              </label>
              <label className="bank-field">
                <span>Address</span>
                <input
                  name="address"
                  type="text"
                  value={customerForm.address}
                  onChange={handleFieldChange}
                  autoComplete="street-address"
                  required
                />
                {formErrors.address && <small className="field-error">{formErrors.address}</small>}
              </label>
              <label className="bank-field">
                <span>Town Name</span>
                <input
                  name="townName"
                  type="text"
                  value={customerForm.townName}
                  onChange={handleFieldChange}
                  required
                />
                {formErrors.townName && <small className="field-error">{formErrors.townName}</small>}
              </label>
              <label className="bank-field">
                <span>Country Code</span>
                <input
                  name="countryCode"
                  type="text"
                  value={customerForm.countryCode}
                  onChange={handleFieldChange}
                  placeholder="US"
                  maxLength="3"
                  required
                />
                {formErrors.countryCode && <small className="field-error">{formErrors.countryCode}</small>}
              </label>
            </div>
          </section>

          <div className="employee-account-sections">
            {accounts.map((account, index) => (
              <section
                className="employee-form-section"
                aria-labelledby={`account-details-title-${index}`}
                key={account.accountId || `new-account-${index}`}
              >
                <h2 id={`account-details-title-${index}`}>Account Details {index + 1}</h2>
                <div className="employee-form-grid employee-account-grid">
                  {!account.isExisting && (
                    <label className="bank-field">
                      <span>Initial Balance</span>
                      <input
                        name={`initialBalance-${index}`}
                        type="number"
                        min="100"
                        step="0.01"
                        value={account.initialBalance}
                        onChange={(event) => handleAccountChange(index, 'initialBalance', event.target.value)}
                        required
                      />
                      {formErrors.accounts?.[index]?.initialBalance && (
                        <small className="field-error">{formErrors.accounts[index].initialBalance}</small>
                      )}
                    </label>
                  )}
                  <label className="bank-field">
                    <span>Account Type</span>
                    <select
                      className="filter-select"
                      name={`accountType-${index}`}
                      value={account.accountType}
                      onChange={(event) => handleAccountChange(index, 'accountType', event.target.value)}
                      required
                    >
                      {!account.isExisting && <option value="">Select account type</option>}
                      {getSelectOptions(accountTypeOptions, account.accountType).map((option) => (
                        <option value={option.value} key={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {formErrors.accounts?.[index]?.accountType && (
                      <small className="field-error">{formErrors.accounts[index].accountType}</small>
                    )}
                  </label>
                  {isEditMode && account.isExisting && (
                    <>
                      <label className="bank-field">
                        <span>Account Number</span>
                        <input type="text" value={account.accountNumber} readOnly />
                      </label>
                      <label className="bank-field">
                        <span>IBAN</span>
                        <input type="text" value={account.iban} readOnly />
                      </label>
                      <label className="bank-field">
                        <span>Currency</span>
                        <input type="text" value={account.currency} readOnly />
                      </label>
                      <label className="bank-field">
                        <span>Created Date</span>
                        <input type="text" value={account.createdDate} readOnly />
                      </label>
                      <label className="bank-field">
                        <span>Status</span>
                        <select
                          className="filter-select"
                          name={`status-${index}`}
                          value={account.status}
                          onChange={(event) => handleAccountChange(index, 'status', event.target.value)}
                          required
                        >
                          <option value="">Select status</option>
                          {getSelectOptions(accountStatusOptions, account.status).map((option) => (
                            <option value={option.value} key={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {formErrors.accounts?.[index]?.status && (
                          <small className="field-error">{formErrors.accounts[index].status}</small>
                        )}
                      </label>
                    </>
                  )}
                </div>
              </section>
            ))}
          </div>

          <div className="employee-form-actions employee-customer-actions">
            <button className="profile-action-button secondary-action" type="button" onClick={handleAddAccount}>
              <i className="bi bi-plus-circle" aria-hidden="true"></i>
              Add Another Account
            </button>
            <button className="profile-action-button primary-action" type="submit" disabled={isSubmitting}>
              <i className="bi bi-check-circle" aria-hidden="true"></i>
              {submitLabel}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default AddCustomer
