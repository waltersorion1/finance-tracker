const mongoose = require('mongoose');
const app = require('./app');
const { startRecurringScheduler } = require('./services/scheduler');
const { renderBootBanner, renderBootFailure } = require('./utils/consoleBanner');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';
const START_TIME = new Date();

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    const scheduler = startRecurringScheduler();
    app.listen(PORT, () => {
      const localUrl = `http://${HOST}:${PORT}`;
      renderBootBanner({
        env: process.env.NODE_ENV || 'development',
        healthUrl: `${localUrl}/api/health`,
        localUrl,
        mongoStatus: 'Connected',
        pid: process.pid,
        schedulerStatus: scheduler ? 'Enabled' : 'Disabled',
        startTime: START_TIME,
      });
    });
  })
  .catch(err => {
    renderBootFailure(err);
    process.exit(1);
  });
