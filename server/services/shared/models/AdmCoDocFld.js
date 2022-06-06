/* eslint-disable no-unused-vars */
import { Model, Sequelize } from 'sequelize';

module.exports = (sequelize, DataTypes) => {
  class AdmCoDocFld extends Model {
    static className = 'AdmCoDocFld';

    static associate(models) {
      // define association here
      AdmCoDocFld.belongsTo(models.AdmCoDoc, { foreignKey: 'adm_co_doc_id', as: 'AdmCoDoc' });
      AdmCoDocFld.belongsTo(models.AdmDocFld, { foreignKey: 'doc_fld_id', as: 'AdmDocFld' });
      AdmCoDocFld.hasMany(models.DexBizRule, {
        foreignKey: 'adm_co_doc_fld_id',
        as: 'DexBizRule',
      });
      AdmCoDocFld.belongsTo(models.DexLoc, { foreignKey: 'loc_id', as: 'DexLoc' });
    }
  }
  AdmCoDocFld.init(
    {
      doc_fld_id: {
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
      delt_flg: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 1],
        },
        defaultValue: 'N',
      },
      ord_no: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 0,
          max: 999,
        },
      },
      adm_co_doc_fld_id: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
        validate: {
          len: [1, 20],
        },
      },
      loc_id: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 20],
        },
      },
      fld_cd: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [0, 100],
        },
      },
    },
    {
      sequelize,
      modelName: 'adm_co_doc_fld',
      freezeTableName: true,
      createdAt: 'cre_dt',
      updatedAt: 'upd_dt',
      timestamps: true,
    },
  );
  return AdmCoDocFld;
};
