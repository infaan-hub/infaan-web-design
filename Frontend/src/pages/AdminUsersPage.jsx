import { useEffect, useState } from "react";

function AdminUsersPage({ app }) {
  const { users, saveUser, deleteUser, loading } = app;
  const [draftUsers, setDraftUsers] = useState({});

  useEffect(() => {
    const nextDrafts = {};
    users.forEach((user) => {
      nextDrafts[user.id] = {
        username: user.username || "",
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email || "",
        phone_number: user.phone_number || "",
        role: user.role || "customer",
        is_active: Boolean(user.is_active),
        password: "",
      };
    });
    setDraftUsers(nextDrafts);
  }, [users]);

  function updateDraft(userId, field, value) {
    setDraftUsers((previous) => ({
      ...previous,
      [userId]: {
        ...previous[userId],
        [field]: value,
      },
    }));
  }

  return (
    <main className="main-content">
      <section className="section-card">
        <div className="section-headline">
          <p className="micro-label">admin users</p>
          <h2>Manage Users</h2>
        </div>
        <div className="subscription-stack">
          {users.map((user) => {
            const draft = draftUsers[user.id] || {
              username: "",
              first_name: "",
              last_name: "",
              email: "",
              phone_number: "",
              role: "customer",
              is_active: true,
              password: "",
            };

            return (
              <form
                key={user.id}
                className="subscription-card admin-user-card"
                onSubmit={(event) => {
                  event.preventDefault();
                  saveUser(user.id, draft);
                }}
              >
                <div className="subscription-detail-head">
                  <div>
                    <strong>{user.username}</strong>
                    <p>{user.email}</p>
                  </div>
                  <span className={`status-pill ${draft.is_active ? "status-active" : "status-cancelled"}`}>
                    {draft.is_active ? "active" : "inactive"}
                  </span>
                </div>

                <div className="subscription-detail-grid">
                  <input value={draft.username} onChange={(event) => updateDraft(user.id, "username", event.target.value)} placeholder="Username" />
                  <input value={draft.first_name} onChange={(event) => updateDraft(user.id, "first_name", event.target.value)} placeholder="First name" />
                  <input value={draft.last_name} onChange={(event) => updateDraft(user.id, "last_name", event.target.value)} placeholder="Last name" />
                  <input type="email" value={draft.email} onChange={(event) => updateDraft(user.id, "email", event.target.value)} placeholder="Email" />
                  <input value={draft.phone_number} onChange={(event) => updateDraft(user.id, "phone_number", event.target.value)} placeholder="Phone number" />
                  <select value={draft.role} onChange={(event) => updateDraft(user.id, "role", event.target.value)}>
                    <option value="customer">Customer</option>
                    <option value="admin">Admin</option>
                  </select>
                  <input
                    type="password"
                    value={draft.password}
                    onChange={(event) => updateDraft(user.id, "password", event.target.value)}
                    placeholder="New password (optional)"
                  />
                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={draft.is_active}
                      onChange={(event) => updateDraft(user.id, "is_active", event.target.checked)}
                    />
                    Active user
                  </label>
                </div>

                <div className="hero-actions">
                  <button type="submit" className="solid-button" disabled={loading}>
                    Save user
                  </button>
                  <button
                    type="button"
                    className="outline-button"
                    disabled={loading}
                    onClick={() => saveUser(user.id, { ...draft, is_active: !draft.is_active })}
                  >
                    {draft.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    type="button"
                    className="header-button"
                    disabled={loading}
                    onClick={() => deleteUser(user.id)}
                  >
                    Delete
                  </button>
                </div>
              </form>
            );
          })}
        </div>
      </section>
    </main>
  );
}

export default AdminUsersPage;
