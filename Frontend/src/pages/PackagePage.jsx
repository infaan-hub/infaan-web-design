function PackagePage({ app }) {
  const { selectedPackage, groupedPackages, navigate, setSelectedPackageId } = app;

  return (
    <main className="main-content">
      <section className="section-card">
        <div className="section-headline">
          <p className="micro-label">package</p>
          <h2>/package</h2>
        </div>
        {selectedPackage ? (
          <div className="package-card tone-premium">
            <div className="package-topline">
              <span className="tier-pill">{selectedPackage.tier}</span>
              <h4>{selectedPackage.title}</h4>
            </div>
            <p>{selectedPackage.description}</p>
            <ul>
              {selectedPackage.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <button type="button" className="solid-button" onClick={() => navigate("/package-time")}>
              Continue to package time
            </button>
          </div>
        ) : (
          <div className="package-grid">
            {groupedPackages.flatMap((service) =>
              service.packages.map((pkg) => (
                <div key={pkg.id} className={`package-card tone-${pkg.tier}`}>
                  <h4>{pkg.title}</h4>
                  <p>{pkg.description}</p>
                  <button type="button" className="solid-button" onClick={() => { setSelectedPackageId(String(pkg.id)); navigate("/package-time"); }}>
                    Select package
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
