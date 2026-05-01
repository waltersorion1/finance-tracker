import { qsa } from '../core/dom.js';
import { syncThemeButtons } from '../core/theme.js';

export const commands = [
  { label: 'Dashboard', icon: 'bi-speedometer2', path: '/dashboard', auth: true },
  { label: 'Add Income', icon: 'bi-plus-circle', path: '/transactions/new?type=Income', auth: true },
  { label: 'Record Expense', icon: 'bi-dash-circle', path: '/transactions/new?type=Expense', auth: true },
  { label: 'Transaction History', icon: 'bi-clock-history', path: '/transactions/history', auth: true },
  { label: 'Loans', icon: 'bi-bank2', path: '/loans', auth: true },
  { label: 'Goals', icon: 'bi-trophy', path: '/goals', auth: true },
  { label: 'Budgets', icon: 'bi-cash-coin', path: '/budgets', auth: true },
  { label: 'Recurring Transactions', icon: 'bi-arrow-repeat', path: '/recurring', auth: true },
  { label: 'Monthly Review', icon: 'bi-clipboard-data', path: '/review', auth: true },
  { label: 'Analytics', icon: 'bi-bar-chart-line', path: '/analytics', auth: true },
  { label: 'Distribution Settings', icon: 'bi-sliders', path: '/settings/distribution', auth: true },
  { label: 'Profile', icon: 'bi-person-circle', path: '/profile', auth: true },
  { label: 'Sign In', icon: 'bi-box-arrow-in-right', path: '/login', auth: false },
];

export function renderNav({ currentUser, navLinks, mobileTabbar, path, esc }) {
  if (currentUser) {
    const firstName = currentUser.firstName || currentUser.name.split(' ')[0];
    navLinks.innerHTML = `
      <li class="nav-item"><a class="nav-link" href="/dashboard" data-link><i class="bi bi-speedometer2 me-1"></i>Dashboard</a></li>
      <li class="nav-item"><a class="nav-link" href="/transactions/new?type=Income" data-link><i class="bi bi-plus-circle me-1 text-success"></i>Income</a></li>
      <li class="nav-item"><a class="nav-link" href="/transactions/new?type=Expense" data-link><i class="bi bi-dash-circle me-1 text-danger"></i>Expense</a></li>
      <li class="nav-item"><a class="nav-link" href="/transactions/history" data-link><i class="bi bi-clock-history me-1"></i>History</a></li>
      <li class="nav-item"><a class="nav-link" href="/loans" data-link><i class="bi bi-bank2 me-1 text-primary"></i>Loans</a></li>
      <li class="nav-item"><a class="nav-link" href="/goals" data-link><i class="bi bi-trophy me-1 text-warning"></i>Goals</a></li>
      <li class="nav-item"><a class="nav-link" href="/analytics" data-link><i class="bi bi-bar-chart-line me-1"></i>Analytics</a></li>
      <li class="nav-item"><a class="nav-link" href="/budgets" data-link><i class="bi bi-cash-coin me-1"></i>Budgets</a></li>
      <li class="nav-item"><a class="nav-link" href="/recurring" data-link><i class="bi bi-arrow-repeat me-1"></i>Recurring</a></li>
      <li class="nav-item"><a class="nav-link" href="/review" data-link><i class="bi bi-clipboard-data me-1"></i>Review</a></li>
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
    if (link.pathname === path) link.classList.add('active');
  });
  renderMobileTabbar({ currentUser, mobileTabbar, path });
  syncThemeButtons();
}

function renderMobileTabbar({ currentUser, mobileTabbar, path }) {
  if (!currentUser) {
    mobileTabbar.innerHTML = '';
    return;
  }

  const items = [
    { label: 'Home', icon: 'bi-speedometer2', path: '/dashboard' },
    { label: 'Spend', icon: 'bi-dash-circle', path: '/transactions/new?type=Expense' },
    { label: 'History', icon: 'bi-clock-history', path: '/transactions/history' },
    { label: 'Goals', icon: 'bi-trophy', path: '/goals' },
    { label: 'Review', icon: 'bi-clipboard-data', path: '/review' },
  ];
  mobileTabbar.innerHTML = items.map(item => {
    const active = path === item.path.split('?')[0] ? 'active' : '';
    return `<a class="${active}" href="${item.path}" data-link><i class="bi ${item.icon}"></i><span>${item.label}</span></a>`;
  }).join('');
}

export function createCommandPalette({ currentUser, commandPalette, commandSearch, commandResults, esc, navigate }) {
  function availableCommands() {
    return commands.filter(command => (currentUser() ? command.auth : !command.auth));
  }

  function renderCommands(query = '') {
    const normalized = query.trim().toLowerCase();
    const matches = availableCommands().filter(command => command.label.toLowerCase().includes(normalized));
    commandResults.innerHTML = matches.map(command => `<button class="list-group-item command-item" type="button" data-action="command" data-path="${command.path}"><i class="bi ${command.icon} me-2"></i>${esc(command.label)}</button>`).join('') || '<p class="text-muted small mb-0 px-2">No matching actions.</p>';
  }

  function open() {
    renderCommands();
    const modal = bootstrap.Modal.getOrCreateInstance(commandPalette);
    modal.show();
    setTimeout(() => commandSearch.focus(), 150);
  }

  function handleInput(event) {
    if (event.target === commandSearch) renderCommands(commandSearch.value);
  }

  function run(path) {
    bootstrap.Modal.getOrCreateInstance(commandPalette).hide();
    navigate(path);
  }

  return { handleInput, open, run };
}
