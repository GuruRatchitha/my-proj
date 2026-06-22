function Customers() {
  return (
    <div className="dashboard-main">
      <section className="title-block employee-title-row">
        <div>
          <h1>Customers</h1>
        </div>
        <button className="add-payment" type="button">
          <i className="bi bi-person-plus" aria-hidden="true"></i>
          <span>Add Customer</span>
        </button>
      </section>
    </div>
  )
}

export default Customers
