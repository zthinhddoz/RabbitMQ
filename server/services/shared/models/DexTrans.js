import { Model, Sequelize } from 'sequelize';
module.exports = (sequelize, DataTypes) => {
    class DexTrans extends Model {
        static className = 'DexTrans';
    }
    DexTrans.init(
        {
            tj_id: {
                type: DataTypes.STRING,
                primaryKey: true,
                allowNull: false,
                validate: {
                    len: [1, 20],
                }

            },
            tj_ctnt: DataTypes.TEXT,
            tp_id: {
                type: DataTypes.STRING,
                primaryKey: true,
                allowNull: false,
                validate: {
                    len: [1, 20],
                }

            },
            tp_nm: {
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
            modelName: 'dex_tj',
            freezeTableName: true,
            createdAt: 'cre_dt',
            updatedAt: 'upd_dt',
            timestamps: true
        },
    );
    return DexTrans;
};