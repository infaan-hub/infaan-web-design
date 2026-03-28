function BookingsServicesPage({ app }) {
  const { subscriptions, formatPrice } = app;

  return (
    <main className="main-content">
      <section className="section-card">
        <div className="section-headline">
          <p className="micro-label">bookings services</p>
          <h2>Bookings Services</h2>
        </div>
        <div className="subscription-stack">
          {subscriptions.map((booking) => (
            <div key={booking.id} className="subscription-card">
              <strong>{booking.user_details?.username}</strong>
              <p>{booking.contact_email}</p>
              <p>{booking.contact_phone}</p>
              <p>{booking.business_name}</p>
              <p>{booking.package_details?.title}</p>
              <p>{booking.package_details?.billing_period} - {formatPrice(booking.package_details?.amount, booking.package_details?.currency)}</p>
              <span className={`status-pill status-${booking.status}`}>{booking.status}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default BookingsServicesPage;
