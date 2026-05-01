require('dotenv').config();

const mongoose = require('mongoose');
const Loan = require('../models/Loan');

function hasFlag(flag) {
  return process.argv.slice(2).includes(flag);
}

async function run() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI env var is not set.');
  }

  const apply = hasFlag('--apply');
  await mongoose.connect(process.env.MONGO_URI);

  const [total, borrowedCount, lentCount, missingTypeCount] = await Promise.all([
    Loan.countDocuments({}),
    Loan.countDocuments({ type: 'borrowed' }),
    Loan.countDocuments({ type: 'lent' }),
    Loan.countDocuments({ $or: [{ type: { $exists: false } }, { type: null }, { type: '' }] }),
  ]);

  console.log('Loan migration scan (debt-only):');
  console.log(`- Total loans: ${total}`);
  console.log(`- Borrowed loans: ${borrowedCount}`);
  console.log(`- Lent loans: ${lentCount}`);
  console.log(`- Missing/blank type: ${missingTypeCount}`);

  if (!apply) {
    console.log('Dry run complete. Re-run with --apply to delete lent loans and normalize missing types.');
    await mongoose.disconnect();
    return;
  }

  const [deleted, normalized] = await Promise.all([
    Loan.deleteMany({ type: 'lent' }),
    Loan.updateMany(
      { $or: [{ type: { $exists: false } }, { type: null }, { type: '' }] },
      { $set: { type: 'borrowed' } },
    ),
  ]);

  console.log('Applied changes:');
  console.log(`- Deleted lent loans: ${deleted.deletedCount || 0}`);
  console.log(`- Normalized missing/blank type loans: ${normalized.modifiedCount || 0}`);

  await mongoose.disconnect();
}

run().catch(async error => {
  console.error('Loan migration failed:', error.message);
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  process.exit(1);
});
