function line(label, value, icon = '•') {
  return `${icon} ${label.padEnd(12)} ${value}`;
}

function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes < 60) return `${minutes}m ${rest}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function renderBootBanner({ env, healthUrl, localUrl, mongoStatus, pid, schedulerStatus, startTime }) {
  const startedAt = startTime.toLocaleString();
  const lines = [
    '',
    '🧠 FinTrack Server Boot Sequence Initialized...',
    '',
    line('STATUS:', 'Online', '🚀'),
    line('LOCALHOST:', localUrl, '🌐'),
    line('HEALTH:', healthUrl, '🩺'),
    line('ENV:', env, '📦'),
    line('MONGO:', mongoStatus, '🗄️'),
    line('SCHEDULER:', schedulerStatus, '⏱️'),
    line('START TIME:', startedAt, '🕒'),
    line('UPTIME:', formatDuration(Math.round(process.uptime())), '⏳'),
    line('PID:', pid, '💾'),
    '',
    '📡 Listening for incoming requests...',
    '',
  ];

  console.log(lines.join('\n'));
}

function renderBootFailure(error) {
  console.error([
    '',
    '💥 FinTrack Server Boot Failed',
    '',
    line('STATUS:', 'Offline', '🚫'),
    line('ERROR:', error.message || error, '❌'),
    '',
  ].join('\n'));
}

module.exports = { renderBootBanner, renderBootFailure };
