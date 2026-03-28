function PackageTimePage({ app }) {
  const { selectedPackage, selectedPriceId, setSelectedPriceId, navigate } = app;

  return (
    <main className="main-content">
      <section className="section-card">
        <div className="section-headline">
          <p className="micro-label">package time</p>
          <h2>/package-time</h2>
        </div>
        {!selectedPackage ? (
          <div className="form-card">
            <p>Select a package first.</p>
            <button type="button" className="solid-button" onClick={() => navigate("/package")}>Go to package</button>
          </div>
        ) : (
          <div className="form-card">
            <h3>{selectedPackage.title}</h3>
            <div className="price-list">
              {selectedPackage.prices.map((price) => (
                <button key={price.id} type="button" className={`price-chip ${String(selectedPriceId) === String(price.id) ? "price-chip-active" : ""}`} onClick={() => setSelectedPriceId(String(price.id))}>
                  {price.billing_period} - {price.currency} {price.amount}
                </button>
              ))}
            </div>
            <button type="button" className="solid-button" onClick={() => navigate("/billing")}>
              Continue to billing
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

export default PackageTimePage;
