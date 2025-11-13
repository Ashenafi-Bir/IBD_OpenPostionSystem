export default (sequelize, DataTypes) => {
  const BalanceItem = sequelize.define('BalanceItem', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    category: {
      type: DataTypes.ENUM('asset', 'liability', 'memo_asset', 'memo_liability'),
      allowNull: false
    },
    balanceType: {
      type: DataTypes.ENUM('on_balance_sheet', 'off_balance_sheet'),
      allowNull: false,
      defaultValue: 'on_balance_sheet',
      field: 'balance_type'
    },
    description: {
      type: DataTypes.TEXT
    },
    displayOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'balance_items',
    timestamps: true
  });

  BalanceItem.associate = function(models) {
    BalanceItem.hasMany(models.DailyBalance, { foreignKey: 'item_id' });
  };

  return BalanceItem;
};