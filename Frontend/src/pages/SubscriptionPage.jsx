function SubscriptionPage({ app }) {
  const { subscriptions, formatPrice, navigate } = app;

  return (
    <main className="main-content">
      <section className="section-card">
        <div className="section-headline">
          <div>
            <p className="micro-label">subscription</p>
            <h2>Subscription information</h2>
          </div>
        </div>

        {subscriptions.length ? (
          <div className="subscription-stack">
            {subscriptions.map((subscription) => {
              const access = subscription.service_access || {};
              const status = access.status || subscription.status || "pending";

              return (
                <article key={subscription.id} className="subscription-card subscription-detail-card">
                  <div className="subscription-detail-head">
                    <div>
                      <strong>{subscription.package_details?.title || "Package"}</strong>
                      <p>{subscription.package_details?.service || "-"}</p>
                    </div>
                    <span className={`status-pill status-${status}`}>{status.replace("_", " ")}</span>
                  </div>

                  <div className="subscription-detail-grid">
                    <div className="credential-card">
                      <span className="micro-label">billing cycle</span>
                      <strong>{subscription.package_details?.billing_period || "-"}</strong>
                    </div>
                    <div className="credential-card">
                      <span className="micro-label">amount</span>
                      <strong>{formatPrice(subscription.payment_amount || subscription.package_details?.amount, subscription.payment_currency || subscription.package_details?.currency || "USD")}</strong>
                    </div>
                    <div className="credential-card">
                      <span className="micro-label">start date</span>
                      <strong>{subscription.start_date || "-"}</strong>
                    </div>
                    <div className="credential-card">
                      <span className="micro-label">end date</span>
                      <strong>{subscription.end_date || "-"}</strong>
                    </div>
                    <div className="credential-card">
                      <span className="micro-label">next billing</span>
                      <strong>{subscription.next_billing_date || "-"}</strong>
                    </div>
                    <div className="credential-card">
                      <span className="micro-label">payment</span>
                      <strong>{subscription.payment_status || "-"}</strong>
                    </div>
                    <div className="credential-card">
                      <span className="micro-label">service access</span>
                      <strong>{access.can_access ? "Allowed" : "Blocked"}</strong>
                    </div>
                    <div className="credential-card">
                      <span className="micro-label">grace period</span>
                      <strong>{subscription.grace_period_days ?? access.grace_period_days ?? 0} days</strong>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="form-card">
            <h3>No subscription yet</h3>
            <p>Once you finish payment and service activation, your subscription details will appear here.</p>
            <button type="button" className="solid-button" onClick={() => navigate("/package")}>
              Choose package
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

export default SubscriptionPage;
