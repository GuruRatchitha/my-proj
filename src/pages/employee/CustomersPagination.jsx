function CustomersPagination({
  currentPage,
  totalPages,
  totalCustomers,
  isFirstPage,
  isLastPage,
  isLoading,
  onPrevious,
  onNext,
}) {
  return (
    <div className="pagination-bar customers-pagination" aria-label="Customer pagination">
      <div className="customers-page-summary">
        <span>Total customers: {totalCustomers}</span>
        <span>Current page: {currentPage}</span>
        <span>Total pages: {totalPages}</span>
      </div>

      <div className="pagination-actions">
        <button type="button" onClick={onPrevious} disabled={isFirstPage || isLoading}>
          <i className="bi bi-chevron-left" aria-hidden="true"></i>
          Previous
        </button>
        <strong>
          Page {currentPage} of {totalPages}
        </strong>
        <button type="button" onClick={onNext} disabled={isLastPage || isLoading}>
          Next
          <i className="bi bi-chevron-right" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  )
}

export default CustomersPagination
