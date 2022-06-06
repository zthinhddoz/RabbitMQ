import { Model, Sequelize } from 'sequelize';

module.exports = (sequelize, DataTypes) => {
  class DexDyn extends Model {
    static className = 'DexDyn';
    static associate(models) {}
  }

  DexDyn.init(
    {
      dyn_id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
        validate: {
          len: [1, 20],
        },
      },
      dyn_nm: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 100],
        },
      },
      reg_expr_val: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      doc_tp_val: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      src_val: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
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
      modelName: 'dex_dyn',
      freezeTableName: true,
      createdAt: 'cre_dt',
      updatedAt: 'upd_dt',
      timestamps: true,
    },
  );
  return DexDyn;
};
