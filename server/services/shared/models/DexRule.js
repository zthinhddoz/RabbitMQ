import { Model, Sequelize } from 'sequelize';
module.exports = (sequelize, DataTypes) => {
    class DexRule extends Model {
        static className = 'DexRule';
        static associate(models) {
            DexRule.hasMany(models.DexTmpltRule, { foreignKey: 'rule_id', as: 'rule_info' });
        }
    }
    DexRule.init(
        {
            rule_id: {
                type: DataTypes.STRING,
                primaryKey: true,
                allowNull: false,
                validate: {
                    len: [1, 20],
                }
            },
            rule_nm: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    len: [1, 250],
                }
            },
            rule_tp_val: {
                type: DataTypes.STRING,
                allowNull: true,
                validate: {
                    len: [0, 20],
                }
            },
            rule_desc: {
                type: DataTypes.TEXT,
            },
            img_url: {
                type: DataTypes.STRING,
                allowNull: true,
                validate: {
                    len: [0, 200],
                }
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
                }
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
                }
            },
            delt_flg: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    len: [1, 1],
                },
                defaultValue: 'N',
            },
            doc_tp_ctnt: DataTypes.TEXT,
        },
        {
            sequelize,
            modelName: 'dex_rule',
            freezeTableName: true,
            createdAt: 'cre_dt',
            updatedAt: 'upd_dt',
            timestamps: true
        },
    );
    return DexRule;
};