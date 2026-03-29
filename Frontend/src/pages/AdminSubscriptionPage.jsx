function AdminSubscriptionPage({ app }) {
  const { subscriptions, formatPrice, updateSubscription, loading } = app;

  function patchSubscription(subscriptionId, updates, message) {
    updateSubscription(subscriptionId, updates, message);
  }

  return (
    <main className="main-content">
      <section className="section-card">
        <div className="section-headline">
          <div>
            <p className="micro-label">admin subscription</p>
            <h2>Manage subscriptions</h2>
          </div>
        </div>

        <div className="subscription-stack">
          {subscriptions.map((subscription) => {
            const access = subscription.service_access || {};
            const status = access.status || subscription.status || "pending";

            return (
              <article key={subscription.id} className="subscription-card subscription-detail-card">
                <div className="subscription-detail-head">
                  <div>
                    <strong>{subscription.user_details?.username || "-"}</strong>
                    <p>{subscription.package_details?.title || "-"}</p>
                  </div>
                  <span className={`status-pill status-${status}`}>{status.replace("_", " ")}</span>
                </div>

                <div className="subscription-detail-grid">
                  <div className="credential-card">
                    <span className="micro-label">service</span>
                    <strong>{subscription.package_details?.service || "-"}</strong>
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
                    <input
                      type="date"
                      defaultValue={subscription.end_date || ""}
                      onBlur={(event) =>
                        patchSubscription(
                          subscription.id,
                          { end_date: event.target.value || null },
                          "Subscription end date updated."
                        )
                      }
                    />
                  </div>
                  <div className="credential-card">
                    <span className="micro-label">next billing</span>
                    <strong>{subscription.next_billing_date || "-"}</strong>
                  </div>
                  <div className="credential-card">
                    <span className="micro-label">payment</span>
                    <strong>{subscription.payment_status || "-"}</strong>
                  </div>
                </div>

                <div className="hero-actions">
                  <button
                    type="button"
                    className="solid-button"
                    disabled={loading}
                    onClick={() =>
                      patchSubscription(subscription.id, { status: "active", payment_status: "paid" }, "Subscription activated.")
                    }
                  >
                    Activate
                  </button>
                  <button
                    type="button"
                    className="outline-button"
                    disabled={loading}
                    onClick={() => patchSubscription(subscription.id, { status: "suspended" }, "Subscription suspended.")}
                  >
                    Suspend
                  </button>
                  <button
                    type="button"
                    className="outline-button"
                    disabled={loading}
                    onClick={() => patchSubscription(subscription.id, { status: "cancelled" }, "Subscription cancelled.")}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="header-button"
                    disabled={loading}
                    onClick={() => patchSubscription(subscription.id, { payment_status: "pending", status: "suspended" }, "User subscription blocked.")}
                  >
                    Block subscription
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

export default AdminSubscriptionPage;
