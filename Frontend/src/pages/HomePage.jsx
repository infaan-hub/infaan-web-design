import { formatServiceCategoryLabel, getOrderedServices, getServiceImage } from "../lib/serviceCatalog";
import AboutUsSection from "../components/AboutUsSection";

const heroImage =
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&q=80";

const packageTierOrder = {
  silver: 0,
  gold: 1,
  premium: 2,
  extra: 3,
};

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

function HomePage({ app }) {
  const {
    groupedPackages,
    groupedPortfolio,
    subscriptionSystems,
    subscriptionSystemsError,
    currentUser,
    selectSystem,
    selectPackage,
    requireLogin,
    beginSystemSubscription,
    formatPrice,
    navigate,
  } = app;

  const visibleServices = getOrderedServices(groupedPackages.filter((service) => service.packages?.length)).slice(0, 4);
  const visiblePortfolioItems = (groupedPortfolio || []).slice(0, 4);

  return (
    <main className="main-content">
      <section className="home-hero">
        <div className="home-hero-media" style={{ backgroundImage: `url(${heroImage})` }} />
        <div className="home-hero-glow" />
        <div className="home-hero-copy">
          <span className="home-hero-pill">Open for business systems</span>
          <h2>Build websites, digital ads, and design systems without limits.</h2>
          <p>
            Infaan Web & Design helps businesses launch software development, branding, maintenance, and digital growth
            services in one complete workflow.
          </p>
          <div className="hero-actions">
            <button type="button" className="header-button home-hero-button" onClick={() => navigate("/package")}>
              View Plans & Pricing
            </button>
          </div>
        </div>

        <div className="home-hero-facts">
          <div className="home-hero-fact">
            <strong>Full Service</strong>
            <span>Web, ads, branding, and maintenance</span>
          </div>
          <div className="home-hero-fact">
            <strong>Flexible Plans</strong>
            <span>Weekly, monthly, yearly, and fixed extra tasks</span>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-headline">
          <p className="micro-label">service images</p>
          <h2>Featured service categories</h2>
        </div>

        <div className="service-visual-grid">
          {visibleServices.map((service) => (
            <article
              key={service.id}
              className="visual-card visual-card-action"
              onClick={() => {
                if (!currentUser) {
                  navigate("/login");
                  return;
                }
                navigate("/package");
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  if (!currentUser) {
                    navigate("/login");
                    return;
                  }
                  navigate("/package");
                }
              }}
            >
              <div className="visual-image" style={{ backgroundImage: `url(${getServiceImage(service)})` }} />
              <div className="visual-copy">
                <span>{formatServiceCategoryLabel(service.category)}</span>
                <h3>{service.name}</h3>
                <p>{service.short_description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-headline">
          <p className="micro-label">system subscription</p>
          <h2>System subscription</h2>
        </div>

        {subscriptionSystems.length ? (
          <div className="system-showcase-grid">
            {subscriptionSystems.map((system) => {
              const preferredPackage =
                system.packages?.find((pkg) => (pkg.prices || []).some((price) => price.billing_period === "yearly")) ||
                system.packages?.find((pkg) => pkg.tier !== "extra") ||
                system.packages?.[0];
              const preferredPrice =
                (system.display_price !== null && system.display_price !== undefined && system.display_price !== ""
                  ? { amount: system.display_price, currency: system.display_price_currency || "TZS" }
                  : null) ||
                preferredPackage?.prices?.find((price) => price.is_default) ||
                preferredPackage?.prices?.find((price) => price.billing_period === "yearly") ||
                preferredPackage?.prices?.[0];

              return (
                <article key={system.id} className="system-showcase-card">
                  <div className="system-showcase-media" style={{ backgroundImage: `url(${system.cover_image})` }}>
                    <div className="system-showcase-overlay" />
                    <div className="system-showcase-content">
                      <span className="system-showcase-pill">{system.service_name || "System subscription"}</span>
                      <div className="system-showcase-copy">
                        <h3>{system.name}</h3>
                        <p>{system.summary || "Subscribe to use this system with a yearly plan and access ends after the hired time."}</p>
                      </div>
                      {preferredPrice ? <strong className="system-showcase-price">{formatPrice(preferredPrice.amount, preferredPrice.currency)}</strong> : null}
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
            <h3>No system subscription posted yet</h3>
            <p>
              {subscriptionSystemsError || "When admin posts system subscriptions, all of them will appear here with image, name, price, and subscribe button."}
            </p>
          </div>
        )}
      </section>

      <section className="section-block">
        <div className="section-headline">
          <p className="micro-label">portfolio</p>
          <h2>Latest portfolio samples</h2>
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
        <div className="pricing-heading">
          <p className="micro-label">pricing plans</p>
          <h2>Pricing plans</h2>
          <span>Choose the right plan for your needs.</span>
        </div>

        <div className="package-stack">
          {visibleServices.map((service) => (
            <article key={service.id} className="package-service-card">
              <div className="package-service-head">
                <div>
                  <h3>{service.name}</h3>
                  <p>{service.details}</p>
                </div>
                <span className="service-badge">{formatServiceCategoryLabel(service.category)}</span>
              </div>

              <div className="package-grid">
                {[...service.packages]
                  .sort((left, right) => (packageTierOrder[left.tier] ?? 999) - (packageTierOrder[right.tier] ?? 999))
                  .map((pkg) => (
                  <div key={pkg.id} className={`pricing-plan-card pricing-card-${pkg.tier}`}>
                    {(() => {
                      const headlinePrices = getPackageDisplayPrices(pkg);
                      const primaryPrice = headlinePrices.find((price) => price.currency === "TZS") || headlinePrices[0];

                      return (
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
                          {headlinePrices.length ? (
                            <div className="price-list">
                              {headlinePrices.map((price) => (
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
                              requireLogin("/package");
                            }}
                          >
                            Subscribe
                          </button>
                        </div>
                      );
                    })()}

                    <ul className="pricing-feature-list">
                      {pkg.features.map((feature) => (
                        <li key={feature}>{feature}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <AboutUsSection />
    </main>
  );
}

export default HomePage;
