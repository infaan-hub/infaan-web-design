import { useEffect, useRef } from "react";

function BookingPage({ app }) {
  const {
    selectedPackage,
    selectedPrice,
    submitBooking,
    bookingSent,
    loading,
    lastBooking,
    currentUser,
    formatPrice,
    pendingPayment,
    navigate,
  } = app;
  const autoSubmitRef = useRef(false);
  const issuedAt = lastBooking?.created_at ? new Date(lastBooking.created_at) : new Date();
  const ticketId = lastBooking ? `INF${String(lastBooking.id).padStart(6, "0")}${issuedAt.getDate()}` : "Pending";
  const isAzamPayBooking =
    (lastBooking?.payment_method || pendingPayment?.method || "").toLowerCase() === "azampay";
  const bookingCallbackUrl = lastBooking?.azampay_callback_url || "";

  useEffect(() => {
    if (!selectedPackage || !selectedPrice) {
      return;
    }
    if (!pendingPayment || bookingSent || lastBooking || loading || autoSubmitRef.current) {
      return;
    }
    autoSubmitRef.current = true;
    submitBooking();
  }, [selectedPackage, selectedPrice, pendingPayment, bookingSent, lastBooking, loading, submitBooking]);

  return (
    <main className="main-content">
      <section className="section-card single-column-card">
        <div className="section-headline">
          <p className="micro-label">booking</p>
          <h2>Booking</h2>
        </div>

        {bookingSent && lastBooking ? (
          <div className="ticket-wrap">
            <div className="success-ticket">
              <div className="ticket-top">
                <div className="ticket-icon">IWD</div>
                <h3>{isAzamPayBooking ? "Booking created" : "Thank you!"}</h3>
                <p>
                  {isAzamPayBooking
                    ? "Your booking is pending payment. Use the callback URL below in the AzamPay request so payment updates can reach this system."
                    : "Your booking has been issued successfully and sent to admin."}
                </p>
              </div>

              <div className="ticket-dash" />

              <div className="ticket-meta">
                <div>
                  <span>Booking ID</span>
                  <strong>{ticketId}</strong>
                </div>
                <div>
                  <span>Amount</span>
                  <strong>{formatPrice(lastBooking.package_details?.amount, lastBooking.package_details?.currency)}</strong>
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

              {isAzamPayBooking && bookingCallbackUrl ? (
                <>
                  <div className="ticket-dash light" />
                  <div className="subscription-card booking-admin-card">
                    <span className="micro-label">AzamPay callback URL</span>
                    <strong>HTTP POST</strong>
                    <p>{bookingCallbackUrl}</p>
                  </div>
                </>
              ) : null}

              <div className="ticket-dash light" />

              <div className="ticket-barcode" aria-hidden="true">
                {Array.from({ length: 34 }).map((_, index) => (
                  <span key={index} style={{ height: `${28 + ((index * 7) % 26)}px` }} />
                ))}
              </div>
            </div>
          </div>
        ) : pendingPayment ? (
          <div className="form-card booking-status-card">
            <h3>Sending booking</h3>
            <p>
              We are submitting your selected package, package time, billing details, and payment procedure to the admin
              dashboard now.
            </p>

            <div className="booking-review-grid">
              <div className="subscription-card">
                <span className="micro-label">package</span>
                <strong>{selectedPackage?.title}</strong>
                <p>{selectedPrice?.billing_period}</p>
              </div>
              <div className="subscription-card">
                <span className="micro-label">payment</span>
                <strong>{pendingPayment.method === "azampay" ? "AzamPay" : pendingPayment.method === "mixx" ? "Mixx by Yas" : pendingPayment.method}</strong>
                <p>{formatPrice(selectedPrice?.amount || 0, selectedPrice?.currency || "USD")}</p>
              </div>
            </div>

            <button type="button" className="outline-button" onClick={() => navigate("/billing")} disabled={loading}>
              {loading ? "Sending..." : "Back to billing"}
            </button>
          </div>
        ) : (
          <div className="form-card">
            <h3>{selectedPackage?.title || "Selected package"}</h3>
            <p>
              {selectedPrice?.billing_period || "billing"} -{" "}
              {formatPrice(selectedPrice?.amount || "", selectedPrice?.currency || "USD")}
            </p>
            <div className="hero-actions">
              <button type="button" className="solid-button" onClick={() => navigate("/billing")}>
                Complete billing first
              </button>
              <button type="button" className="outline-button" onClick={() => navigate("/package")}>
                Change package
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export default BookingPage;
