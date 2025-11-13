'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'authType', {
      type: Sequelize.ENUM('ldap', 'local'),
      allowNull: false,
      defaultValue: 'local',
    });

    await queryInterface.addColumn('users', 'ldapUsername', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });

    await queryInterface.changeColumn('users', 'password', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'authType');
    await queryInterface.removeColumn('users', 'ldapUsername');
    await queryInterface.changeColumn('users', 'password', {
      type: Sequelize.STRING(255),
      allowNull: false,
    });
  }
};
