function PackagePage({ app }) {
  const { selectedPackage, selectedService, groupedPackages, navigate, continueToPackageTime } = app;

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
          <div className="package-grid">
            {groupedPackages.flatMap((service) =>
              service.packages.map((pkg) => (
                <div key={pkg.id} className={`package-card tone-${pkg.tier}`}>
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
              ))
            )}
          </div>
        )}
      </section>
    </main>
  );
}

export default PackagePage;
