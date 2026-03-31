import { formatServiceCategoryLabel, getServiceImage } from "../lib/serviceCatalog";

function PackagePage({ app }) {
  const { selectedPackage, selectedService, groupedPackages, navigate, continueToPackageTime, formatPrice } = app;
  const visibleServices = groupedPackages.filter((service) => service.packages?.length);

  return (
    <main className="main-content">
      <section className="package-browser-hero">
        <div className="package-browser-copy">
          <p className="micro-label">package browser</p>
          <h2>Choose the right Infaan service package for your business.</h2>
          <p>
            Browse each service category, compare the available Silver, Gold, Premium, and Extra plans, then continue
            into package time and billing.
          </p>
        </div>
        <div className="package-browser-summary">
          <div className="summary-card">
            <span>{visibleServices.length}</span>
            <p>Service groups</p>
          </div>
          <div className="summary-card">
            <span>{visibleServices.reduce((total, service) => total + service.packages.length, 0)}</span>
            <p>Available packages</p>
          </div>
        </div>
      </section>

      {selectedPackage ? (
        <section className="section-card package-detail-shell">
          <div className="package-detail-media">
            <div
              className="package-card-image package-card-image-large"
              style={{ backgroundImage: `url(${getServiceImage(selectedService)})` }}
            />
            <div className="package-detail-badges">
              <span className="tier-pill">{selectedPackage.tier}</span>
              <span className="service-badge">{selectedService?.name || "Selected service"}</span>
            </div>
          </div>

          <div className={`package-card tone-${selectedPackage.tier} package-detail-card`}>
            <div className="package-topline">
              <h4>{selectedPackage.title}</h4>
            </div>
            <p>{selectedPackage.description}</p>

            <div className="selected-credentials">
              <div className="credential-card">
                <span className="micro-label">service</span>
                <strong>{selectedService?.name || "Selected service"}</strong>
              </div>
              <div className="credential-card">
                <span className="micro-label">payment note</span>
                <strong>{selectedPackage.payment_notes || "Price and billing plan available in the next step."}</strong>
              </div>
              <div className="credential-card">
                <span className="micro-label">access</span>
                <strong>Login is required before you can subscribe and send booking.</strong>
              </div>
            </div>

            <div className="package-feature-panel">
              <p className="micro-label">included work</p>
              <ul>
                {selectedPackage.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </div>

            <div className="package-price-strip">
              {selectedPackage.prices.map((price) => (
                <div key={price.id} className="price-strip-card">
                  <strong>{price.billing_period}</strong>
                  <span>
                    {price.billing_period === "per_task"
                      ? "Custom pricing"
                      : formatPrice(price.amount, price.currency)}
                  </span>
                </div>
              ))}
            </div>

            <div className="hero-actions">
              <button type="button" className="solid-button" onClick={() => continueToPackageTime(selectedPackage.id)}>
                {selectedPackage.tier === "extra" ? "Continue to billing" : "Continue to package time"}
              </button>
              <button type="button" className="outline-button" onClick={() => navigate("/package")}>
                Back to catalog
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="package-catalog">
          {visibleServices.map((service) => (
            <article key={service.id} className="service-catalog-block">
              <div className="service-catalog-head">
                  <div
                    className="service-catalog-cover"
                    style={{ backgroundImage: `url(${getServiceImage(service)})` }}
                  />
                <div className="service-catalog-copy">
                  <p className="micro-label">{formatServiceCategoryLabel(service.category)}</p>
                  <h3>{service.name}</h3>
                  <p>{service.short_description || service.details}</p>
                </div>
              </div>

              <div className="service-package-track">
                {service.packages.map((pkg) => {
                  const monthlyPrice = pkg.prices.find((price) => price.billing_period === "monthly") || pkg.prices[0];
                  const displayPrices = pkg.prices.filter((price) =>
                    monthlyPrice?.billing_period === "per_task" ? price.billing_period === "per_task" : price.billing_period === "monthly"
                  );

                  return (
                    <div key={pkg.id} className={`package-card tone-${pkg.tier} catalog-package-card`}>
                      <div className="catalog-package-top">
                        <span className="tier-pill">{pkg.tier}</span>
                        <h4>{pkg.title}</h4>
                        <p>{pkg.description}</p>
                      </div>

                      <div className="catalog-package-price">
                        <strong>
                          {monthlyPrice?.billing_period === "per_task"
                            ? "Custom"
                            : formatPrice(monthlyPrice?.amount || 0, monthlyPrice?.currency || "USD")}
                        </strong>
                        <span>{monthlyPrice?.billing_period === "per_task" ? "per task" : `/${monthlyPrice?.billing_period}`}</span>
                      </div>

                      {displayPrices.length > 1 ? (
                        <div className="price-list">
                          {displayPrices.map((price) => (
                            <span key={`${pkg.id}-${price.id}`} className="price-chip">
                              {formatPrice(price.amount, price.currency)}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      <ul className="catalog-feature-list">
                        {pkg.features.slice(0, 4).map((feature) => (
                          <li key={feature}>{feature}</li>
                        ))}
                      </ul>

                      <div className="hero-actions">
                        <button type="button" className="solid-button" onClick={() => continueToPackageTime(pkg.id)}>
                          {pkg.tier === "extra" ? "Use fixed price" : "Select package"}
                        </button>
                        <button type="button" className="outline-button" onClick={() => app.selectPackage(pkg.id)}>
                          View details
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

export default PackagePage;
