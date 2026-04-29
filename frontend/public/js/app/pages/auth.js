export function createAuthPages({ app, currentUser, navigate, pageTitle, ui }) {
  function renderHome() {
    if (currentUser()) return navigate('/dashboard');
    pageTitle('Home');
    app.innerHTML = `
      <section class="hero-panel">
        <div>
          <p class="text-primary fw-semibold mb-2"><i class="bi bi-shield-check me-1"></i>Your money, your rules</p>
          <h1 class="hero-title mb-3">Take control of your finances</h1>
          <p class="lead text-muted hero-copy mb-4">Track income and expenses, split money automatically, manage savings goals, and get daily spending advice. Everything works from local files and local assets.</p>
          <div class="d-flex gap-3 flex-wrap">
            <a href="/register" class="btn btn-primary btn-lg px-4" data-link><i class="bi bi-person-plus me-2"></i>Create Account</a>
            <a href="/login" class="btn btn-outline-secondary btn-lg px-4" data-link>Sign In</a>
          </div>
        </div>
      </section>
      <section class="row g-3">
        ${ui.feature('bi-pie-chart-fill', 'Smart Distribution', 'Income is split across your accounts by percentages you control.')}
        ${ui.feature('bi-trophy-fill', 'Flexible Goals', 'Add, delete, fund, and rebalance savings goals without editing code.')}
        ${ui.feature('bi-bar-chart-line-fill', 'Offline Analytics', 'Charts, reports, icons, and styling are all served locally.')}
      </section>`;
  }

  function renderLogin() {
    if (currentUser()) return navigate('/dashboard');
    pageTitle('Sign In');
    app.innerHTML = ui.authShell('Welcome back', 'Sign in to your FinTrack account', `
      <form data-form="login">
        ${ui.input('email', 'Email address', 'email', 'you@example.com', 'email')}
        ${ui.passwordInput('password', 'Password', 'current-password')}
        <button class="btn btn-primary w-100 py-2 fw-semibold" type="submit"><i class="bi bi-box-arrow-in-right me-2"></i>Sign In</button>
      </form>
      <div class="text-center my-3 text-muted small">or</div>
      <a href="/auth/google" class="btn btn-outline-danger w-100 py-2"><i class="bi bi-google me-2"></i>Continue with Google</a>
      <p class="text-center text-muted small mt-4 mb-0">No account yet? <a href="/register" data-link>Create one</a></p>`);
  }

  function renderRegister() {
    if (currentUser()) return navigate('/dashboard');
    pageTitle('Create Account');
    app.innerHTML = ui.authShell('Create your account', 'Start tracking your finances today', `
      <form data-form="register">
        <div class="row g-2">
          <div class="col-md-6">${ui.input('firstName', 'First name', 'text', 'First name', 'given-name')}</div>
          <div class="col-md-6">${ui.input('lastName', 'Last name', 'text', 'Last name', 'family-name')}</div>
        </div>
        ${ui.input('middleName', 'Middle name', 'text', 'Optional', 'additional-name', false)}
        ${ui.input('phoneNumber', 'Phone number', 'tel', 'Optional', 'tel', false)}
        ${ui.input('email', 'Email address', 'email', 'you@example.com', 'email')}
        ${ui.passwordInput('password', 'Password', 'new-password')}
        ${ui.passwordInput('confirmPassword', 'Confirm password', 'new-password')}
        <button class="btn btn-primary w-100 py-2 fw-semibold" type="submit"><i class="bi bi-person-plus me-2"></i>Create Account</button>
      </form>
      <div class="text-center my-3 text-muted small">or</div>
      <a href="/auth/google" class="btn btn-outline-danger w-100 py-2"><i class="bi bi-google me-2"></i>Sign up with Google</a>
      <p class="text-center text-muted small mt-4 mb-0">Already registered? <a href="/login" data-link>Sign in</a></p>`);
  }

  return { renderHome, renderLogin, renderRegister };
}
