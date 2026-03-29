function PackageTimePage({ app }) {
  const { selectedPackage, selectedPriceId, setSelectedPriceId, navigate, formatPrice, continueToBilling, getPreferredPrice } = app;

  return (
    <main className="main-content">
      <section className="section-card">
        <div className="section-headline">
          <p className="micro-label">package time</p>
          <h2>Package Time</h2>
        </div>
        {!selectedPackage ? (
          <div className="form-card">
            <p>Select a package first.</p>
            <button type="button" className="solid-button" onClick={() => navigate("/package")}>Go to package</button>
          </div>
        ) : (
          <div className="package-stack">
            <div className="pricing-heading">
              <p className="micro-label">package time</p>
              <h2>{selectedPackage.tier === "extra" ? "Fixed package price" : "Select billing duration"}</h2>
              <span>
                {selectedPackage.tier === "extra"
                  ? "This extra package uses one fixed price and does not require weekly, monthly, or yearly selection."
                  : "Choose weekly, monthly, or yearly billing according to your selected package."}
              </span>
            </div>

            <div className="package-grid">
              {(selectedPackage.tier === "extra" ? [getPreferredPrice(selectedPackage)].filter(Boolean) : selectedPackage.prices).map((price) => (
                <button
                  key={price.id}
                  type="button"
                  className={`pricing-plan-card duration-card ${String(selectedPriceId) === String(price.id) ? "duration-card-active" : ""}`}
                  onClick={() => setSelectedPriceId(String(price.id))}
                >
                  <div className={`pricing-plan-top pricing-tone-${selectedPackage.tier}`}>
                    <span className="pricing-mini-pill">{selectedPackage.tier}</span>
                    <h4>{price.billing_period}</h4>
                    <div className="pricing-amount">
                      {price.billing_period === "per_task" ? (
                        <>
                          <strong>Custom</strong>
                          <span>per task</span>
                        </>
                      ) : (
                        <>
                          <strong>{formatPrice(price.amount, price.currency)}</strong>
                          <span>/{price.billing_period}</span>
                        </>
                      )}
                    </div>
                    <p>{selectedPackage.title}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="hero-actions">
              <button type="button" className="solid-button" onClick={continueToBilling}>
                Continue to billing
              </button>
              <button type="button" className="outline-button" onClick={() => navigate("/package")}>
                Back to package
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export default PackageTimePage;
