export default (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('maker', 'authorizer', 'admin'),
      allowNull: false,
      defaultValue: 'maker'
    },
    fullName: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    lastLogin: {
      type: DataTypes.DATE
    }
  }, {
    tableName: 'users',
    timestamps: true,
    underscored: true
  });

  User.associate = function(models) {
    User.hasMany(models.SystemLog, { foreignKey: 'user_id' });
    User.hasMany(models.FCYTransaction, { foreignKey: 'created_by' });
    User.hasMany(models.DailyBalance, { foreignKey: 'authorized_by' });
  };

  return User;
};