import { Model } from 'sequelize';
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static className = 'User';
    static associate(models) {
      // define association here
    }
  }
  User.init(
    {
      // https://stackoverflow.com/questions/29233896/sequelize-table-without-column-id
      usr_id: {
        type: DataTypes.STRING,
        primaryKey: true
      },
      co_cd: DataTypes.STRING,
      act_flg: DataTypes.STRING,
      usr_nm: DataTypes.STRING,
      usr_pwd: DataTypes.STRING,
      usr_eml: DataTypes.STRING,
      img_url: DataTypes.STRING,
      cre_usr_id: DataTypes.STRING,
      full_nm: DataTypes.STRING,
      brdy_val: DataTypes.DATE,
      usr_n3pty_id: DataTypes.STRING,
      hm_addr: DataTypes.STRING,
      sex_flg: DataTypes.STRING,
      phn_no: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: 'adm_usr',
      freezeTableName: true,
      createdAt: 'cre_dt',
      updatedAt: 'upd_dt',
      // https://stackoverflow.com/questions/29828676/change-default-column-name-sequelize
    },
  );
  return User;
};
