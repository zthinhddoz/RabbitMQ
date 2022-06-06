import { Model, Sequelize } from 'sequelize';

module.exports = (sequelize, DataTypes) => {
  class DexUpldMzd extends Model {
    static className = 'DexUpldMzd';

    static associate(models) {
      // define association here
      DexUpldMzd.belongsTo(models.DexLoc, { foreignKey: 'loc_id', as: 'locationId' });
    }
  }
  DexUpldMzd.init(
    {
      upld_mzd_id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
        validate: {
          len: [1, 20],
        },
      },
      eml_tit_val: {
        type: DataTypes.STRING,
        validate: {
          len: [0, 50],
        },
      },
      eml_addr: {
        type: DataTypes.STRING,
        validate: {
          len: [0, 50],
        },
      },
      host_ip: {
        type: DataTypes.STRING,
        validate: {
          len: [0, 20],
        },
      },
      usr_id: {
        type: DataTypes.STRING,
        validate: {
          len: [0, 20],
        },
      },
      usr_pwd: {
        type: DataTypes.STRING,
        validate: {
          len: [0, 20],
        },
      },
      dir_path: {
        type: DataTypes.STRING,
        validate: {
          len: [0, 200],
        },
      },
      delt_flg: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 1],
        },
        defaultValue: 'N',
      },
      loc_id: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 20],
        },
      },
      file_svr_path: {
        type: DataTypes.STRING,
        validate: {
          len: [0, 200],
        },
      },
      file_gg_drive_path: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [0, 200],
        },
      },
      usd_mzd_cd: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 5],
        },
      },
      cre_dt: {
        type: 'TIMESTAMP',
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        allowNull: false,
      },
      file_upld_dt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      cre_usr_id: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 20],
        },
      },
      upd_dt: {
        type: 'TIMESTAMP',
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        allowNull: false,
      },
      upd_usr_id: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 20],
        },
      },
      run_bg_flg: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 1],
        },
        defaultValue: 'N',
      }
    },
    {
      sequelize,
      modelName: 'dex_upld_mzd',
      freezeTableName: true,
      createdAt: 'cre_dt',
      updatedAt: 'upd_dt',
      timestamps: true,
    },
  );
  return DexUpldMzd;
};
