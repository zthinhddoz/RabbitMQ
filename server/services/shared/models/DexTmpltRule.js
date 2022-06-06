
import { Model, Sequelize } from 'sequelize';
module.exports = (sequelize, DataTypes) => {
    class DexTmpltRule extends Model {
        static className = 'DexTmpltRule';
        static associate(models) {
            DexTmpltRule.belongsTo(models.DexRule, {foreignKey: 'rule_id', as: 'ruleInfo'});
        }
    }
    DexTmpltRule.init(
        {
            tmplt_id: {
                type: DataTypes.STRING,
                primaryKey: true,
                allowNull: false,
                validate: {
                    len: [1, 20],
                }
            },
            rule_id: {
                type: DataTypes.STRING,
                primaryKey: true,
                allowNull: false,
                validate: {
                    len: [1, 20],
                }
            },
            cre_dt: {
                type: 'TIMESTAMP',
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
                allowNull: false,
            },
            cre_usr_id: DataTypes.STRING,
            upd_dt: {
                type: 'TIMESTAMP',
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
                allowNull: false,
            },
            upd_usr_id: DataTypes.STRING,
        },
        {
            sequelize,
            modelName: 'dex_tmplt_rule',
            freezeTableName: true,
            createdAt: 'cre_dt',
            updatedAt: 'upd_dt',
            timestamps: true
        },
    );
    return DexTmpltRule;
};
