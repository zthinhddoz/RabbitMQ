import { Model, Sequelize } from 'sequelize';
module.exports = (sequelize, DataTypes) => {
    class DexApi extends Model {
        static className = 'DexApi';
        static associate(models) {}
    }
    DexApi.init(
        {
            api_id: {
                type: DataTypes.STRING,
                primaryKey: true,
                allowNull: true,
                validate: {
                    len: [1, 20],
                }
            },
            api_nm: {
                type: DataTypes.STRING,
                allowNull: true,
                validate: {
                    len: [1, 250],
                },
                defaultValue: 'unknown',
            },
            co_cd: {
                type: DataTypes.STRING,
                allowNull: true,
                validate: {
                    len: [1, 20],
                },
                defaultValue: 'unknown',
            },
            loc_cd: {
                type: DataTypes.STRING,
                allowNull: true,
                validate: {
                    len: [1, 20],
                },
                defaultValue: 'unknown',
            },
            doc_tp_id: {
                type: DataTypes.STRING,
                allowNull: true,
                validate: {
                    len: [1, 20],
                },
                defaultValue: 'unknown',
            },
            doc_fld_id: {
                type: DataTypes.STRING,
                allowNull: true,
                validate: {
                    len: [1, 20],
                },
                defaultValue: 'unknown',
            },
            api_info_ctnt: DataTypes.TEXT,
            delt_flg: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    len: [1, 1]
                },
                defaultValue: 'N',
            },
            cre_usr_id: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    len: [1, 20],
                },
                defaultValue: 'admin',
            },
            cre_dt: {
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
                defaultValue: '',
            },
            upd_dt: {
                type: 'TIMESTAMP',
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
                allowNull: false,
            },
            fld_cd: {
                type: DataTypes.STRING,
                allowNull: true,
                validate: {
                    len: [1, 20],
                },
            },
            fld_nm: {
                type: DataTypes.STRING,
                allowNull: true,
                validate: {
                    len: [1, 20],
                },
            },
        },
        {
            sequelize,
            modelName: 'dex_api',
            freezeTableName: true,
            createdAt: 'cre_dt',
            updatedAt: 'upd_dt',
            timestamps: true
        }
    );
    return DexApi;
}