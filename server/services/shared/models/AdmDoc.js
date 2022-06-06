import { Model, Sequelize } from 'sequelize';
module.exports = (sequelize, DataTypes) => {
  class AdmDoc extends Model {
    static className = 'AdmDoc';
    static associate(models) {
      AdmDoc.hasMany(models.AdmDocFld, {foreignKey: 'doc_tp_id', as: 'doc_fields'});
      AdmDoc.hasOne(models.AdmDocFld, {foreignKey: 'doc_fld_id', sourceKey: 'tmplt_ftr_id',  as: 'tmplt_ftr'});
      AdmDoc.hasMany(models.AdmCoDoc, {foreignKey: 'doc_tp_id', as: 'doc_com'});
      AdmDoc.hasMany(models.DexDoc, {foreignKey: 'doc_tp_id', as: 'dex_doc'});
      AdmDoc.hasMany(models.DexLoc, {foreignKey: 'doc_tp_id', as: 'dex_loc'});
      AdmDoc.belongsTo(models.AdmDoc, {foreignKey: 'grp_doc_id',  as: 'doc_parent'});
    }
  }
  AdmDoc.init(
    {
      doc_tp_id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
        unique: true,
      },
      doc_nm: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 50],
          customValidator(value) {
            if (value === null) {
              throw new Error("doc_name can't be null");
            }
          },
        },
      },
      doc_cd: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 20],
          customValidator(value) {
            if (value === null) {
              throw new Error("doc_cd can't be null");
            }
          },
        },
      },
      delt_flg: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'N',
        validate: {
          len: [1, 1],
        },
      },
      tmplt_ftr_id: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [1, 20],
        }
      },
      mtch_tp_cd: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'T',
        validate: {
          len: [1, 1],
        }
      },
      cre_dt: {
        type: 'TIMESTAMP',
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        allowNull: false,
      },
      cre_usr_id: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [0, 20],
        }
      },
      upd_dt: {
        type: 'TIMESTAMP',
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        allowNull: false,
        validate: {
          customValidator(value) {
            if (value === null) {
              throw new Error("update date can't be null");
            }
          },
        },
      },
      upd_usr_id: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [0, 20],
        },
      },
      grp_flg: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 1],
        },
      },
      grp_doc_id: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [0, 20],
        },
      },
      core_sys_nm: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 50],
        },
      },
      dyn_tp_val: DataTypes.TEXT,
    },
    {
      sequelize,
      modelName: 'adm_doc',
      freezeTableName: true,
      createdAt: 'cre_dt',
      updatedAt: 'upd_dt',
      timestamps: true
    },
  );
  return AdmDoc;
};
