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
    selectedSystem,
    formatPrice,
    confirmPayment,
  } = app;

  const subtotal = Number(selectedPrice?.amount || 0);
  const activeCurrency = selectedPrice?.currency || "USD";
  const serviceFeeByCurrency = {
    USD: 5,
    TZS: 15000,
  };
  const serviceFee = selectedPrice?.billing_period === "per_task" ? serviceFeeByCurrency[activeCurrency] || 0 : 0;
  const total = subtotal + serviceFee;

  return (
    <main className="main-content">
      <section className="section-card">
        <div className="pricing-heading">
          <p className="micro-label">billing</p>
          <h2>Billing details</h2>
          <span>Complete your payment and booking information.</span>
        </div>

        <div className="package-grid billing-grid">
          <div className="pricing-plan-card billing-summary-card">
            <div className={`pricing-plan-top pricing-tone-${selectedPackage?.tier || "silver"}`}>
              <span className="pricing-mini-pill">{selectedSystem ? "system" : selectedPackage?.tier || "package"}</span>
              <h4>{selectedSystem?.name || selectedPackage?.title || "Selected package"}</h4>
              <div className="pricing-amount">
                {selectedPrice?.billing_period === "per_task" ? (
                  <>
                    <strong>{formatPrice(selectedPrice?.amount || "0", activeCurrency)}</strong>
                    <span>fixed</span>
                  </>
                ) : (
                  <>
                    <strong>{formatPrice(selectedPrice?.amount || "0", activeCurrency)}</strong>
                    <span>/{selectedPrice?.billing_period || "plan"}</span>
                  </>
                )}
              </div>
              <p>{selectedSystem?.summary || selectedPackage?.description || "Choose a package and billing time to continue."}</p>
              <button
                type="button"
                className="pricing-cta"
                onClick={() => navigate(selectedSystem ? "/system-subscription-time" : "/package-time")}
              >
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
                <button
                  type="button"
                  className={`payment-method-tile ${paymentForm.method === "card" ? "payment-method-active" : ""}`}
                  onClick={() => updateField(setPaymentForm, "method", "card")}
                >
                  <span className="payment-radio" />
                  <strong>Mastercard</strong>
                </button>
                <button
                  type="button"
                  className={`payment-method-tile ${paymentForm.method === "visa" ? "payment-method-active" : ""}`}
                  onClick={() => updateField(setPaymentForm, "method", "visa")}
                >
                  <span className="payment-radio" />
                  <strong>Visa</strong>
                </button>
                <button
                  type="button"
                  className={`payment-method-tile ${paymentForm.method === "mixx" ? "payment-method-active" : ""}`}
                  onClick={() => updateField(setPaymentForm, "method", "mixx")}
                >
                  <span className="payment-radio" />
                  <strong>Mixx by Yas</strong>
                </button>
              </div>

              {paymentForm.method === "mixx" ? (
                <label className="payment-field">
                  <span>Phone number</span>
                  <input
                    value={paymentForm.phone_number}
                    onChange={(event) => updateField(setPaymentForm, "phone_number", event.target.value)}
                    placeholder="Phone number to send money"
                  />
                </label>
              ) : (
                <>
                  <div className="payment-field-grid payment-field-grid-wide">
                    <label className="payment-field">
                      <span>Cardholder name</span>
                      <input
                        value={paymentForm.card_name}
                        onChange={(event) => updateField(setPaymentForm, "card_name", event.target.value)}
                        placeholder="Full name on card"
                      />
                    </label>
                    <label className="payment-field">
                      <span>Card number</span>
                      <input
                        value={paymentForm.card_number}
                        onChange={(event) => updateField(setPaymentForm, "card_number", event.target.value)}
                        placeholder="0000 0000 0000 0000"
                      />
                    </label>
                  </div>
                  <div className="payment-field-grid">
                    <label className="payment-field">
                      <span>Expiry date</span>
                      <input
                        value={paymentForm.expiry_date}
                        onChange={(event) => updateField(setPaymentForm, "expiry_date", event.target.value)}
                        placeholder="MM/YY"
                      />
                    </label>
                    <label className="payment-field">
                      <span>CVV</span>
                      <input value={paymentForm.cvv} onChange={(event) => updateField(setPaymentForm, "cvv", event.target.value)} placeholder="CVV" />
                    </label>
                  </div>
                </>
              )}

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

              <button type="button" className="payment-confirm-button" onClick={confirmPayment}>
                Confirm payment
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

export default BillingPage;
