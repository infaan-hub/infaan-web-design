const serviceImages = {
  website:
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
  digital_ads:
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80",
  logo_poster:
    "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80",
};

function DashboardPage({ app }) {
  const { groupedPackages, groupedPortfolio, formatPrice, continueToPackageTime, selectPackage, navigate } = app;
  const serviceOrder = ["website", "digital_ads", "logo_poster"];
  const visibleServices = serviceOrder
    .map((category) => groupedPackages.find((service) => service.category === category))
    .filter(Boolean);

  return (
    <main className="main-content">
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
                    style={{ backgroundImage: `url(${serviceImages[service.category] || serviceImages.website})` }}
                  />

                  <div className="service-catalog-copy">
                    <p className="micro-label">{service.category.replaceAll("_", " ")}</p>
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
                            backgroundImage: `url(${portfolioPreview?.image_data || serviceImages[service.category] || serviceImages.website})`,
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
    </main>
  );
}

export default DashboardPage;
