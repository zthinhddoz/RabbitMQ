import { Model, Sequelize } from 'sequelize';

module.exports = (sequelize, DataTypes) => {
  class AdmDocFld extends Model {
    static className = 'AdmDocFld';

    static associate(models) {
      // define association here
      AdmDocFld.belongsTo(models.AdmDoc, { foreignKey: 'doc_tp_id', as: 'doc' });
      AdmDocFld.hasMany(models.AdmCoDocFld, { foreignKey: 'doc_fld_id', as: 'com_doc_field' });
      AdmDocFld.hasMany(models.DexExtrRule, { foreignKey: 'doc_fld_id', as: 'dex_extr_rule' });

      // Self association
      AdmDocFld.hasMany(models.AdmDocFld, { foreignKey: 'fld_grp_id', as: 'child_fields' });
    }
  }

  AdmDocFld.init(
    {
      doc_fld_id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
        unique: true,
      },
      doc_tp_id: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 20],
          customValidator(value) {
            if (value === null) {
              throw new Error("doc_tp_id can't be null");
            }
          },
        },
      },
      fld_grp_id: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [0, 20],
        },
      },
      fld_grp_flg: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'N',
        validate: {
          len: [1, 1],
        },
      },
      fld_nm: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 50],
          customValidator(value) {
            if (value === null) {
              throw new Error("fld_nm can't be null");
            }
          },
        },
      },
      fld_cd: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [0, 100],
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
      tmplt_flg: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [1, 1],
        },
      },
      com_dat_id: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [0, 20],
        },
      },
      ord_no: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 0,
          max: 999,
        },
      },
      cre_dt: {
        type: 'TIMESTAMP',
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        allowNull: false,
        validate: {
          customValidator(value) {
            if (value === null) {
              throw new Error("create date can't be null");
            }
          },
        },
      },
      cre_usr_id: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [0, 20],
        },
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
      dp_tp_cd: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [1, 1],
        },
      },
      attr_ctnt: DataTypes.TEXT,
      extr_tp_cd: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [0, 50],
        },
      },
    },
    {
      sequelize,
      modelName: 'adm_doc_fld',
      freezeTableName: true,
      createdAt: 'cre_dt',
      updatedAt: 'upd_dt',
      timestamps: true,
    },
  );
  return AdmDocFld;
};
