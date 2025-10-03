export default (sequelize, DataTypes) => {
  const CorrespondentAlert = sequelize.define('CorrespondentAlert', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    alertType: {
      type: DataTypes.ENUM('MAX_LIMIT_EXCEEDED', 'MIN_LIMIT_VIOLATED'),
      allowNull: false
    },
    currentPercentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false
    },
    limitPercentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false
    },
    variation: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false
    },
    alertDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    isResolved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    resolvedBy: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'correspondent_alerts',
    timestamps: true
  });

  CorrespondentAlert.associate = function(models) {
    CorrespondentAlert.belongsTo(models.CorrespondentBank, { 
      foreignKey: 'bankId',
      as: 'bank'
    });
    CorrespondentAlert.belongsTo(models.User, { 
      foreignKey: 'resolvedBy',
      as: 'resolver'
    });
  };

  return CorrespondentAlert;
};