import BounceCards from "../components/BounceCards";

function PortfolioPage({ app }) {
  const { groupedPortfolio, navigate } = app;
  const visibleItems = groupedPortfolio || [];

  return (
    <main className="main-content">
      <section className="section-card">
        <div className="section-headline">
          <p className="micro-label">portfolio</p>
          <h2>Service Portfolio</h2>
        </div>

        <div className="package-stack">
          <section className="section-card" style={{ padding: "32px 16px" }}>
            {visibleItems.length > 0 ? (
              <BounceCards items={visibleItems} />
            ) : (
              <p style={{ textAlign: "center", color: "var(--muted)", padding: "40px 0" }}>
                No portfolio items yet.
              </p>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

export default PortfolioPage;
