import { Model } from 'sequelize';

module.exports = (sequelize, DataTypes) => {
  class AdmUsrRole extends Model {
    static className = 'AdmUsrRole';

    static associate(models) {
      // define association here
      AdmUsrRole.belongsTo(models.AdmRole, { foreignKey: 'role_id', as: 'usrRole' });
    }
  }
  AdmUsrRole.init(
    {
      usr_id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
        validate: {
          len: [1, 20],
        },
      },
      role_id: {
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
      cre_dt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      upd_usr_id: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 20],
        },
      },
      upd_dt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'adm_usr_role',
      freezeTableName: true,
      createdAt: 'cre_dt',
      updatedAt: 'upd_dt',
      timestamps: true,
    },
  );
  return AdmUsrRole;
};
