export function createTransactionPages({ app, api, currentUser, esc, historyTable, money, pageTitle, pagination, ui }) {
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
        ${ui.input('amount', `Amount (${currentUser().currency})`, 'number', '0')}
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

  return { renderHistory, renderTransactionForm };
}
