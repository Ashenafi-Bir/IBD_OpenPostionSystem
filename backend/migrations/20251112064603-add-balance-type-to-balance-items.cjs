'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add the new column
    await queryInterface.addColumn('balance_items', 'balance_type', {
      type: Sequelize.ENUM('on_balance_sheet', 'off_balance_sheet'),
      allowNull: false,
      defaultValue: 'on_balance_sheet'
    });

    // Update existing records - you can adjust this logic based on your needs
    await queryInterface.sequelize.query(`
      UPDATE balance_items 
      SET balance_type = 'on_balance_sheet' 
      WHERE balance_type IS NULL
    `);
  },

  async down(queryInterface, Sequelize) {
    // Remove the column
    await queryInterface.removeColumn('balance_items', 'balance_type');
    
    // Drop the ENUM type
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS enum_balance_items_balance_type;
    `);
  }
};