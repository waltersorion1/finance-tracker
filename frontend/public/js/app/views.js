export function createViewHelpers({ esc, money, ui }) {
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
    const eta = goal.estimatedMonths == null ? 'ETA needs income data' : goal.estimatedMonths === 0 ? 'Ready now' : `${goal.estimatedMonths} month${goal.estimatedMonths === 1 ? '' : 's'} at current split`;
    return `<div class="col-12 col-md-4"><div class="card p-3 h-100"><div class="d-flex justify-content-between gap-2"><h6 class="fw-semibold mb-1">${esc(goal.name)}</h6><span class="badge ${goal.pct >= 100 ? 'bg-success' : 'bg-warning text-dark'}">${goal.pct}%</span></div><p class="text-muted small mb-2">${money(goal.balanceCents)} / ${money(goal.targetCents)}</p><progress class="w-100" max="100" value="${goal.pct}">${goal.pct}%</progress><p class="text-muted small mt-2 mb-0">${goal.percentage}% goal allocation · ${esc(eta)}</p></div></div>`;
  }

  function transactionList(transactions) {
    if (!transactions.length) return ui.empty('No transactions yet. Add your first income.');
    return `<div class="card"><ul class="list-group list-group-flush">${transactions.map(tx => `<li class="list-group-item d-flex justify-content-between align-items-center py-3 gap-3"><div class="d-flex align-items-center gap-3"><div class="tx-icon ${tx.type.toLowerCase()}"><i class="bi ${tx.type === 'Income' ? 'bi-arrow-down-circle' : 'bi-arrow-up-circle'}"></i></div><div><p class="fw-medium mb-0 small">${esc(tx.category)}</p><p class="text-muted mb-0 small">${new Date(tx.date).toLocaleDateString()} · ${esc(tx.accountName)}</p></div></div><span class="fw-bold ${tx.type === 'Income' ? 'text-success' : 'text-danger'}">${tx.type === 'Income' ? '+' : '-'}${money(tx.amountCents)}</span></li>`).join('')}</ul></div>`;
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

  function goalListCard(goal) {
    const eta = goal.estimatedMonths == null ? 'ETA needs income data' : goal.estimatedMonths === 0 ? 'Ready now' : `${goal.estimatedMonths} month${goal.estimatedMonths === 1 ? '' : 's'} at current split`;
    return `<div class="col-12 col-md-6 col-xl-4"><div class="card h-100 p-4">
      <div class="d-flex justify-content-between align-items-start gap-2 mb-2"><h5 class="fw-semibold mb-0">${esc(goal.name)}</h5><span class="badge ${goal.pct >= 100 ? 'bg-success' : 'bg-warning text-dark'}">${goal.pct}%</span></div>
      <p class="text-muted small mb-2">${money(goal.balanceCents)} saved of ${money(goal.targetCents)}</p>
      <progress class="w-100" max="100" value="${goal.pct}">${goal.pct}%</progress>
      <p class="text-muted small mt-2 mb-0">${goal.percentage}% allocation · ${esc(goal.priority)} priority · ${esc(eta)}</p>
      <button class="btn btn-sm btn-outline-danger mt-3" type="button" data-action="delete-goal" data-id="${goal.id}"><i class="bi bi-trash3 me-1"></i>Delete</button>
    </div></div>`;
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

  function recurringCard(job) {
    return `<div class="col-12"><div class="card p-3">
      <div class="d-flex justify-content-between align-items-start gap-3"><div><h5 class="fw-semibold mb-1">${esc(job.category)}</h5><p class="text-muted small mb-0">${esc(job.frequency)} ${esc(job.type.toLowerCase())} · next ${new Date(job.nextRunAt).toLocaleDateString()}</p></div><button class="btn btn-sm btn-ghost text-danger" type="button" data-action="delete-recurring" data-id="${job.id}" title="Delete"><i class="bi bi-trash3"></i></button></div>
      <p class="fs-5 fw-bold mb-1 mt-3 ${job.type === 'Income' ? 'text-success' : 'text-danger'}">${job.type === 'Income' ? '+' : '-'}${money(job.amountCents)}</p>
      <p class="text-muted small mb-0">${job.account?.name ? `Account: ${esc(job.account.name)}` : 'Auto-distributed income'}</p>
    </div></div>`;
  }

  function reviewBudgetRow(budget) {
    return `<div class="mb-3"><div class="d-flex justify-content-between small"><span>${esc(budget.category)}</span><strong class="${budget.status === 'over' ? 'text-danger' : budget.status === 'warning' ? 'text-warning' : 'text-success'}">${budget.pct}%</strong></div><progress class="w-100" max="100" value="${Math.min(budget.pct, 100)}">${Math.min(budget.pct, 100)}%</progress><p class="text-muted small mb-0">${money(budget.spentCents)} / ${money(budget.limitCents)} ${esc(budget.period)}</p></div>`;
  }

  function reviewGoalRow(goal) {
    const eta = goal.estimatedMonths == null ? 'Needs income data' : goal.estimatedMonths === 0 ? 'Ready now' : `${goal.estimatedMonths} month${goal.estimatedMonths === 1 ? '' : 's'}`;
    return `<div class="mb-3"><div class="d-flex justify-content-between small"><span>${esc(goal.name)}</span><strong>${goal.pct}%</strong></div><progress class="w-100" max="100" value="${goal.pct}">${goal.pct}%</progress><p class="text-muted small mb-0">${money(goal.remainingCents)} remaining · ${esc(eta)}</p></div>`;
  }

  function auditRow(item) {
    return `<tr><td class="text-muted small">${new Date(item.createdAt).toLocaleString()}</td><td><span class="badge bg-primary">${esc(item.action)}</span></td><td>${esc(item.entity)}</td><td class="text-muted small">${esc(JSON.stringify(item.metadata || {}))}</td></tr>`;
  }

  return {
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
  };
}
