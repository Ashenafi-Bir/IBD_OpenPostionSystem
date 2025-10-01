export default (sequelize, DataTypes) => {
  const FCYTransaction = sequelize.define('FCYTransaction', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    transactionDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    currency_id: { // TEMPORARILY allow null
      type: DataTypes.INTEGER,
      allowNull: true, // Changed from false to true
      references: {
        model: 'currencies',
        key: 'id'
      }
    },
    transactionType: {
      type: DataTypes.ENUM('purchase', 'sale'),
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(20, 5),
      allowNull: false
    },
    rate: {
      type: DataTypes.DECIMAL(15, 6)
    },
    reference: {
      type: DataTypes.STRING(100)
    },
    description: {
      type: DataTypes.TEXT
    },
    status: {
      type: DataTypes.ENUM('draft', 'submitted', 'authorized', 'rejected'),
      defaultValue: 'draft'
    },
    created_by: { // TEMPORARILY allow null
      type: DataTypes.INTEGER,
      allowNull: true // Changed from false to true
    },
    authorized_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'fcy_transactions',
    timestamps: true,
    underscored: false // Remove this line since your DB uses camelCase
  });

  FCYTransaction.associate = function(models) {
    FCYTransaction.belongsTo(models.Currency, { foreignKey: 'currency_id' });
    FCYTransaction.belongsTo(models.User, { as: 'Creator', foreignKey: 'created_by' });
    FCYTransaction.belongsTo(models.User, { as: 'Authorizer', foreignKey: 'authorized_by' });
  };

  return FCYTransaction;
};