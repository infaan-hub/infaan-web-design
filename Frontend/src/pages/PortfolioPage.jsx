function PortfolioPage({ app }) {
  const { groupedPortfolio } = app;
  const visibleItems = groupedPortfolio || [];

  return (
    <main className="main-content">
      <section className="section-card">
        <div className="section-headline">
          <p className="micro-label">portfolio</p>
          <h2>Service Portfolio</h2>
        </div>

        <div className="package-stack">
          <section className="section-card">
            <div className="portfolio-grid">
              {visibleItems.map((item) => (
                <article key={item.id} className="portfolio-product-card portfolio-view-card">
                  <div className="portfolio-product-image-wrap">
                    <img src={item.image_data} alt={item.name} className="portfolio-product-image" />
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

export default PortfolioPage;
