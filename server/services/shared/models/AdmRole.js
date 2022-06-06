import { Model } from 'sequelize';

module.exports = (sequelize, DataTypes) => {
  class AdmRole extends Model {
    static className = 'AdmRole';

    static associate(models) {
      // define association here
    }
  }
  AdmRole.init(
    {
      role_id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
        validate: {
          len: [1, 20],
        },
      },
      role_nm: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [1, 50],
        },
      },
      role_desc: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [1, 1000],
        },
      },
      role_tp_cd: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [1, 20],
        },
      },
      co_cd: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [1, 20],
        },
      },
      cre_usr_id: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 20],
        },
      },
      cre_dt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      upd_usr_id: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 20],
        },
      },
      upd_dt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      prnt_role_id: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [1, 20],
        },
      },
    },
    {
      sequelize,
      modelName: 'adm_role',
      freezeTableName: true,
      createdAt: 'cre_dt',
      updatedAt: 'upd_dt',
      timestamps: true,
    },
  );
  return AdmRole;
};
