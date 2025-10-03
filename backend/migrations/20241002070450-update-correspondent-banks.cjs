'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // First, remove the old unique constraint if it exists
    try {
      await queryInterface.removeConstraint('correspondent_banks', 'correspondent_banks_bank_name_currency_account_number');
    } catch (error) {
      console.log('Constraint not found or already removed');
    }

    try {
      await queryInterface.removeIndex('correspondent_banks', 'correspondent_banks_bank_name_currency_account_number');
    } catch (error) {
      console.log('Index not found or already removed');
    }

    // Add new columns
    await queryInterface.addColumn('correspondent_banks', 'currency', {
      type: Sequelize.STRING(3),
      allowNull: false,
      defaultValue: 'USD' // Temporary default, we'll update this later
    });

    await queryInterface.addColumn('correspondent_banks', 'maxLimit', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true
    });

    await queryInterface.addColumn('correspondent_banks', 'minLimit', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true
    });

    await queryInterface.addColumn('correspondent_banks', 'swiftCode', {
      type: Sequelize.STRING(11),
      allowNull: true
    });

    await queryInterface.addColumn('correspondent_banks', 'createdBy', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1 // Set a default user ID, update as needed
    });

    // Remove old columns
    await queryInterface.removeColumn('correspondent_banks', 'limitType');
    await queryInterface.removeColumn('correspondent_banks', 'limitPercentage');
    await queryInterface.removeColumn('correspondent_banks', 'description');
    await queryInterface.removeColumn('correspondent_banks', 'currency_id');

    // Now add the new unique index
    await queryInterface.addIndex('correspondent_banks', {
      fields: ['bankName', 'currency', 'accountNumber'],
      unique: true,
      name: 'correspondent_banks_bank_name_currency_account_number'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove the new unique index
    await queryInterface.removeIndex('correspondent_banks', 'correspondent_banks_bank_name_currency_account_number');

    // Add back old columns
    await queryInterface.addColumn('correspondent_banks', 'limitType', {
      type: Sequelize.ENUM('min', 'max'),
      allowNull: false,
      defaultValue: 'max'
    });

    await queryInterface.addColumn('correspondent_banks', 'limitPercentage', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 100
    });

    await queryInterface.addColumn('correspondent_banks', 'description', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn('correspondent_banks', 'currency_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'currencies',
        key: 'id'
      }
    });

    // Remove new columns
    await queryInterface.removeColumn('correspondent_banks', 'currency');
    await queryInterface.removeColumn('correspondent_banks', 'maxLimit');
    await queryInterface.removeColumn('correspondent_banks', 'minLimit');
    await queryInterface.removeColumn('correspondent_banks', 'swiftCode');
    await queryInterface.removeColumn('correspondent_banks', 'createdBy');
  }
};