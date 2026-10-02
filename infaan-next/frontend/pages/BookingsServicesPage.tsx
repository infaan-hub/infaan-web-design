function BookingsServicesPage({ app }) {
  const { subscriptions, formatPrice, openBooking } = app;
  const orderedBookings = [...subscriptions]
    .filter((booking) => booking.status !== "completed")
    .sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0));

  return (
    <main className="main-content">
      <section className="section-card">
        <div className="section-headline">
          <p className="micro-label">bookings services</p>
          <h2>Bookings Services</h2>
        </div>

        <div className="subscription-stack">
          {orderedBookings.map((booking) => (
            <div key={booking.id} className="subscription-card booking-admin-card">
              <div className="booking-admin-topline">
                <div>
                  <strong>{booking.user_details?.username}</strong>
                  <p>{booking.business_name}</p>
                </div>
                <div className="booking-status-group">
                  <span className={`status-pill status-${booking.status}`}>{booking.status}</span>
                  <span className={`status-pill status-payment-${booking.payment_status || "pending"}`}>
                    payment {booking.payment_status || "pending"}
                  </span>
                </div>
              </div>
              <p>{booking.contact_email}</p>
              <p>{booking.contact_phone}</p>
              <p>{booking.package_details?.title}</p>
              <p>
                {booking.package_details?.billing_period} -{" "}
                {formatPrice(booking.package_details?.amount, booking.package_details?.currency)}
              </p>
              <div className="hero-actions">
                <button type="button" className="solid-button" onClick={() => openBooking(booking.id)}>
                  Open booking
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default BookingsServicesPage;
