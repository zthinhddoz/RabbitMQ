import { Model, Sequelize } from 'sequelize';
module.exports = (sequelize, DataTypes) => {
  class DexN3ptyDat extends Model {
    static className = 'DexN3ptyDat';

    static associate(models) {
      DexN3ptyDat.belongsTo(models.DexLoc, { foreignKey: 'loc_id', as: 'dex_loc' });
    }
  }
  DexN3ptyDat.init(
    {
      dat_id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
        validate: {
          len: [1, 20],
        },
      },
      dat_cd: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [0, 20],
        },
      },
      dat_nm: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 250],
        },
      },
      co_cd: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 20],
        },
      },
      loc_cd: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 20],
        },
      },
      doc_tp_id: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [0, 20],
        },
      },
      loc_id: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [1, 20],
        },
      },
      dat_val: DataTypes.TEXT,
      delt_flg: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 1],
        },
        defaultValue: 'N',
      },
      cre_dt: {
        type: 'TIMESTAMP',
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        allowNull: false,
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
    },
    {
      sequelize,
      modelName: 'dex_n3pty_dat',
      freezeTableName: true,
      createdAt: 'cre_dt',
      updatedAt: 'upd_dt',
      timestamps: true,
    },
  );
  return DexN3ptyDat;
};
