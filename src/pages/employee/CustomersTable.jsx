import LoadingSpinner from '../../components/LoadingSpinner'

const customerColumns = [
  { key: 'userId', label: 'User ID' },
  { key: 'fullName', label: 'Full Name' },
  { key: 'email', label: 'Email' },
  { key: 'phoneNumber', label: 'Phone Number' },
  { key: 'aadhaarNumber', label: 'Aadhaar Number' },
  { key: 'panNumber', label: 'PAN Number' },
  { key: 'address', label: 'Address' },
  { key: 'townName', label: 'Town Name' },
  { key: 'createdDate', label: 'Created Date' },
  { key: 'actions', label: 'Actions' },
]

const displayValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return '-'
  }

  return value
}

function CustomersTable({ customers, isLoading, onEditCustomer }) {
  return (
    <div className="transaction-table-wrap customers-table-wrap">
      {isLoading && (
        <div className="section-loader customers-loader">
          <LoadingSpinner label="Loading customers" />
        </div>
      )}

      <table className="table bank-table employee-customers-table mb-0">
        <thead>
          <tr>
            {customerColumns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {!isLoading && customers.map((customer, index) => (
            <tr key={customer.userId || customer.email || index}>
              {customerColumns.map((column) => {
                if (column.key === 'actions') {
                  return (
                    <td key={column.key}>
                      <button
                        className="employee-open-link customer-edit-action"
                        type="button"
                        onClick={() => onEditCustomer(customer.userId)}
                        disabled={!customer.userId}
                      >
                        <i className="bi bi-pencil-square" aria-hidden="true"></i>
                        <span>Edit</span>
                      </button>
                    </td>
                  )
                }

                return <td key={column.key}>{displayValue(customer[column.key])}</td>
              })}
            </tr>
          ))}

          {!isLoading && customers.length === 0 && (
            <tr>
              <td colSpan={customerColumns.length}>No customers found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default CustomersTable
