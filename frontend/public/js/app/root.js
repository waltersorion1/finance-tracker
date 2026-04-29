import { escapeHtml, formToObject, qsa } from '../core/dom.js';
import { requestJson } from '../core/http.js';
import { currentPath, interceptNavigation, navigate as goTo } from '../core/navigation.js';
import { setTheme, syncThemeButtons, toggleTheme } from '../core/theme.js';

export function startApp() {
  const app = document.getElementById('app');
  const alerts = document.getElementById('alerts');
  const navLinks = document.getElementById('navLinks');
  let currentUser = null;
  let chartInstances = [];

  const routes = {
    '/': renderHome,
    '/login': renderLogin,
    '/register': renderRegister,
    '/dashboard': renderDashboard,
    '/transactions/new': renderTransactionForm,
    '/transactions/history': renderHistory,
    '/goals': renderGoals,
    '/dashboard/goals': renderGoals,
    '/analytics': renderAnalytics,
    '/dashboard/analytics': renderAnalytics,
    '/budgets': renderBudgets,
    '/recurring': renderRecurring,
    '/audit': renderAudit,
    '/profile': renderProfile,
    '/settings/distribution': renderDistribution,
  };

  function money(cents) {
    return `${Math.round((cents || 0) / 100).toLocaleString()} ${currentUser?.currency || 'XAF'}`;
  }

  function esc(value) {
    return escapeHtml(value);
  }

  function getPath() {
    return currentPath();
  }

  async function api(url, options = {}) {
    try {
      return await requestJson(url, options);
    } catch (error) {
      if (error.status === 401) {
        currentUser = null;
        renderNav();
        if (!['/', '/login', '/register'].includes(getPath())) navigate('/login');
      }
      throw error;
    }
  }

  function handleAuthError(error) {
    if (error.status === 401) {
      currentUser = null;
      renderNav();
      if (!['/', '/login', '/register'].includes(getPath())) navigate('/login');
    }
  }

  function showAlert(message, type = 'success') {
    alerts.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${esc(message)}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>`;
  }

  function pageTitle(title) {
    document.title = `${title} | FinTrack`;
  }

  function navigate(path) {
    goTo(path, render);
  }

  function formData(form) {
    return formToObject(form);
  }

  function renderNav() {
    if (currentUser) {
      const firstName = currentUser.firstName || currentUser.name.split(' ')[0];
      navLinks.innerHTML = `
        <li class="nav-item"><a class="nav-link" href="/dashboard" data-link><i class="bi bi-speedometer2 me-1"></i>Dashboard</a></li>
        <li class="nav-item"><a class="nav-link" href="/transactions/new?type=Income" data-link><i class="bi bi-plus-circle me-1 text-success"></i>Income</a></li>
        <li class="nav-item"><a class="nav-link" href="/transactions/new?type=Expense" data-link><i class="bi bi-dash-circle me-1 text-danger"></i>Expense</a></li>
        <li class="nav-item"><a class="nav-link" href="/transactions/history" data-link><i class="bi bi-clock-history me-1"></i>History</a></li>
        <li class="nav-item"><a class="nav-link" href="/goals" data-link><i class="bi bi-trophy me-1 text-warning"></i>Goals</a></li>
        <li class="nav-item"><a class="nav-link" href="/analytics" data-link><i class="bi bi-bar-chart-line me-1"></i>Analytics</a></li>
        <li class="nav-item"><a class="nav-link" href="/budgets" data-link><i class="bi bi-cash-coin me-1"></i>Budgets</a></li>
        <li class="nav-item"><a class="nav-link" href="/recurring" data-link><i class="bi bi-arrow-repeat me-1"></i>Recurring</a></li>
        <li class="nav-item"><a class="nav-link" href="/settings/distribution" data-link><i class="bi bi-sliders me-1"></i>Split</a></li>
        <li class="nav-item dropdown">
          <a class="nav-link dropdown-toggle d-flex align-items-center gap-2" href="#" data-bs-toggle="dropdown">
            <i class="bi bi-person-circle"></i><span>${esc(firstName)}</span>
          </a>
          <ul class="dropdown-menu dropdown-menu-end">
            <li><a class="dropdown-item" href="/profile" data-link><i class="bi bi-gear me-2"></i>Profile</a></li>
            <li><a class="dropdown-item" href="/audit" data-link><i class="bi bi-shield-check me-2"></i>Audit Log</a></li>
            <li><a class="dropdown-item" href="/api/transactions/export.csv"><i class="bi bi-download me-2"></i>Export CSV</a></li>
            <li><hr class="dropdown-divider"></li>
            <li><button class="dropdown-item text-danger" type="button" data-action="logout"><i class="bi bi-box-arrow-right me-2"></i>Logout</button></li>
          </ul>
        </li>
        <li class="nav-item d-none d-lg-flex align-items-center ms-2">
          <button class="btn btn-sm btn-ghost p-1 js-theme-toggle" type="button" title="Toggle theme"><i class="bi bi-moon-fill"></i></button>
        </li>`;
    } else {
      navLinks.innerHTML = `
        <li class="nav-item"><a class="nav-link" href="/login" data-link>Sign In</a></li>
        <li class="nav-item"><a class="btn btn-primary btn-sm px-3 ms-lg-2" href="/register" data-link>Create Account</a></li>
        <li class="nav-item d-none d-lg-flex align-items-center ms-2">
          <button class="btn btn-sm btn-ghost p-1 js-theme-toggle" type="button" title="Toggle theme"><i class="bi bi-moon-fill"></i></button>
        </li>`;
    }
    qsa('.nav-link').forEach(link => {
      if (link.pathname === getPath()) link.classList.add('active');
    });
    syncThemeButtons();
  }

  async function loadMe() {
    const data = await api('/api/auth/me');
    currentUser = data.user;
    if (currentUser?.theme) setTheme(currentUser.theme);
    renderNav();
  }

  function destroyCharts() {
    chartInstances.forEach(chart => chart.destroy());
    chartInstances = [];
  }

  async function render() {
    destroyCharts();
    alerts.innerHTML = '';
    try {
      await loadMe();
    } catch (error) {
      handleAuthError(error);
      currentUser = null;
      renderNav();
    }
    const cleanPath = getPath();
    const handler = routes[cleanPath] || renderHome;
    handler();
  }

  function renderHome() {
    if (currentUser) return navigate('/dashboard');
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
        ${feature('bi-pie-chart-fill', 'Smart Distribution', 'Income is split across your accounts by percentages you control.')}
        ${feature('bi-trophy-fill', 'Flexible Goals', 'Add, delete, fund, and rebalance savings goals without editing code.')}
        ${feature('bi-bar-chart-line-fill', 'Offline Analytics', 'Charts, reports, icons, and styling are all served locally.')}
      </section>`;
  }

  function feature(icon, title, copy) {
    return `<div class="col-md-4"><div class="card h-100 p-4"><div class="feature-icon mb-3"><i class="bi ${icon}"></i></div><h5>${title}</h5><p class="text-muted small mb-0">${copy}</p></div></div>`;
  }

  function renderLogin() {
    if (currentUser) return navigate('/dashboard');
    pageTitle('Sign In');
    app.innerHTML = authShell('Welcome back', 'Sign in to your FinTrack account', `
      <form data-form="login">
        ${input('email', 'Email address', 'email', 'you@example.com', 'email')}
        ${passwordInput('password', 'Password', 'current-password')}
        <button class="btn btn-primary w-100 py-2 fw-semibold" type="submit"><i class="bi bi-box-arrow-in-right me-2"></i>Sign In</button>
      </form>
      <div class="text-center my-3 text-muted small">or</div>
      <a href="/auth/google" class="btn btn-outline-danger w-100 py-2"><i class="bi bi-google me-2"></i>Continue with Google</a>
      <p class="text-center text-muted small mt-4 mb-0">No account yet? <a href="/register" data-link>Create one</a></p>`);
  }

  function renderRegister() {
    if (currentUser) return navigate('/dashboard');
    pageTitle('Create Account');
    app.innerHTML = authShell('Create your account', 'Start tracking your finances today', `
      <form data-form="register">
        <div class="row g-2">
          <div class="col-md-6">${input('firstName', 'First name', 'text', 'First name', 'given-name')}</div>
          <div class="col-md-6">${input('lastName', 'Last name', 'text', 'Last name', 'family-name')}</div>
        </div>
        ${input('middleName', 'Middle name', 'text', 'Optional', 'additional-name', false)}
        ${input('phoneNumber', 'Phone number', 'tel', 'Optional', 'tel', false)}
        ${input('email', 'Email address', 'email', 'you@example.com', 'email')}
        ${passwordInput('password', 'Password', 'new-password')}
        ${passwordInput('confirmPassword', 'Confirm password', 'new-password')}
        <button class="btn btn-primary w-100 py-2 fw-semibold" type="submit"><i class="bi bi-person-plus me-2"></i>Create Account</button>
      </form>
      <div class="text-center my-3 text-muted small">or</div>
      <a href="/auth/google" class="btn btn-outline-danger w-100 py-2"><i class="bi bi-google me-2"></i>Sign up with Google</a>
      <p class="text-center text-muted small mt-4 mb-0">Already registered? <a href="/login" data-link>Sign in</a></p>`);
  }

  function authShell(title, subtitle, body) {
    return `<div class="auth-card card p-4 p-md-5 mt-4">
      <div class="text-center mb-4"><i class="bi bi-graph-up-arrow fs-1 text-primary"></i><h2 class="fw-bold mt-2">${title}</h2><p class="text-muted small">${subtitle}</p></div>
      ${body}
    </div>`;
  }

  function input(name, label, type = 'text', placeholder = '', autocomplete = '', required = true, value = '') {
    return `<div class="mb-3"><label class="form-label">${label}${required ? ' <span class="text-danger">*</span>' : ''}</label><input class="form-control" name="${name}" type="${type}" placeholder="${placeholder}" autocomplete="${autocomplete}" value="${esc(value)}" ${required ? 'required' : ''}></div>`;
  }

  function passwordInput(name, label, autocomplete) {
    return `<div class="mb-3"><label class="form-label">${label} <span class="text-danger">*</span></label><div class="input-group"><input class="form-control" name="${name}" type="password" autocomplete="${autocomplete}" required><button class="btn btn-outline-secondary" type="button" data-action="toggle-password"><i class="bi bi-eye"></i></button></div></div>`;
  }

  async function renderDashboard() {
    pageTitle('Dashboard');
    const data = await api('/api/dashboard');
    const firstName = currentUser.firstName || currentUser.name.split(' ')[0];
    app.innerHTML = `
      <div class="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div><h2 class="fw-bold mb-0">Hey, ${esc(firstName)}</h2><p class="text-muted mb-0 small">Here&apos;s your financial overview</p></div>
        <div class="d-flex gap-2 flex-wrap">
          <a href="/transactions/new?type=Income" class="btn btn-success btn-sm" data-link><i class="bi bi-plus-circle me-1"></i>Add Income</a>
          <a href="/transactions/new?type=Expense" class="btn btn-danger btn-sm" data-link><i class="bi bi-dash-circle me-1"></i>Add Expense</a>
        </div>
      </div>
      <div class="row g-3 mb-4">
        ${stat('Total Balance', money(data.totalBalanceCents), '', '')}
        ${stat('Income This Month', money(data.monthlyIncomeCents), '', 'success')}
        ${stat('Expenses This Month', money(data.monthlyExpenseCents), '', 'danger')}
        ${stat('Savings Rate', `${data.savingsRate}%`, 'of income saved', 'accent')}
      </div>
      ${dailyReport(data.report)}
      <div class="d-flex justify-content-between align-items-center mb-3"><h5 class="fw-semibold mb-0"><i class="bi bi-wallet2 me-2 text-primary"></i>Your Accounts</h5><a href="/settings/distribution" data-link class="btn btn-sm btn-outline-secondary">Adjust Split</a></div>
      <div class="row g-3 mb-5">${data.accounts.map(accountCard).join('')}</div>
      <div class="d-flex justify-content-between align-items-center mb-3"><h5 class="fw-semibold mb-0"><i class="bi bi-trophy me-2 text-warning"></i>Goals Progress</h5><a href="/goals" data-link class="btn btn-sm btn-outline-secondary">Manage</a></div>
      <div class="row g-3 mb-5">${data.goals.slice(0, 3).map(goalCard).join('') || empty('No goals yet.')}</div>
      <div class="d-flex justify-content-between align-items-center mb-3"><h5 class="fw-semibold mb-0"><i class="bi bi-clock-history me-2 text-secondary"></i>Recent Transactions</h5><a href="/transactions/history" data-link class="btn btn-sm btn-outline-secondary">View All</a></div>
      ${transactionList(data.recentTransactions)}`;
    showMotivation();
  }

  function stat(label, value, suffix, tone) {
    return `<div class="col-6 col-lg-3"><div class="card stat-card ${tone} p-3"><p class="stat-label">${label}</p><p class="stat-value">${value}</p><p class="stat-currency">${suffix || currentUser.currency}</p></div></div>`;
  }

  function dailyReport(report) {
    return `<div class="card p-3 mb-4"><div class="d-flex justify-content-between gap-3 flex-wrap"><div><h5 class="fw-semibold mb-1"><i class="bi bi-clipboard-data me-2 text-primary"></i>Daily Report</h5><p class="text-muted small mb-0">${esc(report.date)} · ${report.transactionCount} transactions · Net ${money(report.netCents)}</p></div><button class="btn btn-sm btn-outline-primary" type="button" data-action="refresh-report"><i class="bi bi-arrow-clockwise me-1"></i>Refresh</button></div><ul class="mt-3 mb-0">${report.advice.map(item => `<li>${esc(item)}</li>`).join('')}</ul></div>`;
  }

  function accountCard(account) {
    const progress = account.goalCents > 0 ? Math.min(Math.round((account.balanceCents / account.goalCents) * 100), 100) : null;
    return `<div class="col-12 col-sm-6 col-xl-4"><div class="card h-100 p-3">
      <div class="d-flex justify-content-between align-items-start mb-2"><div class="d-flex align-items-center gap-2"><div class="account-icon ${account.type}"><i class="bi ${account.type === 'goal' ? 'bi-bullseye' : 'bi-wallet2'}"></i></div><div><p class="fw-semibold mb-0 small">${esc(account.name)}</p><p class="text-muted mb-0 small">${account.percentage}% of income</p></div></div><span class="badge ${account.type === 'goal' ? 'bg-warning text-dark' : 'bg-primary'}">${account.type}</span></div>
      <p class="fs-5 fw-bold mb-1">${money(account.balanceCents)}</p>
      ${progress === null ? '' : `<div class="small text-muted d-flex justify-content-between"><span>Goal ${money(account.goalCents)}</span><span>${progress}%</span></div><progress class="w-100" max="100" value="${progress}">${progress}%</progress>`}
    </div></div>`;
  }

  function goalCard(goal) {
    return `<div class="col-12 col-md-4"><div class="card p-3 h-100"><div class="d-flex justify-content-between gap-2"><h6 class="fw-semibold mb-1">${esc(goal.name)}</h6><span class="badge ${goal.pct >= 100 ? 'bg-success' : 'bg-warning text-dark'}">${goal.pct}%</span></div><p class="text-muted small mb-2">${money(goal.balanceCents)} / ${money(goal.targetCents)}</p><progress class="w-100" max="100" value="${goal.pct}">${goal.pct}%</progress><p class="text-muted small mt-2 mb-0">${goal.percentage}% of goal allocation</p></div></div>`;
  }

  function transactionList(transactions) {
    if (!transactions.length) return empty('No transactions yet. Add your first income.');
    return `<div class="card"><ul class="list-group list-group-flush">${transactions.map(tx => `<li class="list-group-item d-flex justify-content-between align-items-center py-3 gap-3"><div class="d-flex align-items-center gap-3"><div class="tx-icon ${tx.type.toLowerCase()}"><i class="bi ${tx.type === 'Income' ? 'bi-arrow-down-circle' : 'bi-arrow-up-circle'}"></i></div><div><p class="fw-medium mb-0 small">${esc(tx.category)}</p><p class="text-muted mb-0 small">${new Date(tx.date).toLocaleDateString()} · ${esc(tx.accountName)}</p></div></div><span class="fw-bold ${tx.type === 'Income' ? 'text-success' : 'text-danger'}">${tx.type === 'Income' ? '+' : '-'}${money(tx.amountCents)}</span></li>`).join('')}</ul></div>`;
  }

  function empty(text) {
    return `<div class="col-12"><div class="card empty-state p-4"><div><i class="bi bi-inbox fs-2 d-block mb-2"></i>${esc(text)}</div></div></div>`;
  }

  async function renderTransactionForm() {
    pageTitle('Add Transaction');
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type') === 'Expense' ? 'Expense' : 'Income';
    const { accounts } = await api('/api/accounts');
    const categories = type === 'Income' ? ['Salary', 'Freelance', 'Business', 'Investment', 'Gift'] : ['Food', 'Transport', 'Utilities', 'Healthcare', 'Entertainment', 'Shopping', 'Subscriptions'];
    app.innerHTML = `<div class="row justify-content-center"><div class="col-12 col-md-8 col-lg-6"><div class="card p-4 p-md-5">
      <div class="d-flex align-items-center gap-3 mb-4"><div class="tx-icon ${type.toLowerCase()} fs-4"><i class="bi ${type === 'Income' ? 'bi-plus-circle-fill' : 'bi-dash-circle-fill'}"></i></div><div><h4 class="fw-bold mb-0">${type === 'Income' ? 'Add Income' : 'Record Expense'}</h4><p class="text-muted small mb-0">${type === 'Income' ? 'Income will be auto-distributed.' : 'Funds will be deducted from the selected account.'}</p></div></div>
      <form data-form="transaction"><input name="type" type="hidden" value="${type}">
        ${input('category', 'Category', 'text', 'Salary, rent, food...')}
        <div class="d-flex flex-wrap gap-1 mb-3">${categories.map(category => `<button class="btn btn-sm btn-outline-secondary quick-cat" type="button" data-action="set-category" data-category="${esc(category)}">${esc(category)}</button>`).join('')}</div>
        ${input('subcategory', 'Subcategory', 'text', 'Optional', '', false)}
        ${type === 'Expense' ? `<div class="mb-3"><label class="form-label">Account <span class="text-danger">*</span></label><select class="form-select" name="account" required>${accounts.map(account => `<option value="${account.id}">${esc(account.name)} - ${money(account.balanceCents)}${account.goalCents > account.balanceCents ? ' (locked)' : ''}</option>`).join('')}</select></div>` : ''}
        ${type === 'Expense' ? `<div class="mb-3"><label class="form-label">Necessity</label><select class="form-select" name="isNecessary"><option value="">Not sure</option><option value="true">Necessary</option><option value="false">Unnecessary</option></select></div>` : ''}
        ${input('amount', `Amount (${currentUser.currency})`, 'number', '0')}
        <div class="mb-4"><label class="form-label">Reflection</label><textarea class="form-control" name="reflection" rows="2" maxlength="300" placeholder="Was it necessary?"></textarea></div>
        <div class="d-flex gap-3"><a href="/dashboard" data-link class="btn btn-outline-secondary flex-fill">Cancel</a><button class="btn ${type === 'Income' ? 'btn-success' : 'btn-danger'} flex-fill fw-semibold" type="submit">${type === 'Income' ? 'Add Income' : 'Record Expense'}</button></div>
      </form>
    </div></div></div>`;
  }

  async function renderHistory() {
    pageTitle('History');
    const qs = window.location.search || '';
    const data = await api(`/api/transactions${qs}`);
    const params = new URLSearchParams(window.location.search);
    app.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2"><h4 class="fw-bold mb-0"><i class="bi bi-clock-history me-2"></i>Transaction History</h4><a href="/api/transactions/export.csv" class="btn btn-sm btn-outline-secondary"><i class="bi bi-download me-1"></i>Export CSV</a></div>
      <div class="card p-3 mb-4"><form class="row g-2 align-items-end" data-form="filters">
        <div class="col-6 col-md-2"><label class="form-label small mb-1">Type</label><select name="type" class="form-select form-select-sm"><option value="">All</option><option value="Income">Income</option><option value="Expense">Expense</option></select></div>
        <div class="col-6 col-md-3">${input('category', 'Category', 'text', 'Filter', '', false, params.get('category') || '')}</div>
        <div class="col-6 col-md-3">${input('from', 'From', 'date', '', '', false, params.get('from') || '')}</div>
        <div class="col-6 col-md-3">${input('to', 'To', 'date', '', '', false, params.get('to') || '')}</div>
        <div class="col-12 col-md-1"><button class="btn btn-primary btn-sm w-100">Go</button></div>
      </form></div>
      ${historyTable(data.transactions)}
      ${pagination(data.currentPage, data.totalPages, params)}`;
    const typeSelect = app.querySelector('select[name="type"]');
    if (typeSelect) typeSelect.value = params.get('type') || '';
  }

  function historyTable(transactions) {
    if (!transactions.length) return `<div class="card empty-state p-5"><div><i class="bi bi-inbox fs-2 d-block mb-2"></i>No transactions match your filters.</div></div>`;
    return `<div class="card"><div class="table-responsive"><table class="table table-hover align-middle mb-0"><thead class="table-header"><tr><th>Date</th><th>Type</th><th>Category</th><th>Account</th><th class="text-end">Amount</th><th>Reflection</th><th></th></tr></thead><tbody>${transactions.map(tx => `<tr><td class="text-muted small">${new Date(tx.date).toLocaleDateString()}</td><td><span class="badge ${tx.type === 'Income' ? 'bg-success' : 'bg-danger'}">${tx.type}</span></td><td><p class="fw-medium mb-0 small">${esc(tx.category)}</p><p class="text-muted mb-0 small">${esc(tx.subcategory)}</p></td><td class="text-muted small">${esc(tx.accountName)}</td><td class="fw-bold text-end ${tx.type === 'Income' ? 'text-success' : 'text-danger'}">${tx.type === 'Income' ? '+' : '-'}${money(tx.amountCents)}</td><td>${tx.reflection ? `<span class="text-muted small">${esc(tx.reflection)}</span>` : `<form class="d-flex gap-1" data-form="reflection" data-id="${tx.id}"><input class="form-control form-control-sm" name="reflection" placeholder="Was it necessary?" maxlength="300"><button class="btn btn-sm btn-outline-primary">Save</button></form>`}</td><td><button class="btn btn-sm btn-ghost text-danger" type="button" data-action="delete-transaction" data-id="${tx.id}" title="Delete"><i class="bi bi-trash3"></i></button></td></tr>`).join('')}</tbody></table></div></div>`;
  }

  function pagination(current, total, params) {
    if (total <= 1) return '';
    return `<nav class="mt-4"><ul class="pagination justify-content-center">${Array.from({ length: total }, (_, i) => {
      params.set('page', i + 1);
      return `<li class="page-item ${current === i + 1 ? 'active' : ''}"><a class="page-link" href="/transactions/history?${params.toString()}" data-link>${i + 1}</a></li>`;
    }).join('')}</ul></nav>`;
  }

  async function renderGoals() {
    pageTitle('Goals');
    const { goals } = await api('/api/goals');
    const total = goals.reduce((sum, goal) => sum + (goal.percentage || 0), 0);
    app.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2"><h4 class="fw-bold mb-0"><i class="bi bi-trophy me-2 text-warning"></i>Savings Goals</h4><span class="badge ${total === 100 || goals.length === 0 ? 'bg-success' : 'bg-warning text-dark'}">Allocation ${total}%</span></div>
      <div class="row g-4 mb-4">${goals.map(goalListCard).join('') || empty('No goals yet.')}</div>
      <div class="row g-4"><div class="col-lg-6"><div class="card p-4"><h5>Add Goal</h5><form data-form="goal">${input('name', 'Goal name', 'text', 'Emergency laptop fund')}${input('target', `Target (${currentUser.currency})`, 'number', '0')}${input('percentage', 'Goal allocation percentage', 'number', '0')}<div class="mb-3"><label class="form-label">Priority</label><select class="form-select" name="priority"><option value="medium">Medium</option><option value="high">High</option><option value="low">Low</option></select></div><button class="btn btn-primary">Add Goal</button></form></div></div>
      <div class="col-lg-6"><div class="card p-4"><h5>Adjust Goal Allocation</h5><form data-form="goal-distribution">${goals.map(goal => distributionRow(goal)).join('') || '<p class="text-muted mb-0">Add goals before setting allocation.</p>'}<div class="d-flex justify-content-between mt-3"><strong>Total</strong><strong data-total="goals">0%</strong></div><button class="btn btn-outline-primary mt-3" ${goals.length ? '' : 'disabled'}>Save Allocation</button></form></div></div></div>`;
    updateDistributionTotals();
  }

  function distributionRow(item) {
    return `<div class="distribution-row mb-2"><label class="small fw-medium">${esc(item.name)}</label><input class="form-range" type="range" min="0" max="100" step="1" name="${item.id}" value="${item.percentage || 0}" data-distribution><input class="form-control form-control-sm" type="number" min="0" max="100" step="1" value="${item.percentage || 0}" data-mirror="${item.id}"></div>`;
  }

  function goalListCard(goal) {
    return `<div class="col-12 col-md-6 col-xl-4"><div class="card h-100 p-4">
      <div class="d-flex justify-content-between align-items-start gap-2 mb-2"><h5 class="fw-semibold mb-0">${esc(goal.name)}</h5><span class="badge ${goal.pct >= 100 ? 'bg-success' : 'bg-warning text-dark'}">${goal.pct}%</span></div>
      <p class="text-muted small mb-2">${money(goal.balanceCents)} saved of ${money(goal.targetCents)}</p>
      <progress class="w-100" max="100" value="${goal.pct}">${goal.pct}%</progress>
      <p class="text-muted small mt-2 mb-0">${goal.percentage}% allocation · ${esc(goal.priority)} priority</p>
      <button class="btn btn-sm btn-outline-danger mt-3" type="button" data-action="delete-goal" data-id="${goal.id}"><i class="bi bi-trash3 me-1"></i>Delete</button>
    </div></div>`;
  }

  async function renderDistribution() {
    pageTitle('Distribution');
    const [{ accounts }, { goals }] = await Promise.all([api('/api/accounts'), api('/api/goals')]);
    app.innerHTML = `<div class="mb-4"><h4 class="fw-bold mb-1"><i class="bi bi-sliders me-2 text-primary"></i>Distribution Settings</h4><p class="text-muted small mb-0">Both account and goal allocations must total exactly 100%.</p></div>
      <div class="row g-4"><div class="col-lg-6"><div class="card p-4"><h5>Income Split Between Accounts</h5><form data-form="account-distribution">${accounts.map(distributionRow).join('')}<div class="d-flex justify-content-between mt-3"><strong>Total</strong><strong data-total="accounts">0%</strong></div><button class="btn btn-primary mt-3">Save Account Split</button></form></div></div>
      <div class="col-lg-6"><div class="card p-4"><h5>Allocation Between Goals</h5><form data-form="goal-distribution">${goals.map(distributionRow).join('') || '<p class="text-muted mb-0">No goals yet.</p>'}<div class="d-flex justify-content-between mt-3"><strong>Total</strong><strong data-total="goals">0%</strong></div><button class="btn btn-outline-primary mt-3" ${goals.length ? '' : 'disabled'}>Save Goal Split</button></form></div></div></div>`;
    updateDistributionTotals();
  }

  async function renderAnalytics() {
    pageTitle('Analytics');
    const data = await api('/api/analytics');
    app.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2"><h4 class="fw-bold mb-0"><i class="bi bi-bar-chart-line me-2 text-primary"></i>Analytics</h4><a href="/dashboard" class="btn btn-sm btn-outline-secondary" data-link>Dashboard</a></div>
      <div class="row g-4"><div class="col-12 col-lg-8"><div class="card p-4 chart-box"><h6 class="fw-semibold text-muted text-uppercase small">Monthly Income vs Expenses</h6><canvas id="monthlyChart"></canvas></div></div>
      <div class="col-12 col-lg-4"><div class="card p-4 chart-box"><h6 class="fw-semibold text-muted text-uppercase small">Expense Categories</h6><canvas id="catChart"></canvas></div></div>
      <div class="col-12 col-lg-6"><div class="card p-4 chart-box"><h6 class="fw-semibold text-muted text-uppercase small">Weekly Activity</h6><canvas id="weeklyChart"></canvas></div></div>
      <div class="col-12 col-lg-6"><div class="card p-4 chart-box"><h6 class="fw-semibold text-muted text-uppercase small">Account Balances</h6><canvas id="accountChart"></canvas></div></div></div>`;
    renderCharts(data);
  }

  function chartOptions() {
    const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
    const color = isDark ? '#9ca3af' : '#64748b';
    const grid = isDark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.06)';
    return { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color } } }, scales: { x: { ticks: { color }, grid: { color: grid } }, y: { beginAtZero: true, ticks: { color }, grid: { color: grid } } } };
  }

  function renderCharts(data) {
    const opts = chartOptions();
    chartInstances.push(new Chart(document.getElementById('monthlyChart'), { type: 'bar', data: { labels: data.monthly.labels, datasets: [{ label: 'Income', data: data.monthly.incomeData, backgroundColor: 'rgba(16,185,129,.75)' }, { label: 'Expenses', data: data.monthly.expenseData, backgroundColor: 'rgba(239,68,68,.75)' }] }, options: opts }));
    chartInstances.push(new Chart(document.getElementById('weeklyChart'), { type: 'line', data: { labels: data.weekly.labels, datasets: [{ label: 'Income', data: data.weekly.incomeData, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,.1)', fill: true }, { label: 'Expenses', data: data.weekly.expenseData, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,.1)', fill: true }] }, options: opts }));
    chartInstances.push(new Chart(document.getElementById('accountChart'), { type: 'bar', data: { labels: data.accounts.labels, datasets: [{ label: 'Balance', data: data.accounts.data, backgroundColor: 'rgba(14,165,233,.75)' }] }, options: { ...opts, indexAxis: 'y' } }));
    chartInstances.push(new Chart(document.getElementById('catChart'), { type: 'doughnut', data: { labels: data.categories.labels.length ? data.categories.labels : ['No expenses'], datasets: [{ data: data.categories.data.length ? data.categories.data : [1], backgroundColor: ['#0ea5e9', '#10b981', '#ef4444', '#f59e0b', '#14b8a6', '#64748b'] }] }, options: { responsive: true, maintainAspectRatio: false } }));
  }

  async function renderBudgets() {
    pageTitle('Budgets');
    const { budgets } = await api('/api/budgets');
    app.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2"><h4 class="fw-bold mb-0"><i class="bi bi-cash-coin me-2 text-primary"></i>Budgets</h4><span class="text-muted small">${budgets.length} active category plan${budgets.length === 1 ? '' : 's'}</span></div>
      <div class="row g-4"><div class="col-lg-7"><div class="row g-3">${budgets.map(budgetCard).join('') || empty('No budgets yet. Add your first category budget.')}</div></div>
      <div class="col-lg-5"><div class="card p-4"><h5 class="fw-semibold mb-3">Add or Update Budget</h5><form data-form="budget">
        ${input('category', 'Category', 'text', 'Food')}
        ${input('limit', `Limit (${currentUser.currency})`, 'number', '0')}
        <div class="mb-3"><label class="form-label">Period</label><select class="form-select" name="period"><option value="monthly">Monthly</option><option value="weekly">Weekly</option></select></div>
        ${input('alertThreshold', 'Alert threshold (%)', 'number', '80')}
        <button class="btn btn-primary"><i class="bi bi-plus-circle me-2"></i>Save Budget</button>
      </form></div></div></div>`;
  }

  function budgetCard(budget) {
    const pct = Math.min(budget.pct, 140);
    return `<div class="col-12"><div class="card p-3">
      <div class="d-flex justify-content-between align-items-start gap-3"><div><h5 class="fw-semibold mb-1">${esc(budget.category)}</h5><p class="text-muted small mb-0">${esc(budget.period)} budget · alert at ${budget.alertThreshold}%</p></div><button class="btn btn-sm btn-ghost text-danger" type="button" data-action="delete-budget" data-id="${budget.id}" title="Delete"><i class="bi bi-trash3"></i></button></div>
      <div class="d-flex justify-content-between small text-muted mt-3"><span>${money(budget.spentCents)} spent</span><span>${money(budget.limitCents)} limit</span></div>
      <progress class="w-100" max="100" value="${Math.min(pct, 100)}">${Math.min(pct, 100)}%</progress>
      <p class="small mt-2 mb-0 ${budget.remainingCents < 0 ? 'text-danger' : 'text-muted'}">${budget.remainingCents < 0 ? `${money(Math.abs(budget.remainingCents))} over budget` : `${money(budget.remainingCents)} remaining`}</p>
    </div></div>`;
  }

  async function renderRecurring() {
    pageTitle('Recurring');
    const [{ recurring }, { accounts }] = await Promise.all([api('/api/recurring'), api('/api/accounts')]);
    app.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2"><h4 class="fw-bold mb-0"><i class="bi bi-arrow-repeat me-2 text-primary"></i>Recurring Transactions</h4><button class="btn btn-sm btn-outline-primary" type="button" data-action="run-recurring"><i class="bi bi-play-circle me-1"></i>Run Due Now</button></div>
      <div class="row g-4"><div class="col-lg-7"><div class="row g-3">${recurring.map(recurringCard).join('') || empty('No recurring transactions yet.')}</div></div>
      <div class="col-lg-5"><div class="card p-4"><h5 class="fw-semibold mb-3">Create Recurring Transaction</h5><form data-form="recurring">
        <div class="mb-3"><label class="form-label">Type</label><select class="form-select" name="type"><option value="Expense">Expense</option><option value="Income">Income</option></select></div>
        ${input('category', 'Category', 'text', 'Rent, Salary, Subscription')}
        ${input('subcategory', 'Subcategory', 'text', 'Optional', '', false)}
        ${input('amount', `Amount (${currentUser.currency})`, 'number', '0')}
        <div class="mb-3"><label class="form-label">Account for expenses</label><select class="form-select" name="account">${accounts.map(account => `<option value="${account.id}">${esc(account.name)} - ${money(account.balanceCents)}</option>`).join('')}</select></div>
        <div class="mb-3"><label class="form-label">Frequency</label><select class="form-select" name="frequency"><option value="monthly">Monthly</option><option value="weekly">Weekly</option><option value="daily">Daily</option></select></div>
        ${input('nextRunAt', 'Next run date', 'date', '')}
        <div class="mb-3"><label class="form-label">Reflection</label><textarea class="form-control" name="reflection" rows="2" maxlength="300"></textarea></div>
        <button class="btn btn-primary"><i class="bi bi-plus-circle me-2"></i>Save Recurring</button>
      </form></div></div></div>`;
  }

  function recurringCard(job) {
    return `<div class="col-12"><div class="card p-3">
      <div class="d-flex justify-content-between align-items-start gap-3"><div><h5 class="fw-semibold mb-1">${esc(job.category)}</h5><p class="text-muted small mb-0">${esc(job.frequency)} ${esc(job.type.toLowerCase())} · next ${new Date(job.nextRunAt).toLocaleDateString()}</p></div><button class="btn btn-sm btn-ghost text-danger" type="button" data-action="delete-recurring" data-id="${job.id}" title="Delete"><i class="bi bi-trash3"></i></button></div>
      <p class="fs-5 fw-bold mb-1 mt-3 ${job.type === 'Income' ? 'text-success' : 'text-danger'}">${job.type === 'Income' ? '+' : '-'}${money(job.amountCents)}</p>
      <p class="text-muted small mb-0">${job.account?.name ? `Account: ${esc(job.account.name)}` : 'Auto-distributed income'}</p>
    </div></div>`;
  }

  async function renderAudit() {
    pageTitle('Audit Log');
    const { audit } = await api('/api/audit');
    app.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2"><h4 class="fw-bold mb-0"><i class="bi bi-shield-check me-2 text-primary"></i>Audit Log</h4><span class="text-muted small">Latest ${audit.length} events</span></div>
      <div class="card"><div class="table-responsive"><table class="table table-hover align-middle mb-0"><thead class="table-header"><tr><th>Date</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead><tbody>${audit.map(auditRow).join('') || '<tr><td colspan="4" class="text-muted text-center py-4">No audit activity yet.</td></tr>'}</tbody></table></div></div>`;
  }

  function auditRow(item) {
    return `<tr><td class="text-muted small">${new Date(item.createdAt).toLocaleString()}</td><td><span class="badge bg-primary">${esc(item.action)}</span></td><td>${esc(item.entity)}</td><td class="text-muted small">${esc(JSON.stringify(item.metadata || {}))}</td></tr>`;
  }

  function renderProfile() {
    pageTitle('Profile');
    app.innerHTML = `<div class="row justify-content-center"><div class="col-12 col-lg-7"><div class="card p-4 p-md-5"><h4 class="fw-bold mb-1"><i class="bi bi-person-circle me-2 text-primary"></i>Profile Settings</h4><p class="text-muted small mb-4">Update your personal details and local display preferences.</p>
      <form data-form="profile"><div class="row g-2"><div class="col-md-6">${input('firstName', 'First name', 'text', '', 'given-name', true, currentUser.firstName)}</div><div class="col-md-6">${input('lastName', 'Last name', 'text', '', 'family-name', true, currentUser.lastName)}</div></div>
      ${input('middleName', 'Middle name', 'text', '', 'additional-name', false, currentUser.middleName)}${input('phoneNumber', 'Phone number', 'tel', '', 'tel', false, currentUser.phoneNumber)}${input('profilePicture', 'Profile picture URL or local path', 'text', '/icons/logo.png', '', false, currentUser.profilePicture)}
      <div class="mb-3"><label class="form-label">Bio</label><textarea class="form-control" name="bio" maxlength="280" rows="3">${esc(currentUser.bio)}</textarea></div>
      <div class="mb-3"><label class="form-label">Email</label><input class="form-control" type="email" value="${esc(currentUser.email)}" disabled></div>
      <div class="row g-3 mb-4"><div class="col-6"><label class="form-label">Language</label><select class="form-select" name="language"><option value="en">English</option><option value="fr">Francais</option></select></div><div class="col-6"><label class="form-label">Theme</label><select class="form-select" name="theme"><option value="light">Light</option><option value="dark">Dark</option></select></div></div>
      <button class="btn btn-primary"><i class="bi bi-check-circle me-2"></i>Save Changes</button></form></div></div></div>`;
    app.querySelector('[name="language"]').value = currentUser.language;
    app.querySelector('[name="theme"]').value = currentUser.theme;
  }

  function updateDistributionTotals() {
    qsa('[data-distribution]').forEach(range => {
      const mirror = document.querySelector(`[data-mirror="${range.name}"]`);
      if (mirror) mirror.value = range.value;
    });
    const forms = [['account-distribution', 'accounts'], ['goal-distribution', 'goals']];
    forms.forEach(([formName, totalName]) => {
      const form = document.querySelector(`[data-form="${formName}"]`);
      const totalEl = document.querySelector(`[data-total="${totalName}"]`);
      if (!form || !totalEl) return;
      const total = [...form.querySelectorAll('[data-distribution]')].reduce((sum, inputEl) => sum + Number(inputEl.value || 0), 0);
      totalEl.textContent = `${total}%`;
      totalEl.className = total === 100 || !form.querySelector('[data-distribution]') ? 'text-success' : 'text-danger';
    });
  }

  async function showMotivation() {
    const lastShown = localStorage.getItem('lastMotivationDate');
    const today = new Date().toDateString();
    if (lastShown === today) return;
    const { motivations } = await api('/api/dashboard/motivations');
    document.getElementById('motivationText').textContent = motivations[Math.floor(Math.random() * motivations.length)];
    bootstrap.Modal.getOrCreateInstance(document.getElementById('motivationModal')).show();
    localStorage.setItem('lastMotivationDate', today);
  }

  document.addEventListener('click', async event => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    if (action === 'toggle-password') {
      const inputEl = event.target.closest('.input-group').querySelector('input');
      inputEl.type = inputEl.type === 'password' ? 'text' : 'password';
    }
    if (action === 'set-category') {
      app.querySelector('[name="category"]').value = event.target.closest('[data-category]').dataset.category;
    }
    if (action === 'logout') {
      await api('/api/auth/logout', { method: 'POST' });
      currentUser = null;
      navigate('/login');
    }
    if (action === 'delete-transaction' && confirm('Delete this transaction?')) {
      await api(`/api/transactions/${event.target.closest('[data-id]').dataset.id}`, { method: 'DELETE' });
      showAlert('Transaction deleted.');
      renderHistory();
    }
    if (action === 'delete-goal' && confirm('Delete this goal and its linked goal account?')) {
      await api(`/api/goals/${event.target.closest('[data-id]').dataset.id}`, { method: 'DELETE' });
      showAlert('Goal deleted.');
      renderGoals();
    }
    if (action === 'delete-budget' && confirm('Delete this budget?')) {
      await api(`/api/budgets/${event.target.closest('[data-id]').dataset.id}`, { method: 'DELETE' });
      showAlert('Budget deleted.');
      renderBudgets();
    }
    if (action === 'delete-recurring' && confirm('Delete this recurring transaction?')) {
      await api(`/api/recurring/${event.target.closest('[data-id]').dataset.id}`, { method: 'DELETE' });
      showAlert('Recurring transaction deleted.');
      renderRecurring();
    }
    if (action === 'run-recurring') {
      const result = await api('/api/recurring/run-due', { method: 'POST' });
      showAlert(`${result.processed} recurring transaction${result.processed === 1 ? '' : 's'} processed.`);
      renderRecurring();
    }
    if (action === 'refresh-report') {
      showAlert('Daily report refreshed.');
      renderDashboard();
    }
  });

  document.addEventListener('input', event => {
    if (event.target.matches('[data-distribution]')) {
      const mirror = document.querySelector(`[data-mirror="${event.target.name}"]`);
      if (mirror) mirror.value = event.target.value;
      updateDistributionTotals();
    }
    if (event.target.matches('[data-mirror]')) {
      const range = document.querySelector(`[name="${event.target.dataset.mirror}"][data-distribution]`);
      if (range) range.value = event.target.value;
      updateDistributionTotals();
    }
  });

  document.addEventListener('submit', async event => {
    const form = event.target.closest('form[data-form]');
    if (!form) return;
    event.preventDefault();
    try {
      const name = form.dataset.form;
      if (name === 'login') {
        await api('/api/auth/login', { method: 'POST', body: JSON.stringify(formData(form)) });
        navigate('/dashboard');
      }
      if (name === 'register') {
        await api('/api/auth/register', { method: 'POST', body: JSON.stringify(formData(form)) });
        navigate('/dashboard');
      }
      if (name === 'transaction') {
        await api('/api/transactions', { method: 'POST', body: JSON.stringify(formData(form)) });
        showAlert('Transaction saved.');
        navigate('/dashboard');
      }
      if (name === 'filters') {
        const params = new URLSearchParams(formData(form));
        [...params.entries()].forEach(([key, value]) => { if (!value) params.delete(key); });
        navigate(`/transactions/history?${params.toString()}`);
      }
      if (name === 'reflection') {
        await api(`/api/transactions/${form.dataset.id}/reflection`, { method: 'PATCH', body: JSON.stringify(formData(form)) });
        showAlert('Reflection saved.');
        renderHistory();
      }
      if (name === 'goal') {
        await api('/api/goals', { method: 'POST', body: JSON.stringify(formData(form)) });
        showAlert('Goal added.');
        renderGoals();
      }
      if (name === 'budget') {
        await api('/api/budgets', { method: 'POST', body: JSON.stringify(formData(form)) });
        showAlert('Budget saved.');
        renderBudgets();
      }
      if (name === 'recurring') {
        await api('/api/recurring', { method: 'POST', body: JSON.stringify(formData(form)) });
        showAlert('Recurring transaction saved.');
        renderRecurring();
      }
      if (name === 'account-distribution' || name === 'goal-distribution') {
        const collectionName = name === 'account-distribution' ? 'accounts' : 'goals';
        const values = [...form.querySelectorAll('[data-distribution]')].map(inputEl => ({ id: inputEl.name, percentage: Number(inputEl.value) }));
        await api(`/api/${collectionName}/distribution`, { method: 'PUT', body: JSON.stringify({ [collectionName]: values }) });
        showAlert('Distribution saved.');
        renderDistribution();
      }
      if (name === 'profile') {
        const data = await api('/api/profile', { method: 'PUT', body: JSON.stringify(formData(form)) });
        currentUser = data.user;
        setTheme(currentUser.theme);
        showAlert('Profile updated.');
        renderProfile();
      }
    } catch (error) {
      showAlert(error.message, 'danger');
    }
  });

  document.addEventListener('click', event => {
    if (event.target.closest('.js-theme-toggle')) toggleTheme();
  });

  interceptNavigation(render);

  render();
}
