import { Model } from 'sequelize';

module.exports = (sequelize, DataTypes) => {
  class AdmCo extends Model {
    static className = 'AdmCo';

    static associate(models) {
      // define association here
    }
  }
  AdmCo.init(
    {
      co_cd: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
        validate: {
          len: [1, 20],
        },
      },
      co_nm: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [1, 100],
        },
      },
      ceo_nm: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [1, 100],
        },
      },
      addr: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [1, 500],
        },
      },
      co_tp_cd: {
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
      contact_usr_id: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [1, 20],
        },
      },
      cnt_cd: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [1, 2],
        },
      },
      cty_nm: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [1, 100],
        },
      },
      delt_flg: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [1, 1],
        },
      },
      cre_by_co_cd: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [1, 20],
        },
      },
    },
    {
      sequelize,
      modelName: 'adm_co',
      freezeTableName: true,
      createdAt: 'cre_dt',
      updatedAt: 'upd_dt',
      timestamps: true,
    },
  );
  return AdmCo;
};
