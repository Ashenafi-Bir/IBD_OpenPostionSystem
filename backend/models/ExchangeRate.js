export default (sequelize, DataTypes) => {
  const ExchangeRate = sequelize.define('ExchangeRate', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    rateDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    buyingRate: {
      type: DataTypes.DECIMAL(15, 6),
      allowNull: false
    },
    sellingRate: {
      type: DataTypes.DECIMAL(15, 6),
      allowNull: false
    },
    midRate: {
      type: DataTypes.DECIMAL(15, 6),
      allowNull: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'exchange_rates',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['currency_id', 'rateDate']
      }
    ]
  });

  ExchangeRate.associate = function(models) {
    ExchangeRate.belongsTo(models.Currency, { foreignKey: 'currency_id' });
  };

  return ExchangeRate;
};