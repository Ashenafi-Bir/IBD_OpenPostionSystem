'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // First update the foreign key constraint if it exists with old name
    try {
      await queryInterface.removeConstraint('correspondent_balances', 'correspondent_balances_bank_id_fkey');
    } catch (error) {
      console.log('Old foreign key constraint not found');
    }

    try {
      await queryInterface.removeConstraint('correspondent_balances', 'correspondent_balances_ibfk_1');
    } catch (error) {
      console.log('Old foreign key constraint not found');
    }

    // Change bank_id to bankId
    await queryInterface.renameColumn('correspondent_balances', 'bank_id', 'bankId');

    // Update balanceAmount precision
    await queryInterface.changeColumn('correspondent_balances', 'balanceAmount', {
      type: Sequelize.DECIMAL(20, 2),
      allowNull: false
    });

    // Add createdBy column
    await queryInterface.addColumn('correspondent_balances', 'createdBy', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1
    });

    // Update the unique index
    try {
      await queryInterface.removeIndex('correspondent_balances', 'correspondent_balances_bank_id_balance_date');
    } catch (error) {
      console.log('Old index not found');
    }

    await queryInterface.addIndex('correspondent_balances', {
      fields: ['bankId', 'balanceDate'],
      unique: true,
      name: 'correspondent_balances_bank_id_balance_date'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove the new index
    await queryInterface.removeIndex('correspondent_balances', 'correspondent_balances_bank_id_balance_date');

    // Revert to old column names and structure
    await queryInterface.renameColumn('correspondent_balances', 'bankId', 'bank_id');

    await queryInterface.changeColumn('correspondent_balances', 'balanceAmount', {
      type: Sequelize.DECIMAL(20, 5),
      allowNull: false
    });

    await queryInterface.removeColumn('correspondent_balances', 'createdBy');

    // Add back old index
    await queryInterface.addIndex('correspondent_balances', {
      fields: ['bank_id', 'balanceDate'],
      unique: true,
      name: 'correspondent_balances_bank_id_balance_date'
    });
  }
};