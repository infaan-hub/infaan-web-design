const serviceImages = {
  website:
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
  digital_ads:
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80",
  logo_poster:
    "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80",
};

function PackagePage({ app }) {
  const { selectedPackage, selectedService, groupedPackages, navigate, continueToPackageTime } = app;
  const serviceOrder = ["website", "digital_ads", "logo_poster"];
  const visibleServices = serviceOrder
    .map((category) => groupedPackages.find((service) => service.category === category && service.packages?.length))
    .filter(Boolean);

  return (
    <main className="main-content">
      <section className="section-card">
        <div className="section-headline">
          <p className="micro-label">package</p>
          <h2>Package</h2>
        </div>
        {selectedPackage ? (
          <div className="package-stack">
            <div className={`package-card tone-${selectedPackage.tier}`}>
              <div
                className="package-card-image"
                style={{ backgroundImage: `url(${serviceImages[selectedService?.category] || serviceImages.website})` }}
              />
              <div className="package-topline">
                <span className="tier-pill">{selectedPackage.tier}</span>
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
                  <span className="micro-label">subscription access</span>
                  <strong>Login is required before you can subscribe and send booking.</strong>
                </div>
              </div>
              <ul>
                {selectedPackage.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <div className="hero-actions">
                <button type="button" className="solid-button" onClick={() => continueToPackageTime(selectedPackage.id)}>
                  Continue to package time
                </button>
                <button type="button" className="outline-button" onClick={() => navigate("/home")}>
                  Back to packages
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="package-stack">
            {visibleServices.map((service) => (
              <article key={service.id} className="package-service-card">
                <div className="package-service-head">
                  <div>
                    <h3>{service.name}</h3>
                    <p>{service.short_description || service.details}</p>
                  </div>
                  <span className="service-badge">{service.category.replaceAll("_", " ")}</span>
                </div>

                <div className="package-grid">
                  {service.packages.map((pkg) => (
                    <div key={pkg.id} className={`package-card tone-${pkg.tier}`}>
                      <div
                        className="package-card-image"
                        style={{ backgroundImage: `url(${serviceImages[service.category] || serviceImages.website})` }}
                      />
                      <h4>{pkg.title}</h4>
                      <p>{pkg.description}</p>
                      <div className="hero-actions">
                        <button
                          type="button"
                          className="solid-button"
                          onClick={() => continueToPackageTime(pkg.id)}
                        >
                          Select package
                        </button>
                        <button
                          type="button"
                          className="outline-button"
                          onClick={() => {
                            app.selectPackage(pkg.id);
                          }}
                        >
                          View details
                        </button>
                      </div>
                      <button type="button" className="text-button" onClick={() => app.selectPackage(pkg.id)}>
                        View package credentials
                      </button>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default PackagePage;
