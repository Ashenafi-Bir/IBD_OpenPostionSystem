export default (sequelize, DataTypes) => {
  const SystemLog = sequelize.define('SystemLog', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    module: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    ipAddress: {
      type: DataTypes.STRING(45)
    },
    userAgent: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'system_logs',
    timestamps: true
  });

  SystemLog.associate = function(models) {
    SystemLog.belongsTo(models.User, { foreignKey: 'user_id' });
  };

  return SystemLog;
};