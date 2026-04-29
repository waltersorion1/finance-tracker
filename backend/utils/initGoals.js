const Account = require('../models/Account');
const Goal = require('../models/Goal');
module.exports = async function initDefaultGoals(userId) {
  const goalData = [
    { name: 'Buy a Car', targetCents: 700000000, accountName: 'Buy a Car', percentage: 65 },
    { name: 'Rent Studio', targetCents: 70000000, accountName: 'Rent Studio', percentage: 35 }
  ];
  for (let data of goalData) {
    const account = await Account.findOne({ user: userId, name: data.accountName });
    if (account) {
      const exists = await Goal.findOne({ user: userId, account: account._id });
      if (!exists) {
        await Goal.create({
          user: userId,
          name: data.name,
          targetCents: data.targetCents,
          percentage: data.percentage,
          priority: 'high',
          account: account._id
        });
      }
    }
  }
};
