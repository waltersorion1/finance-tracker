function chartOptions() {
  const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
  const color = isDark ? '#9ca3af' : '#64748b';
  const grid = isDark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.06)';
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color } } },
    scales: {
      x: { ticks: { color }, grid: { color: grid } },
      y: { beginAtZero: true, ticks: { color }, grid: { color: grid } },
    },
  };
}

export function renderFinanceCharts(data) {
  const opts = chartOptions();
  return [
    new Chart(document.getElementById('monthlyChart'), {
      type: 'bar',
      data: {
        labels: data.monthly.labels,
        datasets: [
          { label: 'Income', data: data.monthly.incomeData, backgroundColor: 'rgba(16,185,129,.75)' },
          { label: 'Expenses', data: data.monthly.expenseData, backgroundColor: 'rgba(239,68,68,.75)' },
        ],
      },
      options: opts,
    }),
    new Chart(document.getElementById('weeklyChart'), {
      type: 'line',
      data: {
        labels: data.weekly.labels,
        datasets: [
          { label: 'Income', data: data.weekly.incomeData, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,.1)', fill: true },
          { label: 'Expenses', data: data.weekly.expenseData, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,.1)', fill: true },
        ],
      },
      options: opts,
    }),
    new Chart(document.getElementById('accountChart'), {
      type: 'bar',
      data: {
        labels: data.accounts.labels,
        datasets: [{ label: 'Balance', data: data.accounts.data, backgroundColor: 'rgba(14,165,233,.75)' }],
      },
      options: { ...opts, indexAxis: 'y' },
    }),
    new Chart(document.getElementById('catChart'), {
      type: 'doughnut',
      data: {
        labels: data.categories.labels.length ? data.categories.labels : ['No expenses'],
        datasets: [{ data: data.categories.data.length ? data.categories.data : [1], backgroundColor: ['#0ea5e9', '#10b981', '#ef4444', '#f59e0b', '#14b8a6', '#64748b'] }],
      },
      options: { responsive: true, maintainAspectRatio: false },
    }),
  ];
}
