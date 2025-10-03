'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Check if old columns still exist before selecting
      const tableDesc = await queryInterface.describeTable('correspondent_banks');

      if (tableDesc.limitType && tableDesc.limitPercentage) {
        const [banks] = await queryInterface.sequelize.query(
          `SELECT id, limitType, limitPercentage FROM correspondent_banks`
        );

        for (const bank of banks) {
          if (bank.limitType === 'max') {
            await queryInterface.sequelize.query(
              `UPDATE correspondent_banks SET maxLimit = ?, minLimit = NULL WHERE id = ?`,
              { replacements: [bank.limitPercentage, bank.id] }
            );
          } else if (bank.limitType === 'min') {
            await queryInterface.sequelize.query(
              `UPDATE correspondent_banks SET minLimit = ?, maxLimit = NULL WHERE id = ?`,
              { replacements: [bank.limitPercentage, bank.id] }
            );
          }
        }
      }

      // Default currency update (adjust as needed)
      await queryInterface.sequelize.query(
        `UPDATE correspondent_banks SET currency = 'USD' WHERE currency IS NULL OR currency = ''`
      );
    } catch (err) {
      console.log('Skipping data migration because old columns not found:', err.message);
    }
  },

  async down(queryInterface, Sequelize) {
    // No rollback needed for data migration
    console.log('Data migration down - no action taken');
  }
};
