import { formatServiceCategoryLabel, getOrderedServices, getServiceImage } from "../lib/serviceCatalog";
import AboutUsSection from "../components/AboutUsSection";

function getStatusTone(status) {
  if (status === "active" || status === "grace_period") return "active";
  if (status === "suspended") return "suspended";
  return "expired";
}

function getPackageDisplayPrices(pkg) {
  const preferredBillingPeriod =
    pkg.prices[0]?.billing_period === "per_task"
      ? "per_task"
      : pkg.prices.some((price) => price.billing_period === "monthly")
        ? "monthly"
        : pkg.prices[0]?.billing_period;

  return [...(pkg.prices || [])]
    .filter((price) => price.billing_period === preferredBillingPeriod)
    .sort((left, right) => {
      const currencyOrder = { TZS: 0 };
      return (currencyOrder[left.currency] ?? 999) - (currencyOrder[right.currency] ?? 999);
    });
}

function DashboardPage({ app }) {
  const {
    groupedPackages,
    groupedPortfolio,
    subscriptionSystems,
    subscriptionSystemsError,
    formatPrice,
    selectPackage,
    continueToPackageTime,
    beginSystemSubscription,
    selectSystem,
    subscriptions,
    navigate,
  } = app;
  const visibleServices = getOrderedServices(groupedPackages.filter((service) => service.packages?.length)).slice(0, 4);
  const activeSystems = (subscriptionSystems || []).slice(0, 4);
  const visiblePortfolioItems = (groupedPortfolio || []).slice(0, 4);

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
            <p className="micro-label">portfolio</p>
            <h2>Portfolio</h2>
          </div>
        </div>

        <div className="package-grid">
          {visiblePortfolioItems.map((item) => (
            <article key={item.id} className="portfolio-home-card">
              <div
                className="portfolio-home-image"
                style={{
                  backgroundImage: `url(${item.image_data})`,
                }}
              >
                <span className="portfolio-image-badge">{item.name}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-headline">
          <div>
            <p className="micro-label">customer dashboard</p>
            <h2>Services, pricing plans, and portfolio</h2>
          </div>
        </div>

        <div className="dashboard-service-stack">
          {visibleServices.map((service) => (
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
                        const displayPrices = getPackageDisplayPrices(pkg);
                        const primaryPrice = displayPrices.find((price) => price.currency === "TZS") || displayPrices[0];

                        return (
                          <div key={pkg.id} className="pricing-plan-card">
                            <div className={`pricing-plan-top pricing-tone-${pkg.tier}`}>
                              <span className="pricing-mini-pill">{pkg.tier}</span>
                              <h4>{pkg.title}</h4>
                              <div className="pricing-amount">
                                {primaryPrice?.billing_period === "per_task" ? (
                                  <>
                                    <strong>{formatPrice(primaryPrice?.amount || 0, primaryPrice?.currency || "TZS")}</strong>
                                    <span>per task</span>
                                  </>
                                ) : (
                                  <>
                                    <strong>{formatPrice(primaryPrice?.amount || 0, primaryPrice?.currency || "TZS")}</strong>
                                    <span>/month</span>
                                  </>
                                )}
                              </div>
                              {displayPrices.length ? (
                                <div className="price-list">
                                  {displayPrices.map((price) => (
                                    <span key={`${pkg.id}-${price.id}`} className="price-chip">
                                      {formatPrice(price.amount, price.currency)}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
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
                </div>
              </article>
          ))}
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
                  ? { amount: system.display_price, currency: system.display_price_currency || "TZS" }
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
            <p>{subscriptionSystemsError || "When admin adds active systems with one cover image and five view images, they will appear here."}</p>
          </div>
        )}
      </section>

      <AboutUsSection />
    </main>
  );
}

export default DashboardPage;
