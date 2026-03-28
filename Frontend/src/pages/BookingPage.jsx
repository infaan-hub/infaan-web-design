function BookingPage({ app }) {
  const { selectedPackage, selectedPrice, submitBooking, bookingSent, loading, lastBooking, currentUser } = app;
  const issuedAt = lastBooking?.created_at ? new Date(lastBooking.created_at) : new Date();
  const ticketId = lastBooking ? `INF${String(lastBooking.id).padStart(6, "0")}${issuedAt.getDate()}` : "Pending";

  return (
    <main className="main-content">
      <section className="section-card single-column-card">
        <div className="section-headline">
          <p className="micro-label">booking</p>
          <h2>/booking</h2>
        </div>

        {bookingSent && lastBooking ? (
          <div className="ticket-wrap">
            <div className="success-ticket">
              <div className="ticket-top">
                <div className="ticket-icon">🎉</div>
                <h3>Thank you!</h3>
                <p>Your booking has been issued successfully and sent to admin.</p>
              </div>

              <div className="ticket-dash" />

              <div className="ticket-meta">
                <div>
                  <span>Booking ID</span>
                  <strong>{ticketId}</strong>
                </div>
                <div>
                  <span>Amount</span>
                  <strong>
                    {lastBooking.package_details?.currency} {lastBooking.package_details?.amount}
                  </strong>
                </div>
                <div>
                  <span>Date & time</span>
                  <strong>
                    {issuedAt.toLocaleDateString()} · {issuedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </strong>
                </div>
              </div>

              <div className="ticket-payment-card">
                <div className="ticket-payment-logo">
                  <span className="dot-red" />
                  <span className="dot-gold" />
                </div>
                <div>
                  <strong>{currentUser?.first_name || currentUser?.username || "Customer"}</strong>
                  <span>{selectedPackage?.title || lastBooking.package_details?.title}</span>
                </div>
              </div>

              <div className="ticket-dash light" />

              <div className="ticket-barcode" aria-hidden="true">
                {Array.from({ length: 34 }).map((_, index) => (
                  <span key={index} style={{ height: `${28 + ((index * 7) % 26)}px` }} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="form-card">
            <h3>{selectedPackage?.title || "Selected package"}</h3>
            <p>{selectedPrice?.billing_period || "billing"} - {selectedPrice?.currency || ""} {selectedPrice?.amount || ""}</p>
            <button type="button" className="solid-button" onClick={submitBooking} disabled={loading || bookingSent}>
              {bookingSent ? "Booking sent" : "Send booking"}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

export default BookingPage;
