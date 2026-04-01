import { formatServiceCategoryLabel, getOrderedServices, getServiceImage } from "../lib/serviceCatalog";

function getStatusTone(status) {
  if (status === "active" || status === "grace_period") return "active";
  if (status === "suspended") return "suspended";
  return "expired";
}

function DashboardPage({ app }) {
  const {
    groupedPackages,
    groupedPortfolio,
    subscriptionSystems,
    formatPrice,
    beginSystemSubscription,
    selectSystem,
    navigate,
    subscriptions,
  } = app;
  const visibleServices = getOrderedServices(groupedPackages.filter((service) => service.packages?.length)).slice(0, 4);
  const activeSystems = (subscriptionSystems || []).slice(0, 4);

  return (
    <main className="main-content">
      {subscriptions.length ? (
        <section className="section-card">
          <div className="section-headline">
            <div>
              <p className="micro-label">subscription status</p>
              <h2>Current subscription status</h2>
            </div>
          </div>

          <div className="subscription-detail-grid">
            {subscriptions.map((subscription) => {
              const status = subscription.service_access?.status || subscription.status || "cancelled";
              return (
                <article key={subscription.id} className="subscription-card">
                  <div className="package-status-inline">
                    <span className={`status-dot status-dot-${getStatusTone(status)}`} />
                    <small>{status.replace("_", " ")}</small>
                  </div>
                  <strong>{subscription.package_details?.title || "-"}</strong>
                  <p>{subscription.package_details?.service || "-"}</p>
                  <p>{subscription.end_date ? `Ends ${subscription.end_date}` : "No end date yet"}</p>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="section-block">
        <div className="section-headline">
          <div>
            <p className="micro-label">customer dashboard</p>
            <h2>Services, pricing plans, and portfolio</h2>
          </div>
        </div>

        <div className="dashboard-service-stack">
          {visibleServices.map((service) => {
            const portfolioGroup = groupedPortfolio.find((item) => item.id === service.id);
            const portfolioPreview = portfolioGroup?.portfolioItems?.[0];

            return (
              <article key={service.id} className="service-catalog-block dashboard-service-card">
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

                <div className="dashboard-under-service-grid">
                  <div className="section-card dashboard-under-card">
                    <div className="section-headline">
                      <div>
                        <p className="micro-label">pricing plan package</p>
                        <h2>Packages</h2>
                      </div>
                    </div>

                    <div className="service-package-track">
                      {service.packages.map((pkg) => {
                        const preferredPrice = app.getPreferredPrice(pkg);

                        return (
                          <div key={pkg.id} className="pricing-plan-card">
                            <div className={`pricing-plan-top pricing-tone-${pkg.tier}`}>
                              <span className="pricing-mini-pill">{pkg.tier}</span>
                              <h4>{pkg.title}</h4>
                              <div className="pricing-amount">
                                {preferredPrice?.billing_period === "per_task" ? (
                                  <>
                                    <strong>{formatPrice(preferredPrice?.amount || 0, preferredPrice?.currency || "USD")}</strong>
                                    <span>fixed</span>
                                  </>
                                ) : (
                                  <>
                                    <strong>{formatPrice(preferredPrice?.amount || 0, preferredPrice?.currency || "USD")}</strong>
                                    <span>/{preferredPrice?.billing_period || "month"}</span>
                                  </>
                                )}
                              </div>
                              <p>{pkg.description}</p>
                              <button
                                type="button"
                                className="pricing-cta"
                                onClick={() => {
                                  selectPackage(pkg.id);
                                  continueToPackageTime(pkg.id);
                                }}
                              >
                                Continue
                              </button>
                            </div>

                            <ul className="pricing-feature-list">
                              {pkg.features.map((feature) => (
                                <li key={feature}>{feature}</li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="section-card dashboard-under-card">
                    <div className="section-headline">
                      <div>
                        <p className="micro-label">portfolio</p>
                        <h2>Portfolio</h2>
                      </div>
                    </div>

                    <div className="dashboard-portfolio-preview">
                      <article className="portfolio-home-card">
                        <div
                          className="portfolio-home-image"
                          style={{
                            backgroundImage: `url(${portfolioPreview?.image_data || getServiceImage(service)})`,
                          }}
                        >
                          <span className="portfolio-image-badge">{service.name}</span>
                        </div>
                      </article>

                      <button type="button" className="outline-button" onClick={() => navigate("/potfolio")}>
                        View portfolio
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="section-block">
        <div className="section-headline">
          <div>
            <p className="micro-label">system subscription</p>
            <h2>Hireable systems</h2>
          </div>
        </div>

        {activeSystems.length ? (
          <div className="system-showcase-grid">
            {activeSystems.map((system) => {
              const preferredPackage =
                system.packages?.find((pkg) => (pkg.prices || []).some((price) => ["monthly", "yearly"].includes(price.billing_period))) ||
                system.packages?.find((pkg) => pkg.tier !== "extra") ||
                system.packages?.[0];
              const pricePreview =
                (system.display_price !== null && system.display_price !== undefined && system.display_price !== ""
                  ? { amount: system.display_price, currency: system.display_price_currency || "USD" }
                  : null) ||
                preferredPackage?.prices?.find((price) => price.is_default) ||
                preferredPackage?.prices?.find((price) => price.billing_period === "monthly") ||
                preferredPackage?.prices?.[0];

              return (
                <article key={system.id} className="system-showcase-card">
                  <div className="system-showcase-media" style={{ backgroundImage: `url(${system.cover_image})` }}>
                    <div className="system-showcase-overlay" />
                    <div className="system-showcase-content">
                      <span className="system-showcase-pill">{system.service_name || "System subscription"}</span>
                      <div className="system-showcase-copy">
                        <h3>{system.name}</h3>
                        <p>{system.summary || "Subscribe to use this system weekly, monthly, or yearly and access ends after the hired time."}</p>
                      </div>
                      {pricePreview ? <strong className="system-showcase-price">{formatPrice(pricePreview.amount, pricePreview.currency)}</strong> : null}
                    </div>
                  </div>
                  <div className="system-showcase-actions">
                    <button
                      type="button"
                      className="system-showcase-button"
                      onClick={() => beginSystemSubscription(system.id)}
                      disabled={!preferredPackage}
                    >
                      Subscribe
                    </button>
                    <button
                      type="button"
                      className="system-showcase-button"
                      onClick={() => {
                        selectSystem(system.id);
                        navigate("/system-subscription");
                      }}
                    >
                      View Features
                    </button>
                    <button
                      type="button"
                      className="system-showcase-button"
                      onClick={() => {
                        if (!system.system_url) return;
                        window.open(system.system_url, "_blank", "noopener,noreferrer");
                      }}
                      disabled={!system.system_url}
                    >
                      Open
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="form-card">
            <h3>No active systems yet</h3>
            <p>When admin adds active systems with one cover image and five view images, they will appear here.</p>
          </div>
        )}
      </section>
    </main>
  );
}

export default DashboardPage;
