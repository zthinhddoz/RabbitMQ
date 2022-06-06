import { Model } from 'sequelize';

module.exports = (sequelize, DataTypes) => {
  class AdmRolePgmBtnAuth extends Model {
    static className = 'AdmRolePgmBtnAuth';

    static associate(models) {
      // define association here
    }
  }
  AdmRolePgmBtnAuth.init(
    {
      role_id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
        validate: {
          len: [1, 20],
        },
      },
      btn_no: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
        validate: {
          len: [1, 3],
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
      modelName: 'adm_role_pgm_btn_auth',
      freezeTableName: true,
      createdAt: 'cre_dt',
      updatedAt: 'upd_dt',
      timestamps: true,
    },
  );
  return AdmRolePgmBtnAuth;
};
