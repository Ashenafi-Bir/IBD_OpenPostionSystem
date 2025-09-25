export default (sequelize, DataTypes) => {
  const PaidUpCapital = sequelize.define('PaidUpCapital', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    capitalAmount: {
      type: DataTypes.DECIMAL(20, 2),
      allowNull: false
    },
    effectiveDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'ETB'
    },
    notes: {
      type: DataTypes.TEXT
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'paid_up_capital',
    timestamps: true
  });

  PaidUpCapital.associate = function(models) {
    PaidUpCapital.belongsTo(models.User, { as: 'Creator', foreignKey: 'created_by' });
  };

  return PaidUpCapital;
};