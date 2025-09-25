export default (sequelize, DataTypes) => {
  const Currency = sequelize.define('Currency', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code: {
      type: DataTypes.STRING(3),
      allowNull: false,
      unique: true
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    symbol: {
      type: DataTypes.STRING(5)
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'currencies',
    timestamps: true
  });

  Currency.associate = function(models) {
    Currency.hasMany(models.ExchangeRate, { foreignKey: 'currency_id' });
    Currency.hasMany(models.DailyBalance, { foreignKey: 'currency_id' });
    Currency.hasMany(models.FCYTransaction, { foreignKey: 'currency_id' });
    Currency.hasMany(models.CorrespondentBank, { foreignKey: 'currency_id' });
  };

  return Currency;
};