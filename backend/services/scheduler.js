const User = require('../models/User');
const { processDueRecurringTransactions } = require('./recurring');

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;

async function processAllDueRecurringTransactions(now = new Date()) {
  const users = await User.find({}).select('_id currency').lean();
  let processed = 0;

  for (const user of users) {
    const results = await processDueRecurringTransactions(user, now);
    processed += results.length;
  }

  return { usersChecked: users.length, processed };
}

function startRecurringScheduler({ intervalMs = DEFAULT_INTERVAL_MS } = {}) {
  if (process.env.DISABLE_RECURRING_SCHEDULER === 'true') {
    console.log('⏱️ Recurring scheduler disabled by environment.');
    return null;
  }

  const run = async () => {
    try {
      const result = await processAllDueRecurringTransactions();
      if (result.processed > 0) {
        console.log(`⏱️ Recurring scheduler processed ${result.processed} transaction(s) across ${result.usersChecked} user(s).`);
      }
    } catch (err) {
      console.error('⏱️ Recurring scheduler error:', err.message);
    }
  };

  const timer = setInterval(run, intervalMs);
  timer.unref?.();
  setTimeout(run, 5000).unref?.();
  return timer;
}

module.exports = { processAllDueRecurringTransactions, startRecurringScheduler };
