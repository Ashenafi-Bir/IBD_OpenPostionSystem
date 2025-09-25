const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Capital = sequelize.define('Capital', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  capital_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(20, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  currency_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  capital_type: {
    type: DataTypes.ENUM('paid_up', 'authorized', 'reserve'),
    defaultValue: 'paid_up'
  },
  description: {
    type: DataTypes.TEXT
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'capital',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['capital_date', 'currency_id', 'capital_type']
    }
  ]
});

Capital.associate = function(models) {
  Capital.belongsTo(models.Currency, { foreignKey: 'currency_id', as: 'currency' });
  Capital.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' });
};

module.exports = Capital;