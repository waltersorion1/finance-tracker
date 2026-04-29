const RecurringTransaction = require('../models/RecurringTransaction');
const { addFrequency } = require('../utils/periods');
const { recordTransaction } = require('./transactions');

async function processDueRecurringTransactions(user, now = new Date()) {
  const jobs = await RecurringTransaction.find({
    user: user._id,
    active: true,
    nextRunAt: { $lte: now },
  }).populate('account');

  const results = [];
  for (const job of jobs) {
    const transaction = await recordTransaction({
      user,
      type: job.type,
      category: job.category,
      subcategory: job.subcategory,
      amountCents: job.amountCents,
      accountId: job.account?._id?.toString(),
      reflection: job.reflection || `Recurring ${job.frequency} ${job.type.toLowerCase()}`,
    });

    job.lastRunAt = now;
    job.nextRunAt = addFrequency(job.nextRunAt, job.frequency);
    await job.save();
    results.push({ job, transaction });
  }
  return results;
}

module.exports = { processDueRecurringTransactions };
