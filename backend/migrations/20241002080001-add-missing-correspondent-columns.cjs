'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('correspondent_banks');
    
    // Only add columns that don't exist
    if (!tableDescription.maxLimit) {
      await queryInterface.addColumn('correspondent_banks', 'maxLimit', {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      });
    }

    if (!tableDescription.minLimit) {
      await queryInterface.addColumn('correspondent_banks', 'minLimit', {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      });
    }

    if (!tableDescription.swiftCode) {
      await queryInterface.addColumn('correspondent_banks', 'swiftCode', {
        type: Sequelize.STRING(11),
        allowNull: true
      });
    }

    if (!tableDescription.createdBy) {
      await queryInterface.addColumn('correspondent_banks', 'createdBy', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      });
    }

    // Check if old columns exist and migrate data
    if (tableDescription.limitType && tableDescription.limitPercentage) {
      // Migrate limit data from old structure to new
      await queryInterface.sequelize.query(`
        UPDATE correspondent_banks 
        SET 
          maxLimit = CASE WHEN limitType = 'max' THEN limitPercentage ELSE NULL END,
          minLimit = CASE WHEN limitType = 'min' THEN limitPercentage ELSE NULL END
      `);
    }

    // Remove old columns if they exist
    if (tableDescription.limitType) {
      await queryInterface.removeColumn('correspondent_banks', 'limitType');
    }

    if (tableDescription.limitPercentage) {
      await queryInterface.removeColumn('correspondent_banks', 'limitPercentage');
    }

    if (tableDescription.description) {
      await queryInterface.removeColumn('correspondent_banks', 'description');
    }

    // Update the unique index if it doesn't exist
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

    // Migrate data back
    await queryInterface.sequelize.query(`
      UPDATE correspondent_banks 
      SET 
        limitType = CASE 
          WHEN maxLimit IS NOT NULL THEN 'max' 
          WHEN minLimit IS NOT NULL THEN 'min' 
          ELSE 'max' 
        END,
        limitPercentage = COALESCE(maxLimit, minLimit, 100)
    `);

    // Remove new columns
    await queryInterface.removeColumn('correspondent_banks', 'maxLimit');
    await queryInterface.removeColumn('correspondent_banks', 'minLimit');
    await queryInterface.removeColumn('correspondent_banks', 'swiftCode');
    await queryInterface.removeColumn('correspondent_banks', 'createdBy');

    // Restore old index
    try {
      await queryInterface.removeIndex('correspondent_banks', 'correspondent_banks_bank_name_currency_account_number');
    } catch (error) {
      console.log('Index not found');
    }
  }
};