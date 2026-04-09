import { getPaymentGateway, normalizePaymentMethod } from "../lib/paymentGateways";

function BillingHistoryPage({ app }) {
  const { subscriptions, formatPrice, navigate } = app;
  const completedItems = [...subscriptions]
    .filter((item) => item.status === "completed")
    .sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0));

  return (
    <main className="main-content">
      <section className="section-card">
        <div className="section-headline">
          <div>
            <p className="micro-label">billing history</p>
            <h2>Completed bookings</h2>
          </div>
        </div>

        {completedItems.length ? (
          <div className="subscription-stack">
            {completedItems.map((item) => (
              <article key={item.id} className="subscription-card">
                <strong>{item.package_details?.title || "Package"}</strong>
                <p>{item.package_details?.service || "-"}</p>
                <p>{item.business_name || "-"}</p>
                <p>{item.contact_phone || "-"}</p>
                <p>{getPaymentGateway(normalizePaymentMethod(item.payment_method)).label}</p>
                <p>
                  {item.package_details?.billing_period || "-"} ·{" "}
                  {formatPrice(item.payment_amount || item.package_details?.amount || 0, item.payment_currency || item.package_details?.currency || "TZS")}
                </p>
                <span className={`status-pill status-${item.status}`}>{item.status}</span>
              </article>
            ))}
          </div>
        ) : (
          <div className="form-card single-column-card">
            <h3>No completed billing yet</h3>
            <p>Your finished bookings will appear here after the admin marks the service as done.</p>
            <button type="button" className="solid-button" onClick={() => navigate("/dashboard")}>
              Back to dashboard
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

export default BillingHistoryPage;
