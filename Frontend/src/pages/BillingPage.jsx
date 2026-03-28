function BillingPage({ app }) {
  const {
    paymentForm,
    setPaymentForm,
    updateField,
    subscriptionForm,
    setSubscriptionForm,
    navigate,
    selectedPackage,
    selectedPrice,
    formatPrice,
    confirmPayment,
    businessWhatsAppNumber,
    businessMobileMoneyNumber,
  } = app;
  const subtotal = Number(selectedPrice?.amount || 0);
  const serviceFee = selectedPrice?.billing_period === "per_task" ? 5 : 0;
  const total = subtotal + serviceFee;
  const activeCurrency = selectedPrice?.currency || "USD";

  return (
    <main className="main-content">
      <section className="section-card">
        <div className="pricing-heading">
          <p className="micro-label">billing</p>
          <h2>Manual payment</h2>
          <span>Choose how you want to pay, then send your booking for admin approval.</span>
        </div>

        <div className="package-grid billing-grid">
          <div className="pricing-plan-card billing-summary-card">
            <div className={`pricing-plan-top pricing-tone-${selectedPackage?.tier || "silver"}`}>
              <span className="pricing-mini-pill">{selectedPackage?.tier || "package"}</span>
              <h4>{selectedPackage?.title || "Selected package"}</h4>
              <div className="pricing-amount">
                {selectedPrice?.billing_period === "per_task" ? (
                  <>
                    <strong>Custom</strong>
                    <span>per task</span>
                  </>
                ) : (
                  <>
                    <strong>{formatPrice(selectedPrice?.amount || "0", activeCurrency)}</strong>
                    <span>/{selectedPrice?.billing_period || "plan"}</span>
                  </>
                )}
              </div>
              <p>{selectedPackage?.description || "Choose a package and billing time to continue."}</p>
              <button type="button" className="pricing-cta" onClick={() => navigate("/package-time")}>
                Change package time
              </button>
            </div>

            <ul className="pricing-feature-list">
              {(selectedPackage?.features || []).map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </div>

          <form className="pricing-plan-card billing-form-card">
            <div className="pricing-plan-top billing-top-panel">
              <span className="pricing-mini-pill">customer details</span>
              <h4>Booking information</h4>
              <p>Fill in the customer and project details for this order.</p>
            </div>

            <div className="billing-form-fields">
              <input
                value={subscriptionForm.business_name}
                onChange={(event) => updateField(setSubscriptionForm, "business_name", event.target.value)}
                placeholder="Business name"
              />
              <input
                type="email"
                value={subscriptionForm.contact_email}
                onChange={(event) => updateField(setSubscriptionForm, "contact_email", event.target.value)}
                placeholder="Contact email"
              />
              <input
                value={subscriptionForm.contact_phone}
                onChange={(event) => updateField(setSubscriptionForm, "contact_phone", event.target.value)}
                placeholder="Contact phone"
              />
              <input
                type="date"
                value={subscriptionForm.start_date}
                onChange={(event) => updateField(setSubscriptionForm, "start_date", event.target.value)}
              />
              <textarea
                value={subscriptionForm.notes}
                onChange={(event) => updateField(setSubscriptionForm, "notes", event.target.value)}
                placeholder="Project notes"
              />
            </div>
          </form>

          <form className="pricing-plan-card billing-form-card">
            <div className="pricing-plan-top billing-top-panel">
              <div className="payment-steps">
                <div className="payment-step payment-step-done">
                  <span>1</span>
                  <small>Customer details</small>
                </div>
                <div className="payment-step payment-step-active">
                  <span>2</span>
                  <small>Payment method</small>
                </div>
                <div className="payment-step">
                  <span>3</span>
                  <small>Confirmation</small>
                </div>
              </div>
            </div>

            <div className="billing-form-fields">
              <div className="payment-method-grid">
                <button type="button" className={`payment-method-tile ${paymentForm.method === "mixx" ? "payment-method-active" : ""}`} onClick={() => updateField(setPaymentForm, "method", "mixx")}>
                  <span className="payment-radio" />
                  <strong>Mixx Manual</strong>
                </button>
                <button type="button" className={`payment-method-tile ${paymentForm.method === "whatsapp" ? "payment-method-active" : ""}`} onClick={() => updateField(setPaymentForm, "method", "whatsapp")}>
                  <span className="payment-radio" />
                  <strong>WhatsApp Booking</strong>
                </button>
              </div>

              {paymentForm.method === "mixx" ? (
                <label className="payment-field">
                  <span>Your phone number</span>
                  <input value={paymentForm.phone_number} onChange={(event) => updateField(setPaymentForm, "phone_number", event.target.value)} placeholder="Phone number used to send Mixx payment" />
                </label>
              ) : (
                <div className="payment-helper-box">
                  <p>Use WhatsApp to confirm your package, then send payment manually and wait for admin approval.</p>
                </div>
              )}

              <div className="payment-helper-box">
                <p>
                  Mixx number: <strong>{businessMobileMoneyNumber || "Set VITE_BUSINESS_MOBILE_MONEY_NUMBER to show your real number."}</strong>
                </p>
                <p>
                  WhatsApp number: <strong>{businessWhatsAppNumber || "Set VITE_BUSINESS_WHATSAPP_NUMBER to show your real number."}</strong>
                </p>
                <p>After payment, admin will verify and activate the subscription manually.</p>
              </div>

              <div className="payment-total-box">
                <div className="payment-total-row">
                  <span>Subtotal</span>
                  <strong>{formatPrice(subtotal, activeCurrency)}</strong>
                </div>
                <div className="payment-total-row">
                  <span>Service fee</span>
                  <strong>{formatPrice(serviceFee, activeCurrency)}</strong>
                </div>
                <div className="payment-total-row payment-total-final">
                  <span>Total amount</span>
                  <strong>{formatPrice(total, activeCurrency)}</strong>
                </div>
              </div>

              <button type="button" className="payment-confirm-button" onClick={confirmPayment}>Send booking</button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

export default BillingPage;
