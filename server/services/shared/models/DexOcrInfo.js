
import { Model, Sequelize } from 'sequelize';
module.exports = (sequelize, DataTypes) => {
    class DexOcrInfo extends Model {
        static className = 'DexOcrInfo';
        static associate(models) {
            // None
        }
    }
    DexOcrInfo.init(
        {
            ocr_id: {
                type: DataTypes.BIGINT,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            ip_addr: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            ocr_eng_val: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            file_url: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            ocr_sts_val: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            ocr_dur_val: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            ocr_env_val: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            doc_id: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            tmplt_id: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            cre_dt: {
                type: 'TIMESTAMP',
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
                allowNull: false,
            },
        },
        {
            sequelize,
            modelName: 'dex_ocr_info',
            freezeTableName: true,
            createdAt: 'cre_dt',
            updatedAt: false,
            timestamps: true
        },
    );
    return DexOcrInfo;
};
