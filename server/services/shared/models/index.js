import fs from 'fs';
import path from 'path';
import Sequelize from 'sequelize';
import { POSTGRES_URL } from '~/env';
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];
const basename = path.basename(__filename);
const db = {};
let sequelize;
// Fix wrong date time when using Sequalize with Postgres
/* setTypeParser(typeID, value), function receive typeID and value
 then convert value to type of typeID (1114 is typeID of timestamp)*/
require('pg').types.setTypeParser(1114, function (stringValue) {
  return new Date(stringValue.substring(0, 10) + 'T' + stringValue.substring(11) + 'Z');
});
if (config.use_env_variable) {
  sequelize = new Sequelize(POSTGRES_URL, config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

fs.readdirSync(__dirname)
  .filter(file => {
    return file.indexOf('.') !== 0 && file !== basename && file.slice(-3) === '.js';
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.className] = model;
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});
db.sequelize = sequelize;
db.Sequelize = Sequelize;
export default db;
