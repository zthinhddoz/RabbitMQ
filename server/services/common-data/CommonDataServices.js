/* eslint-disable quotes */
import model from '~/shared/models';
import generateWhereClauses from '~/utils/generateWhereClauses';
import { BadRequestError } from '../utils/errors';
import logger from '~/shared/logger';
export default class CommonDataServices {
  constructor() {
    this.status = 400;
    this.dataRes = null;
  }

  static async getCommonData(whereClausesObj, attrArr, errCd, other) {
    const whereClause = generateWhereClauses(whereClausesObj);
    await model.DexComDat.findAll({
      where: whereClause,
      attributes: attrArr || '',
      order: [['cre_dt', 'DESC']],
      ...other,
    })
      .then(result => {
        this.dataRes = result;
      })
      .catch(_err => {
        throw new BadRequestError({ errorCode: errCd });
      });
    return this.dataRes;
  }

  static async getCommonDataForBiz() {
    try {
      const result = await model.sequelize.query(
        `
          SELECT
            a.com_dat_id,
            a.com_dat_nm,
            a.com_dat_cd,
            a.com_dat_val::json -> 'header' as header,
            a.com_dat_val::json -> 'role' as role
          FROM dex_com_dat a
          WHERE delt_flg = 'N'
        `,
      );
      if (result) {
        this.dataRes = result[0].map(item => ({
          com_dat_id: item.com_dat_id,
          com_dat_nm: item.com_dat_nm,
          com_dat_cd: item.com_dat_cd,
          com_dat_val: {
            header: item.header,
            role: item.role,
          },
        }));
      }
      return this.dataRes;
    } catch (error) {
      logger.error(error);
      throw new BadRequestError('Find common data for biz failed');
    }
  }

  static async updateCommonDataValue(whereClausesObj, attrUpd) {
    const whereClause = generateWhereClauses(whereClausesObj);
    await model.DexComDat.update(attrUpd, { where: whereClause })
      .then(result => {
        this.dataRes = result;
      })
      .catch(_err => {
        throw new BadRequestError({ errorCode: 404 });
      });
    return { delt_flg: 'N', ...attrUpd };
  }

  static async createCommonData(attrCre) {
    await model.DexComDat.create(attrCre)
      .then(result => {
        this.dataRes = result;
      })
      .catch(_err => {
        throw new BadRequestError({ errorCode: 406 });
      });
    return { delt_flg: 'N', ...attrCre };
  }

  static async findMatchCommonData(
    commonDataId,
    columnName,
    compareType,
    compareValue,
    returnColumn,
    returnCompareType,
    returnCompareValue,
  ) {
    try {
      const conditionMatch = getConditionText(compareType, compareValue, columnName, true, 'AND');
      let conditionReturn = '';
      if (returnColumn !== 'NRT') {
        conditionReturn = getMultiConditionText(returnCompareType, returnCompareValue, returnColumn);
      }
      const result = await model.sequelize.query(
        `
          SELECT obj.*
          FROM dex_com_dat a, json_array_elements(a.com_dat_val::json->'data') obj
          WHERE 
            a.com_dat_id = :commonDataId
            and obj->>'deleted' = 'No'
            ${conditionMatch}
            ${conditionReturn}
          LIMIT 1
        `,
        {
          replacements: { commonDataId },
          type: model.sequelize.QueryTypes.SELECT,
        },
      );
      this.dataRes = result.map(item => item.value);
      return this.dataRes;
    } catch (error) {
      logger.error(error);
      throw new BadRequestError('Find match common data failed');
    }
  }
}

const getConditionText = (compareType, compareValue, columnName, reverseCompare, andOr) => {
  compareValue = `${compareValue}`.replace(/'/g, `''`);
  switch (compareType) {
    case 'CT':
      if (reverseCompare) return `${andOr} '${compareValue}' ILIKE '%' || CAST(obj->>'${columnName}' AS text) || '%'`;
      return `${andOr} obj->>'${columnName}' ILIKE '%${compareValue}%'`;
    case 'NCT':
      if (reverseCompare) return `${andOr} '${compareValue}' NOT ILIKE '%' || CAST(obj->>'${columnName}' AS text) || '%'`;
      return `${andOr} obj->>'${columnName}' NOT ILIKE '%${compareValue}%'`;
    case 'ET':
      return `${andOr} obj->>'${columnName}' = '${compareValue}'`;
    case 'EW':
      if (reverseCompare) return `${andOr} '${compareValue}' ILIKE '%' || CAST(obj->>'${columnName}' AS text)`;
      return `${andOr} obj->>'${columnName}' ILIKE '%${compareValue}'`;
    case 'BW':
      if (reverseCompare) return `${andOr} '${compareValue}' ILIKE CAST(obj->>'${columnName}' AS text) || '%'`;
      return `${andOr} obj->>'${columnName}' ILIKE '${compareValue}%'`;
    case 'II':
      if (reverseCompare) return `${andOr} obj->>'${columnName}' ILIKE '%${compareValue}%'`;
      return `${andOr} '${compareValue}' ILIKE '%' || CAST(obj->>'${columnName}' AS text) || '%'`;
    default:
      return '';
  }
};

const getMultiConditionText = (compareType, compareValueArray, columnName) => {
  let multiConditionText = '';
  compareValueArray.forEach((value, index) => {
    let andOr = 'OR';
    if (index === 0 || index === compareValueArray.length) andOr = '';
    const conditionText = getConditionText(compareType, value.toUpperCase(), columnName, false, andOr);
    multiConditionText += conditionText;
  });
  return `AND (${multiConditionText})`;
};
