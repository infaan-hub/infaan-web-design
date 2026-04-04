function SystemSubscriptionPage({ app }) {
  const {
    subscriptionSystems,
    subscriptionSystemsError,
    subscriptions,
    selectedSystem,
    formatPrice,
    selectSystem,
    beginSystemSubscription,
    navigate,
  } = app;

  const systemSubscriptions = subscriptions.filter((subscription) => subscription.system_details);

  return (
    <main className="main-content">
      <section className="package-browser-hero">
        <div className="package-browser-copy">
          <p className="micro-label">system subscription</p>
          <h2>Browse systems, inspect previews, and subscribe with normal billing flow.</h2>
          <p>
            Each system card opens into a detailed view with one front image, five system preview images, a dedicated
            monthly or yearly subscription step, billing, receipt, and subscription access control.
          </p>
        </div>
        <div className="package-browser-summary">
          <div className="summary-card">
            <span>{subscriptionSystems.length}</span>
            <p>Available systems</p>
          </div>
          <div className="summary-card">
            <span>{systemSubscriptions.length}</span>
            <p>Active records</p>
          </div>
        </div>
      </section>

      {selectedSystem ? (
        <section className="section-card">
          <div className="section-headline">
            <div>
              <p className="micro-label">selected system</p>
              <h2>{selectedSystem.name}</h2>
            </div>
            <button type="button" className="outline-button" onClick={() => selectSystem("")}>
              Back to all systems
            </button>
          </div>

          <div className="system-detail-shell">
            <div className="service-catalog-block">
              <div
                className="service-catalog-cover system-cover-large"
                style={{ backgroundImage: `url(${selectedSystem.cover_image})` }}
              />
              <div className="service-catalog-copy">
                <p className="micro-label">{selectedSystem.service_name || "system subscription"}</p>
                <h3>{selectedSystem.name}</h3>
                <p>{selectedSystem.summary}</p>
                <p>{selectedSystem.details}</p>
                {selectedSystem.display_price !== null && selectedSystem.display_price !== undefined && selectedSystem.display_price !== "" ? (
                  <p>{formatPrice(selectedSystem.display_price, selectedSystem.display_price_currency || "USD")}</p>
                ) : null}
                {selectedSystem.system_url ? (
                  <a className="outline-button system-url-button" href={selectedSystem.system_url} target="_blank" rel="noreferrer">
                    Open system URL
                  </a>
                ) : null}
              </div>
            </div>

            <div className="system-gallery-grid">
              {(selectedSystem.gallery_images || []).map((image, index) => (
                <article key={`${selectedSystem.id}-${index + 1}`} className="portfolio-home-card system-gallery-card">
                  <div className="portfolio-home-image" style={{ backgroundImage: `url(${image})` }}>
                    <span className="portfolio-image-badge">Part {index + 1}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="section-headline">
            <div>
              <p className="micro-label">subscription flow</p>
              <h2>Choose time, then continue to billing</h2>
            </div>
          </div>

          <div className="subscription-detail-grid">
            <div className="credential-card">
              <span className="micro-label">available plans</span>
              <strong>Monthly and yearly</strong>
            </div>
            <div className="credential-card">
              <span className="micro-label">yearly billing</span>
              <strong>12x monthly system price</strong>
            </div>
            <div className="credential-card">
              <span className="micro-label">billing flow</span>
              <strong>/system-subscription-time to /billing</strong>
            </div>
            <div className="credential-card">
              <span className="micro-label">starting price</span>
              <strong>
                {selectedSystem.display_price !== null && selectedSystem.display_price !== undefined && selectedSystem.display_price !== ""
                  ? formatPrice(selectedSystem.display_price, selectedSystem.display_price_currency || "USD")
                  : "Available on next step"}
              </strong>
            </div>
          </div>

          <div className="hero-actions">
            <button type="button" className="solid-button" onClick={() => beginSystemSubscription(selectedSystem.id)}>
              Subscribe
            </button>
            <button type="button" className="outline-button" onClick={() => navigate("/system-subscription-time")}>
              View time options
            </button>
          </div>
        </section>
      ) : null}

      <section className="section-block">
        <div className="section-headline">
          <div>
            <p className="micro-label">all systems</p>
            <h2>System cards</h2>
          </div>
        </div>

        {subscriptionSystems.length ? (
          <div className="service-visual-grid">
            {subscriptionSystems.map((system) => (
              <article
                key={system.id}
                className="visual-card visual-card-action system-subscription-card"
                onClick={() => selectSystem(system.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    selectSystem(system.id);
                  }
                }}
              >
                <div className="visual-image system-subscription-image" style={{ backgroundImage: `url(${system.cover_image})` }} />
                <div className="visual-copy system-subscription-copy">
                  <span className="system-subscription-pill">{system.service_name || "System subscription"}</span>
                  <h3>{system.name}</h3>
                  <p>{system.summary}</p>
                  <strong className="system-subscription-link">Open previews and subscribe</strong>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="form-card">
            <h3>No system card yet</h3>
            <p>{subscriptionSystemsError || "Admin can add a system with one front image and five gallery images, then customers will subscribe here."}</p>
            <button type="button" className="solid-button" onClick={() => navigate("/package")}>
              View standard packages
            </button>
          </div>
        )}
      </section>

      <section className="section-card">
        <div className="section-headline">
          <div>
            <p className="micro-label">subscription tracking</p>
            <h2>System subscription records</h2>
          </div>
        </div>

        {systemSubscriptions.length ? (
          <div className="subscription-stack">
            {systemSubscriptions.map((subscription) => (
              <article key={subscription.id} className="subscription-card subscription-detail-card">
                <div className="subscription-detail-head">
                  <div>
                    <strong>{subscription.system_details?.name || "System"}</strong>
                    <p>{subscription.package_details?.title || "-"}</p>
                  </div>
                  <span className={`status-pill status-${subscription.status || "pending"}`}>
                    {(subscription.status || "pending").replace("_", " ")}
                  </span>
                </div>

                <div className="subscription-detail-grid">
                  <div className="credential-card">
                    <span className="micro-label">time</span>
                    <strong>{subscription.package_details?.billing_period || "-"}</strong>
                  </div>
                  <div className="credential-card">
                    <span className="micro-label">system URL</span>
                    <strong>{subscription.system_details?.system_url || "-"}</strong>
                  </div>
                  <div className="credential-card">
                    <span className="micro-label">billing</span>
                    <strong>
                      {formatPrice(
                        subscription.payment_amount || subscription.package_details?.amount,
                        subscription.payment_currency || subscription.package_details?.currency || "USD"
                      )}
                    </strong>
                  </div>
                  <div className="credential-card">
                    <span className="micro-label">receipt/payment</span>
                    <strong>{subscription.payment_status || "-"}</strong>
                  </div>
                  <div className="credential-card">
                    <span className="micro-label">end date</span>
                    <strong>{subscription.end_date || "-"}</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="form-card">
            <h3>No system subscription yet</h3>
            <p>After checkout, the system subscription timing, billing, payment, and receipt history will appear here.</p>
          </div>
        )}
      </section>
    </main>
  );
}

export default SystemSubscriptionPage;
