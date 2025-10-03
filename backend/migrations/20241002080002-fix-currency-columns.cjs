'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('correspondent_banks');
    
    // Check if old currency_id column exists and rename it
    if (tableDescription.currency_id && !tableDescription.currencyId) {
      await queryInterface.renameColumn('correspondent_banks', 'currency_id', 'currencyId');
    }

    // Ensure other columns exist
    const columnsToAdd = [
      { name: 'maxLimit', type: Sequelize.DECIMAL(5, 2), allowNull: true },
      { name: 'minLimit', type: Sequelize.DECIMAL(5, 2), allowNull: true },
      { name: 'swiftCode', type: Sequelize.STRING(11), allowNull: true },
      { name: 'createdBy', type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 }
    ];

    for (const column of columnsToAdd) {
      if (!tableDescription[column.name]) {
        await queryInterface.addColumn('correspondent_banks', column.name, column);
      }
    }

    // Remove old columns if they exist
    const columnsToRemove = ['limitType', 'limitPercentage', 'description'];
    for (const columnName of columnsToRemove) {
      if (tableDescription[columnName]) {
        await queryInterface.removeColumn('correspondent_banks', columnName);
      }
    }

    // Update unique index
    try {
      await queryInterface.removeIndex('correspondent_banks', 'correspondent_banks_bank_name_currency_account_number');
    } catch (error) {
      console.log('Index not found or already removed');
    }

    try {
      await queryInterface.addIndex('correspondent_banks', {
        fields: ['bankName', 'currencyId', 'accountNumber'],
        unique: true,
        name: 'correspondent_banks_bank_name_currency_account_number'
      });
    } catch (error) {
      console.log('Index already exists or cannot be created');
    }
  },

  async down(queryInterface, Sequelize) {
    // Revert changes if needed
    await queryInterface.renameColumn('correspondent_banks', 'currencyId', 'currency_id');
    
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

    // Remove new columns
    await queryInterface.removeColumn('correspondent_banks', 'maxLimit');
    await queryInterface.removeColumn('correspondent_banks', 'minLimit');
    await queryInterface.removeColumn('correspondent_banks', 'swiftCode');
    await queryInterface.removeColumn('correspondent_banks', 'createdBy');
  }
};