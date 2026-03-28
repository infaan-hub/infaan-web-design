function AdminUsersPage({ app }) {
  const { users } = app;

  return (
    <main className="main-content">
      <section className="section-card">
        <div className="section-headline">
          <p className="micro-label">admin users</p>
          <h2>/admin/users</h2>
        </div>
        <div className="subscription-stack">
          {users.map((user) => (
            <div key={user.id} className="subscription-card">
              <strong>{user.username}</strong>
              <p>{user.email}</p>
              <p>{user.role}</p>
              <span className="status-pill status-active">{user.is_active ? "active" : "inactive"}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default AdminUsersPage;
