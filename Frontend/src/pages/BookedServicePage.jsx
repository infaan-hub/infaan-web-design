import { getPaymentGateway, normalizePaymentMethod } from "../lib/paymentGateways";

function normalizePhoneNumber(phoneNumber) {
  return (phoneNumber || "").replace(/[^\d]/g, "");
}

function BookedServicePage({ app }) {
  const { selectedBooking, navigate, formatPrice, setBookingPaymentStatus, markBookingDone, loading } = app;

  if (!selectedBooking) {
    return (
      <main className="main-content">
        <section className="section-card">
          <div className="form-card">
            <h3>No booking selected</h3>
            <p>Open a booking from the bookings services page to view all task, payment, and customer details.</p>
            <button type="button" className="solid-button" onClick={() => navigate("/bookings-services")}>
              Go to bookings
            </button>
          </div>
        </section>
      </main>
    );
  }

  const whatsappUrl = `https://wa.me/${normalizePhoneNumber(selectedBooking.contact_phone)}`;
  const paymentMethodLabel =
    selectedBooking.payment_method === "whatsapp"
      ? "WhatsApp Booking"
      : getPaymentGateway(normalizePaymentMethod(selectedBooking.payment_method)).label || "Not provided";

  return (
    <main className="main-content">
      <section className="section-card">
        <div className="section-headline">
          <p className="micro-label">booked service</p>
          <h2>Booked Service</h2>
        </div>

        <div className="package-detail-shell">
          <div className="package-card package-detail-card">
            <div className="package-topline">
              <span className="tier-pill">{selectedBooking.package_details?.tier}</span>
              <h4>{selectedBooking.package_details?.title}</h4>
            </div>
            <p>{selectedBooking.business_name}</p>

            <div className="selected-credentials">
              <div className="credential-card">
                <span className="micro-label">customer</span>
                <strong>{selectedBooking.user_details?.username}</strong>
              </div>
              <div className="credential-card">
                <span className="micro-label">system</span>
                <strong>{selectedBooking.system_details?.name || "Standard package"}</strong>
              </div>
              <div className="credential-card">
                <span className="micro-label">phone number</span>
                <strong>{selectedBooking.contact_phone}</strong>
              </div>
              <div className="credential-card">
                <span className="micro-label">email</span>
                <strong>{selectedBooking.contact_email}</strong>
              </div>
            </div>

            <div className="package-feature-panel">
              <p className="micro-label">task given</p>
              <ul>
                {(selectedBooking.package_details?.features || []).map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <p>{selectedBooking.notes || "No additional customer notes."}</p>
            </div>
          </div>

          <div className="package-card package-detail-card">
            <div className="package-feature-panel">
              <p className="micro-label">payment information</p>
              <div className="booking-info-grid">
                <div className="price-strip-card">
                  <strong>Payment status</strong>
                  <span>{selectedBooking.payment_status || "pending"}</span>
                </div>
                <div className="price-strip-card">
                  <strong>Payment method</strong>
                  <span>{paymentMethodLabel}</span>
                </div>
                <div className="price-strip-card">
                  <strong>Payment contact</strong>
                  <span>{selectedBooking.payment_contact || "Not provided"}</span>
                </div>
                <div className="price-strip-card">
                  <strong>Amount</strong>
                  <span>{formatPrice(selectedBooking.payment_amount || 0, selectedBooking.payment_currency || "TZS")}</span>
                </div>
              </div>
            </div>

            <div className="package-price-strip">
              <div className="price-strip-card">
                <strong>Service status</strong>
                <span>{selectedBooking.status}</span>
              </div>
              <div className="price-strip-card">
                <strong>Start date</strong>
                <span>{selectedBooking.start_date || "Not set"}</span>
              </div>
              <div className="price-strip-card">
                <strong>Package time</strong>
                <span>{selectedBooking.package_details?.billing_period}</span>
              </div>
            </div>

            <div className="hero-actions">
              <a className="solid-button booking-link-button" href={whatsappUrl} target="_blank" rel="noreferrer">
                Chat on WhatsApp
              </a>
              <button
                type="button"
                className="outline-button"
                onClick={() =>
                  setBookingPaymentStatus(selectedBooking.payment_status === "paid" ? "pending" : "paid")
                }
                disabled={loading}
              >
                {selectedBooking.payment_status === "paid" ? "Mark payment pending" : "Approve payment"}
              </button>
              <button type="button" className="solid-button" onClick={markBookingDone} disabled={loading}>
                Mark as done
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default BookedServicePage;
