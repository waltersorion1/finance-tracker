export function createLoanPages({ app, api, currentUser, esc, money, pageTitle, ui }) {
  const DAY_MS = 24 * 60 * 60 * 1000;

  function statusBadge(status) {
    if (status === 'paid') return 'bg-success';
    if (status === 'defaulted') return 'bg-danger';
    if (status === 'cancelled') return 'bg-secondary';
    return 'bg-primary';
  }

  function dueState(loan) {
    if (loan.status !== 'active' || loan.remainingCents <= 0 || !loan.dueAt) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(loan.dueAt);
    dueDate.setHours(0, 0, 0, 0);
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / DAY_MS);

    if (daysUntilDue < 0) {
      const overdueDays = Math.abs(daysUntilDue);
      return {
        tone: 'bg-danger',
        label: overdueDays === 1 ? 'Overdue 1 day' : `Overdue ${overdueDays} days`,
      };
    }
    if (daysUntilDue <= 7) {
      return {
        tone: 'bg-warning text-dark',
        label: daysUntilDue === 0 ? 'Due today' : `Due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}`,
      };
    }
    return null;
  }

  function loanCard(loan) {
    const due = loan.dueAt ? new Date(loan.dueAt).toLocaleDateString() : 'No due date';
    const latestRepayment = loan.repayments.length ? loan.repayments[loan.repayments.length - 1] : null;
    const deadlineState = dueState(loan);
    return `<div class="col-12 col-lg-6"><div class="card p-4 h-100 loan-card loan-borrowed">
      <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
        <div>
          <h5 class="fw-semibold mb-1">${esc(loan.counterparty)}</h5>
          <p class="text-muted small mb-0">External creditor · ${esc(loan.purpose || 'No purpose set')}</p>
        </div>
        <div class="d-flex flex-wrap gap-1 justify-content-end">
          <span class="badge ${statusBadge(loan.status)} text-uppercase">${esc(loan.status)}</span>
          ${deadlineState ? `<span class="badge ${deadlineState.tone}">${esc(deadlineState.label)}</span>` : ''}
        </div>
      </div>
      <div class="d-flex justify-content-between small text-muted mt-2"><span>Principal</span><strong class="text-body">${money(loan.principalCents)}</strong></div>
      <div class="d-flex justify-content-between small text-muted"><span>Repaid</span><strong class="text-success">${money(loan.repaidCents)}</strong></div>
      <div class="d-flex justify-content-between small text-muted"><span>Remaining</span><strong class="${loan.remainingCents === 0 ? 'text-success' : 'text-danger'}">${money(loan.remainingCents)}</strong></div>
      <progress class="w-100 mt-2" max="100" value="${loan.pctPaid}">${loan.pctPaid}%</progress>
      <p class="text-muted small mt-2 mb-0">${loan.pctPaid}% paid · Issued ${new Date(loan.issuedAt).toLocaleDateString()} · Due ${due}</p>
      ${latestRepayment ? `<p class="text-muted small mt-2 mb-0">Last repayment: ${money(latestRepayment.amountCents)} on ${new Date(latestRepayment.date).toLocaleDateString()} (${esc(latestRepayment.method)})</p>` : '<p class="text-muted small mt-2 mb-0">No repayments logged yet.</p>'}
      <div class="d-flex flex-wrap gap-2 mt-3">
        <button class="btn btn-sm btn-outline-primary" type="button" data-action="loan-fill-repayment" data-id="${loan.id}" data-remaining="${loan.remainingCents}">Repay Remaining</button>
        <button class="btn btn-sm btn-outline-secondary" type="button" data-action="loan-mark-status" data-id="${loan.id}" data-status="${loan.status === 'active' ? 'defaulted' : 'active'}">${loan.status === 'active' ? 'Mark Defaulted' : 'Mark Active'}</button>
        <button class="btn btn-sm btn-ghost text-danger" type="button" data-action="delete-loan" data-id="${loan.id}"><i class="bi bi-trash3"></i></button>
      </div>
    </div></div>`;
  }

  function loanPagination(currentPage, totalPages, params) {
    if (totalPages <= 1) return '';
    return `<nav class="mt-4"><ul class="pagination justify-content-center">${Array.from({ length: totalPages }, (_, index) => {
      const page = index + 1;
      params.set('page', page);
      const active = currentPage === page ? 'active' : '';
      return `<li class="page-item ${active}"><a class="page-link" href="/loans?${params.toString()}" data-link>${page}</a></li>`;
    }).join('')}</ul></nav>`;
  }

  async function renderLoans() {
    pageTitle('Loans');
    const params = new URLSearchParams(window.location.search);
    const qs = params.toString() ? `?${params.toString()}` : '';

    const [{ loans, summary, currentPage, totalPages }, { loans: activeLoans }] = await Promise.all([
      api(`/api/loans${qs}`),
      api('/api/loans?status=active&perPage=100'),
    ]);

    const loanOptions = activeLoans.map(loan => `<option value="${loan.id}">${esc(loan.counterparty)} · Remaining ${money(loan.remainingCents)}</option>`).join('');

    app.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2"><h4 class="fw-bold mb-0"><i class="bi bi-bank2 me-2 text-primary"></i>Loans</h4><span class="text-muted small">Track money borrowed from external sources (banks, friends, suppliers), including partial repayments.</span></div>
      <div class="row g-3 mb-4">
        ${ui.stat('Outstanding Debt', money(summary.debtOutstandingCents), 'active loan balance', 'danger')}
        ${ui.stat('Total Repaid', money(summary.totalRepaidCents), 'all repayments', 'success')}
        ${ui.stat('Active Loans', `${summary.activeCount}`, `${summary.dueSoonCount} due soon`, 'accent')}
        ${ui.stat('Overdue Loans', `${summary.overdueCount}`, `${summary.activeCount} active`, summary.overdueCount ? 'danger' : 'accent')}
      </div>

      <div class="card p-3 mb-4"><form class="row g-2 align-items-end" data-form="loan-filters">
        <div class="col-6 col-md-4"><label class="form-label small mb-1">Status</label><select name="status" class="form-select form-select-sm"><option value="">All</option><option value="active">Active</option><option value="paid">Paid</option><option value="defaulted">Defaulted</option><option value="cancelled">Cancelled</option></select></div>
        <div class="col-6 col-md-2">${ui.input('from', 'From', 'date', '', '', false, params.get('from') || '')}</div>
        <div class="col-6 col-md-2">${ui.input('to', 'To', 'date', '', '', false, params.get('to') || '')}</div>
        <div class="col-12 col-md-4"><button class="btn btn-primary btn-sm w-100">Apply</button></div>
      </form></div>

      <div class="row g-4 mb-4">
        <div class="col-xl-7"><div class="row g-3">${loans.map(loanCard).join('') || ui.empty('No loans match your filters.')}</div>${loanPagination(currentPage, totalPages, params)}</div>
        <div class="col-xl-5">
          <div class="card p-4">
            <ul class="nav nav-pills nav-fill mb-3" role="tablist">
              <li class="nav-item" role="presentation">
                <button class="nav-link active" data-loan-tab="create" data-bs-toggle="tab" data-bs-target="#loan-create-pane" type="button" role="tab" aria-selected="true">Add Loan</button>
              </li>
              <li class="nav-item" role="presentation">
                <button class="nav-link" data-loan-tab="repay" data-bs-toggle="tab" data-bs-target="#loan-repay-pane" type="button" role="tab" aria-selected="false">Record Repayment</button>
              </li>
            </ul>

            <div class="tab-content">
              <div class="tab-pane fade show active" id="loan-create-pane" role="tabpanel" tabindex="0">
                <form data-form="loan">
                  ${ui.input('counterparty', 'Lender / Creditor', 'text', 'Bank, friend, supplier')}
                  ${ui.input('principal', `Principal (${currentUser().currency})`, 'number', '0')}
                  ${ui.input('interestRate', 'Interest rate (%)', 'number', '0', '', false, '0')}
                  ${ui.input('issuedAt', 'Issued date', 'date', '', '', false, new Date().toISOString().slice(0, 10))}
                  ${ui.input('dueAt', 'Due date', 'date', '', '', false)}
                  ${ui.input('purpose', 'Purpose', 'text', 'Startup capital, emergency', '', false)}
                  <div class="mb-3"><label class="form-label">Notes</label><textarea class="form-control" name="notes" maxlength="400" rows="2"></textarea></div>
                  <button class="btn btn-primary w-100"><i class="bi bi-plus-circle me-2"></i>Create Loan</button>
                </form>
              </div>

              <div class="tab-pane fade" id="loan-repay-pane" role="tabpanel" tabindex="0">
                <form data-form="loan-repayment">
                  <div class="mb-3"><label class="form-label">Loan</label><select class="form-select" name="loanId" required>${loanOptions || '<option value="">No active loans</option>'}</select></div>
                  ${ui.input('amount', `Repayment amount (${currentUser().currency})`, 'number', '0')}
                  ${ui.input('date', 'Repayment date', 'date', '', '', false, new Date().toISOString().slice(0, 10))}
                  <div class="mb-3"><label class="form-label">Method</label><select class="form-select" name="method"><option value="transfer">Transfer</option><option value="cash">Cash</option><option value="mobile-money">Mobile money</option><option value="card">Card</option><option value="other" selected>Other</option></select></div>
                  <div class="mb-3"><label class="form-label">Note</label><textarea class="form-control" name="note" maxlength="200" rows="2" placeholder="Optional note"></textarea></div>
                  <button class="btn btn-outline-primary w-100" ${activeLoans.length ? '' : 'disabled'}><i class="bi bi-arrow-down-up me-2"></i>Save Repayment</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>`;

    const statusSelect = app.querySelector('select[name="status"]');
    if (statusSelect) statusSelect.value = params.get('status') || '';

    const createTabTrigger = app.querySelector('[data-loan-tab="create"]');
    const repayTabTrigger = app.querySelector('[data-loan-tab="repay"]');
    const initialTab = params.get('tab') === 'repay' ? 'repay' : 'create';
    const initialTrigger = initialTab === 'repay' ? repayTabTrigger : createTabTrigger;
    if (initialTrigger) bootstrap.Tab.getOrCreateInstance(initialTrigger).show();

    [createTabTrigger, repayTabTrigger].filter(Boolean).forEach(trigger => {
      trigger.addEventListener('shown.bs.tab', event => {
        const selected = event.target?.dataset?.loanTab === 'repay' ? 'repay' : 'create';
        const nextParams = new URLSearchParams(window.location.search);
        if (selected === 'repay') nextParams.set('tab', 'repay');
        else nextParams.delete('tab');
        const query = nextParams.toString();
        const nextUrl = query ? `/loans?${query}` : '/loans';
        window.history.replaceState(window.history.state, '', nextUrl);
      });
    });
  }

  return { renderLoans };
}
