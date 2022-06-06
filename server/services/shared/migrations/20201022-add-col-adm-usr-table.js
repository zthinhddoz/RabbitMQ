'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addColumn(
        'adm_usr', // table name
        'full_nm', // new field name
        {
          type: Sequelize.STRING,
          allowNull: true,
        },
      ),
      queryInterface.addColumn(
        'adm_usr',
        'brdy_val',
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
      ),
    ]);
  },
  down: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.removeColumn('adm_usr', 'full_nm'),
      queryInterface.removeColumn('adm_usr', 'brdy_val'),
    ]);
  },
};
