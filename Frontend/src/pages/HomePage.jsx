const serviceImages = {
  website:
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
  digital_ads:
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80",
  logo_poster:
    "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80",
};

function HomePage({ app }) {
  const { groupedPackages, setSelectedPackageId, requireLogin } = app;
  const visibleServices = groupedPackages.filter((service) =>
    ["website", "digital_ads", "logo_poster"].includes(service.category)
  );

  return (
    <main className="main-content">
      <section className="section-block">
        <div className="section-headline">
          <p className="micro-label">service images</p>
          <h2>Featured service categories</h2>
        </div>

        <div className="service-visual-grid">
          {visibleServices.map((service) => (
            <article key={service.id} className="visual-card">
              <div className="visual-image" style={{ backgroundImage: `url(${serviceImages[service.category]})` }} />
              <div className="visual-copy">
                <span>{service.category.replaceAll("_", " ")}</span>
                <h3>{service.name}</h3>
                <p>{service.short_description}</p>
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
                <span className="service-badge">{service.category.replaceAll("_", " ")}</span>
              </div>

              <div className="package-grid">
                {service.packages.map((pkg) => (
                  <div key={pkg.id} className="pricing-plan-card">
                    <div className={`pricing-plan-top pricing-tone-${pkg.tier}`}>
                      <span className="pricing-mini-pill">{pkg.tier}</span>
                      <h4>{pkg.title}</h4>
                      <div className="pricing-amount">
                        {pkg.prices[0]?.billing_period === "per_task" ? (
                          <>
                            <strong>Custom</strong>
                            <span>per task</span>
                          </>
                        ) : (
                          <>
                            <strong>${pkg.prices.find((price) => price.billing_period === "monthly")?.amount || pkg.prices[0]?.amount}</strong>
                            <span>/month</span>
                          </>
                        )}
                      </div>
                      <p>{pkg.description}</p>
                      <button
                        type="button"
                        className="pricing-cta"
                        onClick={() => {
                          setSelectedPackageId(String(pkg.id));
                          requireLogin("/package");
                        }}
                      >
                        Subscribe
                      </button>
                    </div>

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
    </main>
  );
}

export default HomePage;
