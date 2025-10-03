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
      type: DataTypes.DECIMAL(20, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    notes: {
      type: DataTypes.TEXT
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    tableName: 'correspondent_balances',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['bankId', 'balanceDate']
      }
    ]
  });

  CorrespondentBalance.associate = function(models) {
    CorrespondentBalance.belongsTo(models.CorrespondentBank, { 
      foreignKey: 'bankId',
      as: 'bank'
    });
    CorrespondentBalance.belongsTo(models.User, { 
      foreignKey: 'createdBy',
      as: 'creator'
    });
  };

  return CorrespondentBalance;
};