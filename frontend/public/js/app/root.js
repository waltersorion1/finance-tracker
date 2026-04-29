import { escapeHtml, formToObject, qsa } from '../core/dom.js';
import { requestJson } from '../core/http.js';
import { currentPath, interceptNavigation, navigate as goTo } from '../core/navigation.js';
import { setTheme, toggleTheme } from '../core/theme.js';
import { renderFinanceCharts } from './charts.js';
import { createComponents } from './components.js';
import { createCommandPalette, renderNav as renderNavigation } from './navigation.js';
import { createAuthPages } from './pages/auth.js';
import { createViewHelpers } from './views.js';

export function startApp() {
  const app = document.getElementById('app');
  const alerts = document.getElementById('alerts');
  const navLinks = document.getElementById('navLinks');
  const mobileTabbar = document.getElementById('mobileTabbar');
  const commandPalette = document.getElementById('commandPalette');
  const commandSearch = document.getElementById('commandSearch');
  const commandResults = document.getElementById('commandResults');
  let currentUser = null;
  let chartInstances = [];
  const ui = createComponents({ esc, money, getCurrentUser: () => currentUser });
  const {
    accountCard,
    auditRow,
    budgetCard,
    dailyReport,
    goalCard,
    goalListCard,
    historyTable,
    pagination,
    recurringCard,
    reviewBudgetRow,
    reviewGoalRow,
    transactionList,
  } = createViewHelpers({ esc, money, ui });
  const commandPaletteApi = createCommandPalette({
    currentUser: () => currentUser,
    commandPalette,
    commandSearch,
    commandResults,
    esc,
    navigate,
  });
  const authPages = createAuthPages({
    app,
    currentUser: () => currentUser,
    navigate,
    pageTitle,
    ui,
  });

  const routes = {
    '/': authPages.renderHome,
    '/login': authPages.renderLogin,
    '/register': authPages.renderRegister,
    '/dashboard': renderDashboard,
    '/transactions/new': renderTransactionForm,
    '/transactions/history': renderHistory,
    '/goals': renderGoals,
    '/dashboard/goals': renderGoals,
    '/analytics': renderAnalytics,
    '/dashboard/analytics': renderAnalytics,
    '/budgets': renderBudgets,
    '/recurring': renderRecurring,
    '/review': renderReview,
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
    renderNavigation({ currentUser, navLinks, mobileTabbar, path: getPath(), esc });
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
    const handler = routes[cleanPath] || authPages.renderHome;
    try {
      await handler();
    } catch (error) {
      if (error.status === 401) return;
      showAlert(error.message || 'Unable to load this page.', 'danger');
      app.innerHTML = `<div class="card empty-state p-5"><div><i class="bi bi-exclamation-triangle fs-2 d-block mb-2 text-warning"></i><p class="fw-semibold mb-1">Page could not load</p><p class="text-muted small mb-0">${esc(error.message || 'Please try again.')}</p></div></div>`;
    }
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
        ${ui.stat('Total Balance', money(data.totalBalanceCents), '', '')}
        ${ui.stat('Income This Month', money(data.monthlyIncomeCents), '', 'success')}
        ${ui.stat('Expenses This Month', money(data.monthlyExpenseCents), '', 'danger')}
        ${ui.stat('Savings Rate', `${data.savingsRate}%`, 'of income saved', 'accent')}
      </div>
      ${dailyReport(data.report)}
      <div class="d-flex justify-content-between align-items-center mb-3"><h5 class="fw-semibold mb-0"><i class="bi bi-wallet2 me-2 text-primary"></i>Your Accounts</h5><a href="/settings/distribution" data-link class="btn btn-sm btn-outline-secondary">Adjust Split</a></div>
      <div class="row g-3 mb-5">${data.accounts.map(accountCard).join('')}</div>
      <div class="d-flex justify-content-between align-items-center mb-3"><h5 class="fw-semibold mb-0"><i class="bi bi-trophy me-2 text-warning"></i>Goals Progress</h5><a href="/goals" data-link class="btn btn-sm btn-outline-secondary">Manage</a></div>
      <div class="row g-3 mb-5">${data.goals.slice(0, 3).map(goalCard).join('') || ui.empty('No goals yet.')}</div>
      <div class="d-flex justify-content-between align-items-center mb-3"><h5 class="fw-semibold mb-0"><i class="bi bi-clock-history me-2 text-secondary"></i>Recent Transactions</h5><a href="/transactions/history" data-link class="btn btn-sm btn-outline-secondary">View All</a></div>
      ${transactionList(data.recentTransactions)}`;
    showMotivation();
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
        ${ui.input('category', 'Category', 'text', 'Salary, rent, food...')}
        <div class="d-flex flex-wrap gap-1 mb-3">${categories.map(category => `<button class="btn btn-sm btn-outline-secondary quick-cat" type="button" data-action="set-category" data-category="${esc(category)}">${esc(category)}</button>`).join('')}</div>
        ${ui.input('subcategory', 'Subcategory', 'text', 'Optional', '', false)}
        ${type === 'Expense' ? `<div class="mb-3"><label class="form-label">Account <span class="text-danger">*</span></label><select class="form-select" name="account" required>${accounts.map(account => `<option value="${account.id}">${esc(account.name)} - ${money(account.balanceCents)}${account.goalCents > account.balanceCents ? ' (locked)' : ''}</option>`).join('')}</select></div>` : ''}
        ${type === 'Expense' ? `<div class="mb-3"><label class="form-label">Necessity</label><select class="form-select" name="isNecessary"><option value="">Not sure</option><option value="true">Necessary</option><option value="false">Unnecessary</option></select></div>` : ''}
        ${ui.input('amount', `Amount (${currentUser.currency})`, 'number', '0')}
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
        <div class="col-6 col-md-3">${ui.input('category', 'Category', 'text', 'Filter', '', false, params.get('category') || '')}</div>
        <div class="col-6 col-md-3">${ui.input('from', 'From', 'date', '', '', false, params.get('from') || '')}</div>
        <div class="col-6 col-md-3">${ui.input('to', 'To', 'date', '', '', false, params.get('to') || '')}</div>
        <div class="col-12 col-md-1"><button class="btn btn-primary btn-sm w-100">Go</button></div>
      </form></div>
      ${historyTable(data.transactions)}
      ${pagination(data.currentPage, data.totalPages, params)}`;
    const typeSelect = app.querySelector('select[name="type"]');
    if (typeSelect) typeSelect.value = params.get('type') || '';
  }

  async function renderGoals() {
    pageTitle('Goals');
    const { goals } = await api('/api/goals');
    const total = goals.reduce((sum, goal) => sum + (goal.percentage || 0), 0);
    app.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2"><h4 class="fw-bold mb-0"><i class="bi bi-trophy me-2 text-warning"></i>Savings Goals</h4><span class="badge ${total === 100 || goals.length === 0 ? 'bg-success' : 'bg-warning text-dark'}">Allocation ${total}%</span></div>
      <div class="row g-4 mb-4">${goals.map(goalListCard).join('') || ui.empty('No goals yet.')}</div>
      <div class="row g-4"><div class="col-lg-6"><div class="card p-4"><h5>Add Goal</h5><form data-form="goal">${ui.input('name', 'Goal name', 'text', 'Emergency laptop fund')}${ui.input('target', `Target (${currentUser.currency})`, 'number', '0')}${ui.input('percentage', 'Goal allocation percentage', 'number', '0')}<div class="mb-3"><label class="form-label">Priority</label><select class="form-select" name="priority"><option value="medium">Medium</option><option value="high">High</option><option value="low">Low</option></select></div><button class="btn btn-primary">Add Goal</button></form></div></div>
      <div class="col-lg-6"><div class="card p-4"><h5>Adjust Goal Allocation</h5><form data-form="goal-distribution">${goals.map(goal => ui.distributionRow(goal)).join('') || '<p class="text-muted mb-0">Add goals before setting allocation.</p>'}<div class="d-flex justify-content-between mt-3"><strong>Total</strong><strong data-total="goals">0%</strong></div><button class="btn btn-outline-primary mt-3" ${goals.length ? '' : 'disabled'}>Save Allocation</button></form></div></div></div>`;
    updateDistributionTotals();
  }

  async function renderDistribution() {
    pageTitle('Distribution');
    const [{ accounts }, { goals }] = await Promise.all([api('/api/accounts'), api('/api/goals')]);
    app.innerHTML = `<div class="mb-4"><h4 class="fw-bold mb-1"><i class="bi bi-sliders me-2 text-primary"></i>Distribution Settings</h4><p class="text-muted small mb-0">Both account and goal allocations must total exactly 100%.</p></div>
      <div class="row g-4"><div class="col-lg-6"><div class="card p-4"><h5>Income Split Between Accounts</h5><form data-form="account-distribution">${accounts.map(ui.distributionRow).join('')}<div class="d-flex justify-content-between mt-3"><strong>Total</strong><strong data-total="accounts">0%</strong></div><button class="btn btn-primary mt-3">Save Account Split</button></form></div></div>
      <div class="col-lg-6"><div class="card p-4"><h5>Allocation Between Goals</h5><form data-form="goal-distribution">${goals.map(ui.distributionRow).join('') || '<p class="text-muted mb-0">No goals yet.</p>'}<div class="d-flex justify-content-between mt-3"><strong>Total</strong><strong data-total="goals">0%</strong></div><button class="btn btn-outline-primary mt-3" ${goals.length ? '' : 'disabled'}>Save Goal Split</button></form></div></div></div>`;
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
    chartInstances = renderFinanceCharts(data);
  }

  async function renderBudgets() {
    pageTitle('Budgets');
    const { budgets } = await api('/api/budgets');
    app.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2"><h4 class="fw-bold mb-0"><i class="bi bi-cash-coin me-2 text-primary"></i>Budgets</h4><span class="text-muted small">${budgets.length} active category plan${budgets.length === 1 ? '' : 's'}</span></div>
      <div class="row g-4"><div class="col-lg-7"><div class="row g-3">${budgets.map(budgetCard).join('') || ui.empty('No budgets yet. Add your first category budget.')}</div></div>
      <div class="col-lg-5"><div class="card p-4"><h5 class="fw-semibold mb-3">Add or Update Budget</h5><form data-form="budget">
        ${ui.input('category', 'Category', 'text', 'Food')}
        ${ui.input('limit', `Limit (${currentUser.currency})`, 'number', '0')}
        <div class="mb-3"><label class="form-label">Period</label><select class="form-select" name="period"><option value="monthly">Monthly</option><option value="weekly">Weekly</option></select></div>
        ${ui.input('alertThreshold', 'Alert threshold (%)', 'number', '80')}
        <button class="btn btn-primary"><i class="bi bi-plus-circle me-2"></i>Save Budget</button>
      </form></div></div></div>`;
  }

  async function renderRecurring() {
    pageTitle('Recurring');
    const [{ recurring }, { accounts }] = await Promise.all([api('/api/recurring'), api('/api/accounts')]);
    app.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2"><h4 class="fw-bold mb-0"><i class="bi bi-arrow-repeat me-2 text-primary"></i>Recurring Transactions</h4><button class="btn btn-sm btn-outline-primary" type="button" data-action="run-recurring"><i class="bi bi-play-circle me-1"></i>Run Due Now</button></div>
      <div class="row g-4"><div class="col-lg-7"><div class="row g-3">${recurring.map(recurringCard).join('') || ui.empty('No recurring transactions yet.')}</div></div>
      <div class="col-lg-5"><div class="card p-4"><h5 class="fw-semibold mb-3">Create Recurring Transaction</h5><form data-form="recurring">
        <div class="mb-3"><label class="form-label">Type</label><select class="form-select" name="type"><option value="Expense">Expense</option><option value="Income">Income</option></select></div>
        ${ui.input('category', 'Category', 'text', 'Rent, Salary, Subscription')}
        ${ui.input('subcategory', 'Subcategory', 'text', 'Optional', '', false)}
        ${ui.input('amount', `Amount (${currentUser.currency})`, 'number', '0')}
        <div class="mb-3"><label class="form-label">Account for expenses</label><select class="form-select" name="account">${accounts.map(account => `<option value="${account.id}">${esc(account.name)} - ${money(account.balanceCents)}</option>`).join('')}</select></div>
        <div class="mb-3"><label class="form-label">Frequency</label><select class="form-select" name="frequency"><option value="monthly">Monthly</option><option value="weekly">Weekly</option><option value="daily">Daily</option></select></div>
        ${ui.input('nextRunAt', 'Next run date', 'date', '')}
        <div class="mb-3"><label class="form-label">Reflection</label><textarea class="form-control" name="reflection" rows="2" maxlength="300"></textarea></div>
        <button class="btn btn-primary"><i class="bi bi-plus-circle me-2"></i>Save Recurring</button>
      </form></div></div></div>`;
  }

  async function renderReview() {
    pageTitle('Monthly Review');
    const { review } = await api('/api/reviews/monthly');
    app.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2"><h4 class="fw-bold mb-0"><i class="bi bi-clipboard-data me-2 text-primary"></i>Monthly Review</h4><span class="text-muted small">${esc(review.month)}</span></div>
      <div class="row g-3 mb-4">
        ${ui.stat('Income', money(review.incomeCents), '', 'success')}
        ${ui.stat('Expenses', money(review.expenseCents), '', 'danger')}
        ${ui.stat('Net', money(review.netCents), '', review.netCents >= 0 ? 'accent' : 'danger')}
        ${ui.stat('Savings Rate', `${review.savingsRate}%`, `${review.transactionCount} transactions`, 'accent')}
      </div>
      <div class="row g-4">
        <div class="col-lg-6"><div class="card p-4 h-100"><h5 class="fw-semibold mb-3">Advice</h5><ul class="mb-0">${review.advice.map(item => `<li>${esc(item)}</li>`).join('')}</ul></div></div>
        <div class="col-lg-6"><div class="card p-4 h-100"><h5 class="fw-semibold mb-3">Top Categories</h5>${review.topCategories.length ? `<div class="list-group list-group-flush">${review.topCategories.map(category => `<div class="list-group-item d-flex justify-content-between gap-3 px-0"><span>${esc(category.category)} <small class="text-muted">(${category.count})</small></span><strong>${money(category.totalCents)}</strong></div>`).join('')}</div>` : '<p class="text-muted mb-0">No expense categories this month.</p>'}</div></div>
        <div class="col-lg-6"><div class="card p-4 h-100"><h5 class="fw-semibold mb-3">Budget Watch</h5>${review.budgets.length ? review.budgets.map(reviewBudgetRow).join('') : '<p class="text-muted mb-0">No budgets configured yet.</p>'}</div></div>
        <div class="col-lg-6"><div class="card p-4 h-100"><h5 class="fw-semibold mb-3">Goal Timing</h5>${review.goals.length ? review.goals.map(reviewGoalRow).join('') : '<p class="text-muted mb-0">No goals configured yet.</p>'}</div></div>
        <div class="col-12"><div class="card p-4"><h5 class="fw-semibold mb-3">Spending Flags</h5>${review.highSpends.length ? `<div class="table-responsive"><table class="table align-middle mb-0"><thead class="table-header"><tr><th>Date</th><th>Category</th><th>Account</th><th>Flag</th><th class="text-end">Amount</th></tr></thead><tbody>${review.highSpends.map(tx => `<tr><td class="text-muted small">${new Date(tx.date).toLocaleDateString()}</td><td>${esc(tx.category)}</td><td>${esc(tx.accountName)}</td><td><span class="badge bg-warning text-dark">${esc(tx.flag)}</span></td><td class="text-end fw-bold text-danger">${money(tx.amountCents)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="text-muted mb-0">No high-spend flags this month.</p>'}</div></div>
      </div>`;
  }

  async function renderAudit() {
    pageTitle('Audit Log');
    const { audit } = await api('/api/audit');
    app.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2"><h4 class="fw-bold mb-0"><i class="bi bi-shield-check me-2 text-primary"></i>Audit Log</h4><span class="text-muted small">Latest ${audit.length} events</span></div>
      <div class="card"><div class="table-responsive"><table class="table table-hover align-middle mb-0"><thead class="table-header"><tr><th>Date</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead><tbody>${audit.map(auditRow).join('') || '<tr><td colspan="4" class="text-muted text-center py-4">No audit activity yet.</td></tr>'}</tbody></table></div></div>`;
  }

  function renderProfile() {
    pageTitle('Profile');
    app.innerHTML = `<div class="row justify-content-center"><div class="col-12 col-lg-7"><div class="card p-4 p-md-5"><h4 class="fw-bold mb-1"><i class="bi bi-person-circle me-2 text-primary"></i>Profile Settings</h4><p class="text-muted small mb-4">Update your personal details and local display preferences.</p>
      <form data-form="profile"><div class="row g-2"><div class="col-md-6">${ui.input('firstName', 'First name', 'text', '', 'given-name', true, currentUser.firstName)}</div><div class="col-md-6">${ui.input('lastName', 'Last name', 'text', '', 'family-name', true, currentUser.lastName)}</div></div>
      ${ui.input('middleName', 'Middle name', 'text', '', 'additional-name', false, currentUser.middleName)}${ui.input('phoneNumber', 'Phone number', 'tel', '', 'tel', false, currentUser.phoneNumber)}${ui.input('profilePicture', 'Profile picture URL or local path', 'text', '/icons/logo.png', '', false, currentUser.profilePicture)}
      <div class="mb-3"><label class="form-label">Bio</label><textarea class="form-control" name="bio" maxlength="280" rows="3">${esc(currentUser.bio)}</textarea></div>
      <div class="mb-3"><label class="form-label">Email</label><input class="form-control" type="email" value="${esc(currentUser.email)}" disabled></div>
      <div class="row g-3 mb-4"><div class="col-6"><label class="form-label">Language</label><select class="form-select" name="language"><option value="en">English</option><option value="fr">Francais</option></select></div><div class="col-6"><label class="form-label">Theme</label><select class="form-select" name="theme"><option value="light">Light</option><option value="dark">Dark</option></select></div></div>
      <button class="btn btn-primary"><i class="bi bi-check-circle me-2"></i>Save Changes</button></form>
      <hr class="my-4">
      <h5 class="fw-semibold mb-3"><i class="bi bi-shield-lock me-2 text-primary"></i>Security</h5>
      <form data-form="password">
        ${ui.passwordInput('currentPassword', 'Current password', 'current-password')}
        ${ui.passwordInput('newPassword', 'New password', 'new-password')}
        ${ui.passwordInput('confirmPassword', 'Confirm new password', 'new-password')}
        <button class="btn btn-outline-primary"><i class="bi bi-key me-2"></i>Change Password</button>
      </form>
      <hr class="my-4">
      <h5 class="fw-semibold mb-3"><i class="bi bi-database-down me-2 text-primary"></i>Data</h5>
      <div class="d-flex gap-2 flex-wrap mb-4"><a class="btn btn-outline-secondary" href="/api/profile/export"><i class="bi bi-download me-2"></i>Export JSON</a></div>
      <div class="border border-danger rounded p-3">
        <h6 class="fw-semibold text-danger">Delete Account</h6>
        <p class="text-muted small">This removes your user profile, accounts, goals, budgets, recurring templates, transactions, and audit logs.</p>
        <form data-form="delete-account" class="d-flex gap-2 flex-wrap"><input class="form-control" name="confirm" placeholder="Type DELETE" autocomplete="off"><button class="btn btn-outline-danger">Delete Account</button></form>
      </div>
      </div></div></div>`;
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
    if (action === 'command') {
      const path = event.target.closest('[data-path]').dataset.path;
      commandPaletteApi.run(path);
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
    commandPaletteApi.handleInput(event);
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
      if (name === 'password') {
        await api('/api/profile/password', { method: 'PUT', body: JSON.stringify(formData(form)) });
        form.reset();
        showAlert('Password changed.');
      }
      if (name === 'delete-account') {
        if (!confirm('This permanently deletes your finance tracker account and all financial data. Continue?')) return;
        await api('/api/profile', { method: 'DELETE', body: JSON.stringify(formData(form)) });
        currentUser = null;
        showAlert('Account deleted.');
        navigate('/register');
      }
    } catch (error) {
      showAlert(error.message, 'danger');
    }
  });

  document.addEventListener('click', async event => {
    if (!event.target.closest('.js-theme-toggle')) return;
    const theme = toggleTheme();
    if (!currentUser) return;
    try {
      const data = await api('/api/profile/theme', { method: 'PATCH', body: JSON.stringify({ theme }) });
      currentUser = data.user;
    } catch (error) {
      showAlert(error.message || 'Theme saved locally, but could not be saved to your profile.', 'warning');
    }
  });

  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      commandPaletteApi.open();
    }
  });

  interceptNavigation(render);

  render();
}


