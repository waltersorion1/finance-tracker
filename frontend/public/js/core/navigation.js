export function currentPath() {
  return window.location.pathname;
}

export function navigate(path, render) {
  window.history.pushState({}, '', path);
  render();
}

export function interceptNavigation(render) {
  document.addEventListener('click', event => {
    const link = event.target.closest('a[data-link]');
    if (!link) return;
    event.preventDefault();
    navigate(link.pathname + link.search, render);
  });

  window.addEventListener('popstate', render);
}
