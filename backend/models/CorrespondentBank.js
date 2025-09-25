export default (sequelize, DataTypes) => {
  const CorrespondentBank = sequelize.define('CorrespondentBank', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    bankName: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    branchAddress: {
      type: DataTypes.TEXT
    },
    accountNumber: {
      type: DataTypes.STRING(100)
    },
    limitType: {
      type: DataTypes.ENUM('min', 'max'),
      allowNull: false
    },
    limitPercentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'correspondent_banks',
    timestamps: true
  });

  CorrespondentBank.associate = function(models) {
    CorrespondentBank.belongsTo(models.Currency, { foreignKey: 'currency_id' });
    CorrespondentBank.hasMany(models.CorrespondentBalance, { foreignKey: 'bank_id' });
  };

  return CorrespondentBank;
};