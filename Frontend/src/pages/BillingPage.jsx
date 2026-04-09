import { PAYMENT_GATEWAY_LIST, getPaymentGateway, normalizePaymentMethod } from "../lib/paymentGateways";

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
  const activeCurrency = selectedPrice?.currency || "TZS";
  const serviceFeeByCurrency = {
    TZS: 15000,
  };
  const serviceFee = selectedPrice?.billing_period === "per_task" ? serviceFeeByCurrency[activeCurrency] || 0 : 0;
  const total = subtotal + serviceFee;
  const activeGateway = getPaymentGateway(paymentForm.method);
  const activeMethod = normalizePaymentMethod(paymentForm.method);
  const securityCodeLabel = activeMethod === "amex" ? "CID" : "CVV";

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
                id="business_name"
                name="business_name"
                value={subscriptionForm.business_name}
                onChange={(event) => updateField(setSubscriptionForm, "business_name", event.target.value)}
                placeholder="Business name"
              />
              <input
                id="contact_email"
                name="contact_email"
                type="email"
                value={subscriptionForm.contact_email}
                onChange={(event) => updateField(setSubscriptionForm, "contact_email", event.target.value)}
                placeholder="Contact email"
              />
              <input
                id="contact_phone"
                name="contact_phone"
                value={subscriptionForm.contact_phone}
                onChange={(event) => updateField(setSubscriptionForm, "contact_phone", event.target.value)}
                placeholder="Contact phone"
              />
              <input
                id="start_date"
                name="start_date"
                type="date"
                value={subscriptionForm.start_date}
                onChange={(event) => updateField(setSubscriptionForm, "start_date", event.target.value)}
              />
              <textarea
                id="notes"
                name="notes"
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
                {PAYMENT_GATEWAY_LIST.map((gateway) => (
                  <button
                    key={gateway.key}
                    type="button"
                    className={`payment-method-tile ${activeMethod === gateway.key ? "payment-method-active" : ""}`}
                    onClick={() => updateField(setPaymentForm, "method", gateway.key)}
                  >
                    <img className="payment-method-logo" src={gateway.image} alt={`${gateway.label} logo`} loading="lazy" />
                    <div className="payment-method-meta">
                      <span className="payment-radio" />
                      <strong>{gateway.label}</strong>
                    </div>
                  </button>
                ))}
              </div>

              <div className="payment-helper-box">
                Selected gateway: <strong>{activeGateway.label}</strong>
              </div>

              {activeGateway.type === "mobile" ? (
                <label className="payment-field">
                  <span>Phone number</span>
                  <input
                    id="mixx_phone_number"
                    name="mixx_phone_number"
                    value={paymentForm.phone_number}
                    onChange={(event) => updateField(setPaymentForm, "phone_number", event.target.value)}
                    placeholder="Phone number to send money"
                  />
                </label>
              ) : activeGateway.type === "paypal" ? (
                <>
                  <label className="payment-field">
                    <span>PayPal account email</span>
                    <input
                      id="paypal_email"
                      name="paypal_email"
                      type="email"
                      value={paymentForm.paypal_email}
                      onChange={(event) => updateField(setPaymentForm, "paypal_email", event.target.value)}
                      placeholder="paypal@email.com"
                    />
                  </label>
                  <label className="payment-field">
                    <span>Account holder</span>
                    <input
                      id="paypal_account_name"
                      name="paypal_account_name"
                      value={paymentForm.card_name}
                      onChange={(event) => updateField(setPaymentForm, "card_name", event.target.value)}
                      placeholder="Account holder full name"
                    />
                  </label>
                </>
              ) : (
                <>
                  <div className="payment-field-grid payment-field-grid-wide">
                    <label className="payment-field">
                      <span>Cardholder name</span>
                      <input
                        id="card_name"
                        name="card_name"
                        value={paymentForm.card_name}
                        onChange={(event) => updateField(setPaymentForm, "card_name", event.target.value)}
                        placeholder="Full name on card"
                      />
                    </label>
                    <label className="payment-field">
                      <span>Card number</span>
                      <input
                        id="card_number"
                        name="card_number"
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
                        id="expiry_date"
                        name="expiry_date"
                        value={paymentForm.expiry_date}
                        onChange={(event) => updateField(setPaymentForm, "expiry_date", event.target.value)}
                        placeholder="MM/YY"
                      />
                    </label>
                    <label className="payment-field">
                      <span>{securityCodeLabel}</span>
                      <input
                        id="cvv"
                        name="cvv"
                        value={paymentForm.cvv}
                        onChange={(event) => updateField(setPaymentForm, "cvv", event.target.value)}
                        placeholder={securityCodeLabel}
                      />
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
