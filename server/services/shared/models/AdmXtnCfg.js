
import { Model, Sequelize } from 'sequelize';
module.exports = (sequelize, DataTypes) => {
    class AdmXtnCfg extends Model {
        static className = 'AdmXtnCfg';
        static associate(models) {
        }
    }
    AdmXtnCfg.init(
        {
            xtn_cfg_id: {
                type: DataTypes.STRING,
                primaryKey: true,
                allowNull: false,
                validate: {
                    len: [1, 20],
                }
            },
            cfg_val: DataTypes.TEXT,
            site_url: {
                type: DataTypes.STRING,
                allowNull: true,
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
            usr_id: DataTypes.STRING,
            cre_dt: {
                type: 'TIMESTAMP',
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
                allowNull: false
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
            modelName: 'adm_xtn_cfg',
            freezeTableName: true,
            createdAt: 'cre_dt',
            updatedAt: 'upd_dt',
            timestamps: true
        },
    );
    return AdmXtnCfg;
};
