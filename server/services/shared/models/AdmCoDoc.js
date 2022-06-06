import { Model } from 'sequelize';

module.exports = (sequelize, DataTypes) => {
  class AdmCoDoc extends Model {
    static className = 'AdmCoDoc';

    static associate(models) {
      // define association here
      AdmCoDoc.belongsTo(models.AdmDoc, { foreignKey: 'doc_tp_id', as: 'adm_documents' });
      AdmCoDoc.belongsTo(models.DexLoc, { foreignKey: 'loc_id', as: 'locations' });
    }
  }
  AdmCoDoc.init(
    {
      co_cd: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 20],
        },
      },
      doc_tp_id: {
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
      cre_usr_id: {
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
      loc_id: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 20],
        },
      },
      adm_co_doc_id: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
        validate: {
          len: [1, 20],
        },
      },
    },
    {
      sequelize,
      modelName: 'adm_co_doc',
      freezeTableName: true,
      createdAt: 'cre_dt',
      updatedAt: 'upd_dt',
      timestamps: true,
    },
  );
  return AdmCoDoc;
};
