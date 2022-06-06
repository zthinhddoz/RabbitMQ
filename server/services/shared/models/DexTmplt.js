
import { Model, Sequelize } from 'sequelize';
module.exports = (sequelize, DataTypes) => {
    class DexTmplt extends Model {
        static className = 'DexTmplt';
        static associate(models) {
            DexTmplt.hasMany(models.DexTmpltRule, { foreignKey: 'tmplt_id', as: 'dex_tmplt_rule' });
            DexTmplt.belongsTo(models.DexGrp, { foreignKey: 'grp_id', as: 'dex_grp' });
            DexTmplt.hasMany(models.DexDoc, { foreignKey: 'dex_tmplt_id', as: 'dex_tmplt_doc' });
        }
    }
    DexTmplt.init(
        {
            tmplt_id: {
                type: DataTypes.STRING,
                primaryKey: true,
                allowNull: false,
                validate: {
                    len: [1, 20],
                }
            },
            grp_id: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    len: [1, 20],
                }
            },
            tmplt_nm: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    len: [1, 250],
                }
            },
            img_nm: {
                type: DataTypes.STRING,
                allowNull: true,
                validate: {
                    len: [1, 250],
                }
            },
            tp_val: {
                type: DataTypes.STRING,
                allowNull: true,
                validate: {
                    len: [0, 100],
                }
            },
            sts_flg: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: '2',
                validate: {
                    len: [1, 1],
                }
            },
            cordi_calc_ctnt: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            cordi_val_ctnt: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            cordi_key_ctnt: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            shr_flg: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: 'Y',
                validate: {
                    len: [1, 1],
                }
            },
            root_url: {
                type: DataTypes.STRING,
                allowNull: true,
                validate: {
                    len: [1, 1000],
                }
            },
            img_url: {
                type: DataTypes.STRING,
                allowNull: true,
                validate: {
                    len: [1, 1000],
                }
            },
            co_cd: {
                type: DataTypes.STRING,
                allowNull: true,
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
            proc_dt: DataTypes.DATE,
            proc_usr_id: DataTypes.STRING,
            doc_tp_id: DataTypes.STRING,
            tmplt_ver_val: DataTypes.STRING,
            rule_id_val: DataTypes.TEXT,
            delt_flg: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                  len: [1, 1],
                },
                defaultValue: 'N',
            },
        },
        {
            sequelize,
            modelName: 'dex_tmplt',
            freezeTableName: true,
            createdAt: 'cre_dt',
            updatedAt: 'upd_dt',
            timestamps: true
        },
    );
    return DexTmplt;
};
