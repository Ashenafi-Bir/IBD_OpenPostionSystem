export default (sequelize, DataTypes) => {
  const DailyBalance = sequelize.define('DailyBalance', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    balanceDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(20, 5),
      allowNull: false,
      defaultValue: 0
    },
    status: {
      type: DataTypes.ENUM('draft', 'submitted', 'authorized', 'rejected'),
      defaultValue: 'draft'
    },
    notes: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'daily_balances',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['balanceDate', 'currency_id', 'item_id']
      }
    ]
  });

  DailyBalance.associate = function(models) {
    DailyBalance.belongsTo(models.Currency, { foreignKey: 'currency_id' });
    DailyBalance.belongsTo(models.BalanceItem, { foreignKey: 'item_id' });
    DailyBalance.belongsTo(models.User, { as: 'Authorizer', foreignKey: 'authorized_by' });
    DailyBalance.belongsTo(models.User, { as: 'Creator', foreignKey: 'created_by' });
  };

  return DailyBalance;
};