import { Model } from 'sequelize';

module.exports = (sequelize, DataTypes) => {
  class AdmUsr extends Model {
    static className = 'AdmUsr';

    static associate(models) {
      // define association here
    }
  }
  AdmUsr.init(
    {
      usr_id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
        validate: {
          len: [1, 20],
        },
      },
      usr_nm: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [1, 50],
        },
      },
      com_usr_sx: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [1, 1],
        },
      },
      usr_eml: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [1, 50],
        },
      },
      img_url: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [1, 200],
        },
      },
      co_cd: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [1, 20],
        },
      },
      loc_cd: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [1, 20],
        },
      },
      is_root: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [1, 1],
        },
      },
      full_nm: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [1, 100],
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
      modelName: 'adm_usr',
      freezeTableName: true,
      createdAt: 'cre_dt',
      updatedAt: 'upd_dt',
      timestamps: true,
    },
  );
  return AdmUsr;
};
