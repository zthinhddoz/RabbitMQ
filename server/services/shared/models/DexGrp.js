import { Model, Sequelize } from 'sequelize';
module.exports = (sequelize, DataTypes) => {
    class DexGrp extends Model {
        static className = 'DexGrp';
        static associate(models) {
            DexGrp.hasMany(models.DexTmplt, { foreignKey: 'grp_id', as: 'dex_tmplt' });
        }
    }
    DexGrp.init(
        {
            grp_id: {
                type: DataTypes.STRING,
                primaryKey: true,
                allowNull: false,
                validate: {
                    len: [1, 20],
                }
            },
            grp_nm: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    len: [1, 250],
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
            modelName: 'dex_grp',
            freezeTableName: true,
            createdAt: 'cre_dt',
            updatedAt: 'upd_dt',
            timestamps: true
        },
    );
    return DexGrp;
};
