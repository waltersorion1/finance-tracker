export function createComponents({ esc, money, getCurrentUser }) {
  function input(name, label, type = 'text', placeholder = '', autocomplete = '', required = true, value = '') {
    return `<div class="mb-3"><label class="form-label">${label}${required ? ' <span class="text-danger">*</span>' : ''}</label><input class="form-control" name="${name}" type="${type}" placeholder="${placeholder}" autocomplete="${autocomplete}" value="${esc(value)}" ${required ? 'required' : ''}></div>`;
  }

  function passwordInput(name, label, autocomplete) {
    return `<div class="mb-3"><label class="form-label">${label} <span class="text-danger">*</span></label><div class="input-group"><input class="form-control" name="${name}" type="password" autocomplete="${autocomplete}" required><button class="btn btn-outline-secondary" type="button" data-action="toggle-password"><i class="bi bi-eye"></i></button></div></div>`;
  }

  function authShell(title, subtitle, body) {
    return `<div class="auth-card card p-4 p-md-5 mt-4">
      <div class="text-center mb-4"><i class="bi bi-graph-up-arrow fs-1 text-primary"></i><h2 class="fw-bold mt-2">${title}</h2><p class="text-muted small">${subtitle}</p></div>
      ${body}
    </div>`;
  }

  function feature(icon, title, copy) {
    return `<div class="col-md-4"><div class="card h-100 p-4"><div class="feature-icon mb-3"><i class="bi ${icon}"></i></div><h5>${title}</h5><p class="text-muted small mb-0">${copy}</p></div></div>`;
  }

  function stat(label, value, suffix, tone) {
    return `<div class="col-6 col-lg-3"><div class="card stat-card ${tone} p-3"><p class="stat-label">${label}</p><p class="stat-value">${value}</p><p class="stat-currency">${suffix || getCurrentUser().currency}</p></div></div>`;
  }

  function empty(text) {
    return `<div class="col-12"><div class="card empty-state p-4"><div><i class="bi bi-inbox fs-2 d-block mb-2"></i>${esc(text)}</div></div></div>`;
  }

  function distributionRow(item) {
    return `<div class="distribution-row mb-2"><label class="small fw-medium">${esc(item.name)}</label><input class="form-range" type="range" min="0" max="100" step="1" name="${item.id}" value="${item.percentage || 0}" data-distribution><input class="form-control form-control-sm" type="number" min="0" max="100" step="1" value="${item.percentage || 0}" data-mirror="${item.id}"></div>`;
  }

  return { authShell, distributionRow, empty, feature, input, passwordInput, stat };
}
