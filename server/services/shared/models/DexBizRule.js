import { Model, Sequelize } from 'sequelize';

module.exports = (sequelize, DataTypes) => {
  class DexBizRule extends Model {
    static className = 'DexBizRule';
    static associate(models) {}
  }

  DexBizRule.init(
    {
      biz_rule_id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
        validate: {
          len: [1, 20],
        },
      },
      adm_co_doc_fld_id: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 20],
        },
      },
      biz_rule_desc: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [1, 1000],
        },
      },
      cond_tp_cd: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 20],
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
      cond_ctnt: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      act_ctnt: {
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
      modelName: 'dex_biz_rule',
      freezeTableName: true,
      createdAt: 'cre_dt',
      updatedAt: 'upd_dt',
      timestamps: true,
    },
  );
  return DexBizRule;
};
