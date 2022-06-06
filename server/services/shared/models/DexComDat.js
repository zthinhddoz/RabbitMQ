import sequelize, { DataTypes } from 'sequelize';
import { Model, Sequelize } from 'sequelize';

module.exports = (sequelize, DataTypes) => {
    class DexComDat extends Model {
        static className = 'DexComDat';
        static associate(models) {
        }
    }

    DexComDat.init(
        {
            com_dat_id: {
                type: DataTypes.STRING,
                primaryKey: true,
                allowNull: false,
                validate: {
                    len: [1, 20],
                }
            },
            com_dat_nm: {
                type: DataTypes.STRING,
                allowNull: true,
                validate: {
                    len: [1, 50],
                }
            },
            com_dat_val: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            com_dat_cd: {
                type: DataTypes.STRING,
                allowNull: true,
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
        },
        {
            sequelize,
            modelName: 'dex_com_dat',
            freezeTableName: true,
            createdAt: 'cre_dt',
            updatedAt: 'upd_dt',
            timestamps: true
        }
    );
    return DexComDat;
};