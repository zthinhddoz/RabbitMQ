import { Model } from 'sequelize';

module.exports = (sequelize, DataTypes) => {
  class AdmRolePgmAuth extends Model {
    static className = 'AdmRolePgmAuth';

    static associate(models) {
      // define association here
    }
  }
  AdmRolePgmAuth.init(
    {
      role_id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
        validate: {
          len: [1, 20],
        },
      },
      mnu_pgm_id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
        validate: {
          len: [1, 20],
        },
      },
      cre_usr_id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
        validate: {
          len: [1, 20],
        },
      },
      upd_usr_id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
        validate: {
          len: [1, 20],
        },
      },
    },
    {
      sequelize,
      modelName: 'adm_role_pgm_auth',
      freezeTableName: true,
      createdAt: 'cre_dt',
      updatedAt: 'upd_dt',
      timestamps: true,
    },
  );
  return AdmRolePgmAuth;
};
