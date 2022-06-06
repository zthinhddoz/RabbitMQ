import { Model } from 'sequelize';

module.exports = (sequelize, DataTypes) => {
  class AdmPjt extends Model {
    static className = 'AdmPjt';

    static associate(models) {
      // define association here
    }
  }
  AdmPjt.init(
    {
      pjt_id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
        validate: {
          len: [1, 20],
        },
      },
      prnt_pjt_id: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 100],
        },
      },
      pjt_nm: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [1, 50],
        },
      },
      mgr_id: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [1, 20],
        },
      },
      pjt_cd: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [1, 20],
        },
      },
      use_flg: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [1, 1],
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
    },
    {
      sequelize,
      modelName: 'adm_pjt',
      freezeTableName: true,
      createdAt: 'cre_dt',
      updatedAt: 'upd_dt',
      timestamps: true,
    },
  );
  return AdmPjt;
};
