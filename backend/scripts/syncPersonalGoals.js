require('dotenv').config();

const mongoose = require('mongoose');
const Account = require('../models/Account');
const Goal = require('../models/Goal');
const User = require('../models/User');

const oldGoalNames = ['Buy Land', 'Travel To Dubai', 'Travel to Dubai', 'Buy a Scooter', 'Travel Fund'];
const oldAccountNames = ['Land Fund', 'Travel Fund', 'Vehicle Fund'];

const desiredGoals = [
  {
    name: 'Buy a Car',
    targetCents: 700000000,
    accountPercentage: 13,
    goalPercentage: 65,
    priority: 'high',
  },
  {
    name: 'Rent Studio',
    targetCents: 70000000,
    accountPercentage: 10,
    goalPercentage: 35,
    priority: 'high',
  },
];

async function upsertGoalWithAccount(userId, goalDef) {
  let account = await Account.findOne({ user: userId, name: goalDef.name });
  if (!account) {
    account = await Account.create({
      user: userId,
      name: goalDef.name,
      type: 'goal',
      percentage: goalDef.accountPercentage,
      goalCents: goalDef.targetCents,
    });
  } else {
    account.type = 'goal';
    account.percentage = goalDef.accountPercentage;
    account.goalCents = goalDef.targetCents;
    await account.save();
  }

  let goal = await Goal.findOne({ user: userId, name: goalDef.name });
  if (!goal) {
    goal = await Goal.create({
      user: userId,
      name: goalDef.name,
      targetCents: goalDef.targetCents,
      percentage: goalDef.goalPercentage,
      priority: goalDef.priority,
      account: account._id,
    });
  } else {
    goal.targetCents = goalDef.targetCents;
    goal.percentage = goalDef.goalPercentage;
    goal.priority = goalDef.priority;
    goal.account = account._id;
    await goal.save();
  }
}

async function syncUser(user) {
  await Goal.deleteMany({ user: user._id, name: { $in: oldGoalNames } });
  await Account.deleteMany({ user: user._id, name: { $in: oldAccountNames }, type: 'goal' });

  for (const goal of desiredGoals) {
    await upsertGoalWithAccount(user._id, goal);
  }
}

async function main() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI env var is not set.');
  await mongoose.connect(process.env.MONGO_URI);

  const users = await User.find({});
  for (const user of users) {
    await syncUser(user);
  }

  console.log(`Synced personal goals for ${users.length} user(s).`);
  await mongoose.disconnect();
}

main().catch(async err => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
