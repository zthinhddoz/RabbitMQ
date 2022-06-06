
import { Model, Sequelize } from 'sequelize';
module.exports = (sequelize, DataTypes) => {
    class DexDoc extends Model {
        static className = 'DexDoc';
        static associate(models) {
            DexDoc.belongsTo(models.DexTmplt, { foreignKey: 'dex_tmplt_id', as: 'dex_tmplt' });
            DexDoc.belongsTo(models.AdmDoc, { foreignKey: 'doc_tp_id', as: 'adm_doc_tp' });
            DexDoc.belongsTo(models.DexDoc, {foreignKey: 'prnt_doc_id', as: 'dex_prnt'});
            DexDoc.belongsTo(models.DexLoc, {foreignKey: 'loc_id', as: 'dex_loc'});
        }
    }
    DexDoc.init(
        {
            doc_id: {
                type: DataTypes.STRING,
                primaryKey: true,
                allowNull: false,
                validate: {
                    len: [1, 20],
                }
            },
            loc_id: {
                type: DataTypes.STRING,
                allowNull: true,
                validate: {
                    len: [1, 20],
                }
            },
            dex_tmplt_id: {
                type: DataTypes.STRING,
                allowNull: true,
                validate: {
                    len: [1, 20],
                }
            },
            doc_nm: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    len: [1, 250],
                }
            },
            root_nm: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    len: [1, 250],
                }
            },
            fld_val: {
                type: DataTypes.STRING,
                allowNull: true,
                validate: {
                    len: [0, 1000],
                }
            },
            file_sz: {
                type: DataTypes.STRING,
                allowNull: true,
                validate: {
                    len: [0, 20],
                }
            },
            root_nm: {
                type: DataTypes.STRING,
                allowNull: true,
                validate: {
                    len: [1, 300],
                }
            },
            extr_ctnt: DataTypes.TEXT,
            aft_biz_ctnt: DataTypes.TEXT,
            org_ctnt: DataTypes.TEXT,
            extr_hili_ctnt: DataTypes.TEXT,
            shw_flg: {
                type: DataTypes.STRING,
                allowNull: true,
                validate: {
                    len: [0, 1],
                }
            },
            co_cd: {
                type: DataTypes.STRING,
                allowNull: true,
                validate: {
                    len: [0, 20],
                }
            },
            loc_cd: {
                type: DataTypes.STRING,
                allowNull: true,
                validate: {
                    len: [0, 20],
                }
            },
            doc_tp_id: {
                type: DataTypes.STRING,
                allowNull: true,
                validate: {
                    len: [0, 20],
                }
            },
            prnt_doc_id: {
                type: DataTypes.STRING,
                allowNull: true,
                validate: {
                    len: [0, 20],
                }
            },
            sts_cd: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    len: [0, 1],
                }
            },
            prnt_file_nm: {
                type: DataTypes.STRING,
                validate: {
                    len: [1, 250],
                }
            },
            pg_val: {
                type: DataTypes.INTEGER,
                allowNull: true,
              },

            st_tms: DataTypes.DATE,
            end_tms: DataTypes.DATE,
            doc_iss_cd: {
                type: DataTypes.STRING,
                allowNull: true,
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
            modelName: 'dex_doc',
            freezeTableName: true,
            createdAt: 'cre_dt',
            updatedAt: 'upd_dt',
            timestamps: true
        },
    );
    return DexDoc;
};
