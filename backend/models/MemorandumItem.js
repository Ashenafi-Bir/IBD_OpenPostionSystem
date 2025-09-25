const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MemorandumItem = sequelize.define('MemorandumItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  item_code: {
    type: DataTypes.STRING(20),
    unique: true,
    allowNull: false
  },
  item_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  item_type: {
    type: DataTypes.ENUM('asset', 'liability'),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  risk_weight: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 100.00
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  created_by: {
    type: DataTypes.INTEGER
  }
}, {
  tableName: 'memorandum_items',
  timestamps: true
});

MemorandumItem.associate = function(models) {
  MemorandumItem.hasMany(models.DailyBalance, { 
    foreignKey: 'item_id', 
    as: 'dailyBalances',
    constraints: false,
    scope: {
      item_type: ['memo_asset', 'memo_liability']
    }
  });
};

module.exports = MemorandumItem;