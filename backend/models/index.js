import sequelize, { Sequelize } from '../config/database.js';
import { DataTypes } from 'sequelize';


// Import all models
import User from './User.js';
import Currency from './Currency.js';
import ExchangeRate from './ExchangeRate.js';
import BalanceItem from './BalanceItem.js';
import DailyBalance from './DailyBalance.js';
import FCYTransaction from './FCYTransaction.js';
import CorrespondentBank from './CorrespondentBank.js';
import CorrespondentBalance from './CorrespondentBalance.js';
import SystemLog from './SystemLog.js';
import PaidUpCapital from './PaidUpCapital.js';

// Initialize models
const models = {
  User: User(sequelize, DataTypes),
  Currency: Currency(sequelize, DataTypes),
  ExchangeRate: ExchangeRate(sequelize, DataTypes),
  BalanceItem: BalanceItem(sequelize, DataTypes),
  DailyBalance: DailyBalance(sequelize, DataTypes),
  FCYTransaction: FCYTransaction(sequelize, DataTypes),
  CorrespondentBank: CorrespondentBank(sequelize, DataTypes),
  CorrespondentBalance: CorrespondentBalance(sequelize, DataTypes),
  SystemLog: SystemLog(sequelize, DataTypes),
  PaidUpCapital: PaidUpCapital(sequelize, DataTypes)
};

// Define associations
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

models.sequelize = sequelize;
models.Sequelize = Sequelize;

export default models;
