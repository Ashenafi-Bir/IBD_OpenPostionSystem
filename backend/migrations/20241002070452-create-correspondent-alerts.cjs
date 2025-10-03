'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('correspondent_alerts', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      alertType: {
        type: Sequelize.ENUM('MAX_LIMIT_EXCEEDED', 'MIN_LIMIT_VIOLATED'),
        allowNull: false
      },
      currentPercentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false
      },
      limitPercentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false
      },
      variation: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false
      },
      alertDate: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      isResolved: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      resolvedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      resolvedBy: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      bankId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'correspondent_banks',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('correspondent_alerts', ['bankId']);
    await queryInterface.addIndex('correspondent_alerts', ['alertDate']);
    await queryInterface.addIndex('correspondent_alerts', ['isResolved']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('correspondent_alerts');
  }
};