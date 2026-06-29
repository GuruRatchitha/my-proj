import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { fetchCustomers } from '../../api/customers'
import CustomersPagination from './CustomersPagination'
import CustomersTable from './CustomersTable'

const pageSize = 10

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
})

const formatCreatedDate = (createdDate) => {
  if (!createdDate) {
    return ''
  }

  const date = new Date(createdDate)
  return Number.isNaN(date.getTime()) ? createdDate : dateTimeFormatter.format(date)
}

const getFullName = (customer) => {
  const nameParts = [customer.firstName, customer.middleName, customer.lastName]
    .filter(Boolean)
    .join(' ')

  return customer.fullName || customer.userName || customer.name || nameParts
}

const normalizeCustomer = (customer) => ({
  userId: customer.userId || customer.id || '',
  fullName: getFullName(customer),
  email: customer.email || '',
  phoneNumber: customer.phoneNumber || customer.mobileNumber || customer.phone || '',
  aadhaarNumber: customer.aadhaarNumber || customer.aadharNumber || '',
  panNumber: customer.panNumber || customer.panCardNumber || '',
  address: customer.address || '',
  townName: customer.townName || customer.city || '',
  countryCode: customer.countryCode || '',
  createdDate: formatCreatedDate(customer.createdDate || customer.created_date),
})

const normalizeCustomersPage = (response, requestedPage) => {
  const content = Array.isArray(response)
    ? response
    : response?.content || response?.customers || response?.data || []
  const customers = Array.isArray(content) ? content.map(normalizeCustomer) : []
  const totalCustomers = Number(response?.totalElements ?? response?.totalCustomers ?? customers.length)
  const totalPages = Number(response?.totalPages ?? Math.ceil(totalCustomers / pageSize) ?? 1)
  const pageNumber = Number(response?.number ?? response?.page ?? requestedPage)

  return {
    customers,
    totalCustomers,
    totalPages: Math.max(1, totalPages),
    pageNumber,
    isFirstPage: Boolean(response?.first ?? pageNumber === 0),
    isLastPage: Boolean(response?.last ?? pageNumber >= Math.max(1, totalPages) - 1),
  }
}

function Customers() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const searchQuery = searchParams.get('search') || ''
  const [page, setPage] = useState(0)
  const [customersPage, setCustomersPage] = useState({
    customers: [],
    totalCustomers: 0,
    totalPages: 1,
    pageNumber: 0,
    isFirstPage: true,
    isLastPage: true,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadCustomers = async () => {
      try {
        setIsLoading(true)
        setErrorMessage('')

        const response = await fetchCustomers({ page, size: pageSize, search: searchQuery })
        const nextCustomersPage = normalizeCustomersPage(response, page)

        if (isMounted) {
          setCustomersPage(nextCustomersPage)
        }
      } catch (error) {
        if (isMounted) {
          setCustomersPage((currentPage) => ({
            ...currentPage,
            customers: [],
          }))
          setErrorMessage(error.message || 'Unable to load customers.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadCustomers()

    return () => {
      isMounted = false
    }
  }, [page, searchQuery])

  const displayPage = useMemo(() => customersPage.pageNumber + 1, [customersPage.pageNumber])
  const displayedCustomers = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase()

    if (!normalizedSearch) {
      return customersPage.customers
    }

    return customersPage.customers.filter((customer) =>
      [
        customer.fullName,
        customer.email,
        customer.phoneNumber,
        customer.userId,
        customer.aadhaarNumber,
        customer.panNumber,
        customer.address,
        customer.townName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch),
    )
  }, [customersPage.customers, searchQuery])

  const handleSearchChange = (event) => {
    const nextSearch = event.target.value
    setPage(0)

    if (nextSearch.trim()) {
      setSearchParams({ search: nextSearch })
    } else {
      setSearchParams({})
    }
  }

  const handlePreviousPage = () => {
    setPage((currentPage) => Math.max(0, currentPage - 1))
  }

  const handleNextPage = () => {
    setPage((currentPage) => Math.min(customersPage.totalPages - 1, currentPage + 1))
  }

  return (
    <div className="dashboard-main">
      <section className="title-block employee-title-row">
        <div>
          <h1>Customers</h1>
          <p>Browse customer profiles registered with the bank.</p>
        </div>
        <button
          className="add-payment"
          type="button"
          onClick={() => navigate('/employee/customers/new')}
        >
          <i className="bi bi-person-plus" aria-hidden="true"></i>
          <span>Add Customer</span>
        </button>
      </section>

      <section className="transactions-section compact-transactions-section customers-section">
        {errorMessage && <p className="dashboard-state error">{errorMessage}</p>}

        <div className="table-toolbar employee-customers-toolbar">
          <div className="search-control">
            <i className="bi bi-search" aria-hidden="true"></i>
            <input
              type="search"
              placeholder="Search customers"
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        <CustomersTable
          customers={displayedCustomers}
          isLoading={isLoading}
          onEditCustomer={(userId) => navigate(`/customers/edit/${encodeURIComponent(userId)}`)}
        />

        <CustomersPagination
          currentPage={displayPage}
          totalPages={customersPage.totalPages}
          totalCustomers={customersPage.totalCustomers}
          isFirstPage={customersPage.isFirstPage || page === 0}
          isLastPage={customersPage.isLastPage || displayPage >= customersPage.totalPages}
          isLoading={isLoading}
          onPrevious={handlePreviousPage}
          onNext={handleNextPage}
        />
      </section>
    </div>
  )
}

export default Customers
