/* eslint-disable no-unused-expressions */
/* eslint-disable object-curly-newline */
/* eslint-disable function-paren-newline */
/* eslint-disable implicit-arrow-linebreak */
/* eslint-disable no-nested-ternary */
/* eslint-disable no-restricted-globals */
/* eslint-disable arrow-parens */
/* eslint-disable import/no-unresolved */
/* eslint-disable indent */
/* eslint-disable camelcase */
import model from '~/shared/models';
import { BadRequestError } from '../utils/errors';
import generateWhereClauses from '~/utils/generateWhereClauses';

export default class ManageApiServices {
  constructor() {
    this.status = 400;
    this.dataRes = null;
  }

  static async addNewApi(creAttr) {
    await model.DexApi.create(creAttr)
      .then(result => {
        this.dataRes = result;
      })
      .catch(err => {
        throw new BadRequestError({ errorCode: 407 });
      });
    return { delt_flg: 'N', ...creAttr };
  }

  static async getAllConfigs() {
    await model.DexApi.findAll({
      where: { delt_flg: 'N' },
    })
      .then(result => {
        this.dataRes = result;
      })
      .catch(err => {
        throw new BadRequestError({ errorCode: 407 });
      });
    return this.dataRes;
  }

  static async getApiConfig(whereClause, attrArr, otherClause) {
    const whereClauseApiConfigs = { ...whereClause };
    if (whereClauseApiConfigs.co_cd && whereClauseApiConfigs.co_cd == 'All') delete whereClauseApiConfigs.co_cd;
    if (whereClauseApiConfigs.loc_cd && whereClauseApiConfigs.loc_cd == 'All') delete whereClauseApiConfigs.loc_cd;
    if (whereClauseApiConfigs.doc_tp_id && whereClauseApiConfigs.doc_tp_id == 'All') delete whereClauseApiConfigs.doc_tp_id;
    if (whereClauseApiConfigs.cre_usr_id === 'admin') delete whereClauseApiConfigs.cre_usr_id;

    await model.DexApi.findAll({
      where: whereClauseApiConfigs,
      attributes: attrArr || '',
      order: [['cre_dt', 'DESC']],
      ...otherClause,
    })
      .then(result => {
        this.dataRes = result;
      })
      .catch(err => {
        throw new BadRequestError({ error: 407 });
      });
    return this.dataRes;
  }

  static async updateApiConfig(whereClauses, updAttr) {
    const whereClause = generateWhereClauses(whereClauses);
    await model.DexApi.update(updAttr, { where: whereClause })
      .then(result => {
        this.dataRes = result;
      })
      .catch(_err => {
        throw new BadRequestError({ errorCode: 407 });
      });
    return { delt_flg: 'N', ...updAttr };
  }
}
