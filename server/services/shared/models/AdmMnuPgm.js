import { Model } from 'sequelize';

module.exports = (sequelize, DataTypes) => {
  class AdmMnuPgm extends Model {
    static className = 'AdmMnuPgm';

    static associate(models) {
      // define association here
    }
  }
  AdmMnuPgm.init(
    {
      mnu_pgm_id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
        validate: {
          len: [1, 15],
        },
      },
      prnt_mnu_id: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 20],
        },
      },
      mnu_pgm_nm: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [1, 500],
        },
      },
      mnu_pgm_ord_no: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      mnu_pgm_url_html: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      pjt_id: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [1, 20],
        },
      },
      mnu_icon: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [1, 20],
        },
      },
      delt_sts_flg: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [1, 1],
        },
      },
    },
    {
      sequelize,
      modelName: 'adm_mnu_pgm',
      freezeTableName: true,
      createdAt: 'cre_dt',
      updatedAt: 'upd_dt',
      timestamps: true,
    },
  );
  return AdmMnuPgm;
};
