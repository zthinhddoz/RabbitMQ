'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.changeColumn(
        'adm_usr',
        'usr_pwd',
        {
          type: Sequelize.STRING,
          allowNull: true,
        },
      ),
      queryInterface.addColumn(
        'adm_usr',
        'usr_n3pty_id',
        {
          type: Sequelize.STRING,
          allowNull: true,
        },
      ),
      queryInterface.addColumn(
        'adm_usr',
        'hm_addr',
        {
          type: Sequelize.STRING,
          allowNull: true,
        },
      ),
      queryInterface.addColumn(
        'adm_usr',
        'sex_flg',
        {
          type: Sequelize.STRING,
          allowNull: true,
        },
      ),
      queryInterface.addColumn(
        'adm_usr',
        'phn_no',
        {
          type: Sequelize.STRING,
          allowNull: true,
        },
      ),
    ]);
  },
  down: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.changeColumn('adm_usr', 'usr_pwd'),
      queryInterface.removeColumn('adm_usr', 'usr_n3pty_id'),
      queryInterface.removeColumn('adm_usr', 'hm_addr'),
      queryInterface.removeColumn('adm_usr', 'sex_flg'),
      queryInterface.removeColumn('adm_usr', 'phn_no'),
    ]);
  },
};
