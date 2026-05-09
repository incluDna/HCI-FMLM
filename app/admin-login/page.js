export default function AdminLogin({ searchParams }) {
  const nextPath = searchParams?.next || "/admin";
  const hasError = searchParams?.error === "1";

  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <p className="eyebrow">Bangkok FMLM</p>
        <h1>Admin access</h1>
        <p>Enter the admin password to manage study scenarios and routes.</p>
        <form action="/api/admin-login" method="post">
          <input type="hidden" name="next" value={nextPath} />
          <label>
            <span>Password</span>
            <input name="password" type="password" autoComplete="current-password" required autoFocus />
          </label>
          {hasError && <p className="form-error">Incorrect password. Please try again.</p>}
          <button className="primary" type="submit">Open admin</button>
        </form>
        <a className="secondary-link" href="/">Back to study</a>
      </section>
    </main>
  );
}
