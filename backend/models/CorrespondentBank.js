export default (sequelize, DataTypes) => {
  const CorrespondentBank = sequelize.define('CorrespondentBank', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    bankName: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    branchAddress: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    accountNumber: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    swiftCode: {
      type: DataTypes.STRING(11),
      allowNull: true
    },
    currencyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'currencies',
        key: 'id'
      }
    },
    maxLimit: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      }
    },
    minLimit: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    tableName: 'correspondent_banks',
    timestamps: true,
    underscored: false,
    // Add these to prevent Sequelize from using underscored field names
    define: {
      underscored: false
    }
  });

  CorrespondentBank.associate = function(models) {
    CorrespondentBank.belongsTo(models.Currency, { 
      foreignKey: 'currencyId',
      targetKey: 'id',
      as: 'currency'
    });
    CorrespondentBank.hasMany(models.CorrespondentBalance, { 
      foreignKey: 'bankId',
      as: 'balances'
    });
    CorrespondentBank.belongsTo(models.User, { 
      foreignKey: 'createdBy',
      as: 'creator'
    });
  };

  CorrespondentBank.prototype.checkLimits = function(currentPercentage) {
    const violations = [];
    
    if (this.maxLimit !== null && currentPercentage > this.maxLimit) {
      violations.push({
        type: 'MAX_LIMIT_EXCEEDED',
        current: currentPercentage, 
        limit: this.maxLimit,
        variation: currentPercentage - this.maxLimit
      });
    }
    
    if (this.minLimit !== null && currentPercentage < this.minLimit) {
      violations.push({
        type: 'MIN_LIMIT_VIOLATED',
        current: currentPercentage,
        limit: this.minLimit,
        variation: this.minLimit - currentPercentage
      });
    }
    
    return violations;
  };

  return CorrespondentBank;
};