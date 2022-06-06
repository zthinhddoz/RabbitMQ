import { Model, Sequelize } from 'sequelize';

module.exports = (sequelize, DataTypes) => {
  class DexLoc extends Model {
    static className = 'DexLoc';

    static associate(models) {
      // define association here
      DexLoc.belongsTo(models.AdmDoc, { foreignKey: 'doc_tp_id', as: 'documents' });
    }
  }
  DexLoc.init(
    {
      loc_id: {
        type: DataTypes.STRING,
        primaryKey: true,
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
      co_cd: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 20],
        },
      },
      loc_tp_cd: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 20],
        },
      },
      loc_nm: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [0, 50],
        },
      },
      fol_loc_url: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 200],
        },
      },
      prnt_loc_id: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [1, 20],
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
      doc_tp_id: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 20],
        },
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
      prnt_loc_id: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [0, 20],
        },
      },
    },
    {
      sequelize,
      modelName: 'dex_loc',
      freezeTableName: true,
      createdAt: 'cre_dt',
      updatedAt: 'upd_dt',
      timestamps: true,
    },
  );
  return DexLoc;
};
