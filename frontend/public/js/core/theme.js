export function getTheme() {
  return document.documentElement.getAttribute('data-bs-theme') || 'light';
}

export function setTheme(theme) {
  document.documentElement.setAttribute('data-bs-theme', theme);
  localStorage.setItem('theme', theme);
  syncThemeButtons();
}

export function toggleTheme() {
  const nextTheme = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(nextTheme);
  return nextTheme;
}

export function syncThemeButtons() {
  const theme = getTheme();
  document.querySelectorAll('.js-theme-toggle i').forEach(icon => {
    icon.className = theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
  });
}

export function initTheme() {
  setTheme(localStorage.getItem('theme') || 'light');
}
