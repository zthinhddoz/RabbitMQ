import { Model } from 'sequelize';

module.exports = (sequelize, DataTypes) => {
  class AdmMnuPgmBtn extends Model {
    static className = 'AdmMnuPgmBtn';

    static associate(models) {
      // define association here
    }
  }
  AdmMnuPgmBtn.init(
    {
      btn_no: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
        validate: {
          len: [1, 20],
        },
      },
      mnu_pgm_id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
        validate: {
          len: [1, 20],
        },
      },
      cre_usr_id: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 20],
        },
      },
      upd_usr_id: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 20],
        },
      },
    },
    {
      sequelize,
      modelName: 'adm_mnu_pgm_btn',
      freezeTableName: true,
      createdAt: 'cre_dt',
      updatedAt: 'upd_dt',
      timestamps: true,
    },
  );
  return AdmMnuPgmBtn;
};
