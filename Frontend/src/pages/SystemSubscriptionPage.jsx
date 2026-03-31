import { formatServiceCategoryLabel, getServiceImage, getSystemServices } from "../lib/serviceCatalog";

function SystemSubscriptionPage({ app }) {
  const {
    groupedPackages,
    subscriptions,
    selectedPackage,
    selectedService,
    formatPrice,
    selectPackage,
    continueToPackageTime,
    navigate,
  } = app;

  const systemServices = getSystemServices(groupedPackages);
  const systemSubscriptions = subscriptions.filter((subscription) => {
    const packageService = String(subscription.package_details?.service || "").toLowerCase();
    const packageTitle = String(subscription.package_details?.title || "").toLowerCase();
    const notes = String(subscription.notes || "").toLowerCase();

    return [packageService, packageTitle, notes].some((value) =>
      ["system", "subscription", "hire", "weekly", "monthly", "yearly"].some((keyword) => value.includes(keyword))
    );
  });

  return (
    <main className="main-content">
      <section className="package-browser-hero">
        <div className="package-browser-copy">
          <p className="micro-label">system subscription</p>
          <h2>View hireable systems and subscribe by time.</h2>
          <p>
            Open a system, review the available package, follow weekly, monthly, or yearly time selection, then
            continue with normal billing, payment, and receipt flow.
          </p>
        </div>
        <div className="package-browser-summary">
          <div className="summary-card">
            <span>{systemServices.length}</span>
            <p>System services</p>
          </div>
          <div className="summary-card">
            <span>{systemServices.reduce((total, service) => total + service.packages.length, 0)}</span>
            <p>Packages ready</p>
          </div>
        </div>
      </section>

      {selectedPackage ? (
        <section className="section-card">
          <div className="section-headline">
            <div>
              <p className="micro-label">selected system</p>
              <h2>{selectedPackage.title}</h2>
            </div>
          </div>

          <div className="package-grid">
            <article className="service-catalog-block">
              <div className="service-catalog-head">
                <div
                  className="service-catalog-cover"
                  style={{ backgroundImage: `url(${getServiceImage(selectedService)})` }}
                />
                <div className="service-catalog-copy">
                  <p className="micro-label">{selectedPackage.tier}</p>
                  <h3>{selectedPackage.title}</h3>
                  <p>{selectedPackage.description}</p>
                  <button
                    type="button"
                    className="solid-button"
                    onClick={() => continueToPackageTime(selectedPackage.id)}
                  >
                    Continue to subscribe
                  </button>
                </div>
              </div>
            </article>
          </div>
        </section>
      ) : null}

      <section className="section-block">
        <div className="section-headline">
          <div>
            <p className="micro-label">hire systems</p>
            <h2>Available systems to subscribe</h2>
          </div>
        </div>

        {systemServices.length ? (
          <div className="package-catalog">
            {systemServices.map((service) => (
              <article key={service.id} className="service-catalog-block">
                <div className="service-catalog-head">
                  <div
                    className="service-catalog-cover"
                    style={{ backgroundImage: `url(${getServiceImage(service)})` }}
                  />
                  <div className="service-catalog-copy">
                    <p className="micro-label">{formatServiceCategoryLabel(service.category)}</p>
                    <h3>{service.name}</h3>
                    <p>{service.details || service.short_description}</p>
                  </div>
                </div>

                <div className="service-package-track">
                  {service.packages.map((pkg) => {
                    const primaryPrice =
                      pkg.prices.find((price) => price.billing_period === "monthly") || pkg.prices[0];

                    return (
                      <div key={pkg.id} className={`package-card tone-${pkg.tier} catalog-package-card`}>
                        <div className="catalog-package-top">
                          <span className="tier-pill">{pkg.tier}</span>
                          <h4>{pkg.title}</h4>
                          <p>{pkg.description}</p>
                        </div>

                        <div className="catalog-package-price">
                          <strong>
                            {primaryPrice?.billing_period === "per_task"
                              ? "Custom"
                              : formatPrice(primaryPrice?.amount || 0, primaryPrice?.currency || "USD")}
                          </strong>
                          <span>
                            {primaryPrice?.billing_period === "per_task"
                              ? "per task"
                              : `/${primaryPrice?.billing_period || "month"}`}
                          </span>
                        </div>

                        <ul className="catalog-feature-list">
                          {pkg.features.map((feature) => (
                            <li key={feature}>{feature}</li>
                          ))}
                        </ul>

                        <div className="hero-actions">
                          <button
                            type="button"
                            className="solid-button"
                            onClick={() => {
                              selectPackage(pkg.id);
                              continueToPackageTime(pkg.id);
                            }}
                          >
                            Subscribe now
                          </button>
                          <button
                            type="button"
                            className="outline-button"
                            onClick={() => selectPackage(pkg.id)}
                          >
                            View system
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="form-card">
            <h3>No system package posted yet</h3>
            <p>
              Add a service with category like system subscription, system developing, or maintenance, then attach
              packages to make it available here.
            </p>
            <button type="button" className="solid-button" onClick={() => navigate("/package")}>
              View all packages
            </button>
          </div>
        )}
      </section>

      <section className="section-card">
        <div className="section-headline">
          <div>
            <p className="micro-label">subscription tracking</p>
            <h2>Billing, payment, and receipt follow-up</h2>
          </div>
        </div>

        {systemSubscriptions.length ? (
          <div className="subscription-stack">
            {systemSubscriptions.map((subscription) => (
              <article key={subscription.id} className="subscription-card subscription-detail-card">
                <div className="subscription-detail-head">
                  <div>
                    <strong>{subscription.package_details?.title || "System package"}</strong>
                    <p>{subscription.package_details?.service || "-"}</p>
                  </div>
                  <span className={`status-pill status-${subscription.status || "pending"}`}>
                    {(subscription.status || "pending").replace("_", " ")}
                  </span>
                </div>

                <div className="subscription-detail-grid">
                  <div className="credential-card">
                    <span className="micro-label">billing period</span>
                    <strong>{subscription.package_details?.billing_period || "-"}</strong>
                  </div>
                  <div className="credential-card">
                    <span className="micro-label">payment</span>
                    <strong>{subscription.payment_status || "-"}</strong>
                  </div>
                  <div className="credential-card">
                    <span className="micro-label">amount</span>
                    <strong>
                      {formatPrice(
                        subscription.payment_amount || subscription.package_details?.amount,
                        subscription.payment_currency || subscription.package_details?.currency || "USD"
                      )}
                    </strong>
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
            <h3>No system subscription receipt yet</h3>
            <p>After payment and booking, the system subscription timing, billing, and receipt details will appear here.</p>
          </div>
        )}
      </section>
    </main>
  );
}

export default SystemSubscriptionPage;
