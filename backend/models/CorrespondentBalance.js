export default (sequelize, DataTypes) => {
  const CorrespondentBalance = sequelize.define('CorrespondentBalance', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    balanceDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    balanceAmount: {
      type: DataTypes.DECIMAL(20, 5),
      allowNull: false
    },
    notes: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'correspondent_balances',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['bank_id', 'balanceDate']
      }
    ]
  });

  CorrespondentBalance.associate = function(models) {
    CorrespondentBalance.belongsTo(models.CorrespondentBank, { foreignKey: 'bank_id' });
  };

  return CorrespondentBalance;
};