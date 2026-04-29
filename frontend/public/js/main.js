import { initTheme } from './core/theme.js';
import { registerServiceWorker } from './core/service-worker.js';
import { startApp } from './app/root.js';

initTheme();
registerServiceWorker();
startApp();
