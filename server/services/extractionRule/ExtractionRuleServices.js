/* eslint-disable no-return-assign */
import model from '~/shared/models';
import generateNewId from '~/utils/generateNewId';
import { BadRequestError } from '../utils/errors';
export default class ExtractionRuleServices {
  constructor() {
    this.dataRes = null;
  }

  static async getExtractionRule(condition, attrParam) {
    await model.DexExtrRule.findAll({
      where: { ...condition },
      order: [['cre_dt', 'DESC']],
      attributes: attrParam || ['extr_rule_id', 'doc_fld_id', 'extr_rule_ctnt', 'delt_flg'],
    }).then(result => {
      this.dataRes = result;
    });

    return this.dataRes;
  }

  static async updateExtrRule(body) {
    await model.DexExtrRule.update(body, { where: { extr_rule_id: body.extr_rule_id } }).catch(_err => {
      throw new BadRequestError({ errorCode: 902 });
    });
    return { delt_flg: 'N', ...body };
  }

  static async createExtrRule(body) {
    await model.DexExtrRule.findAll({
      limit: 1,
      order: [['cre_dt', 'DESC']],
    })
      .then(lastest => {
        const lastestId = lastest.length > 0 ? lastest[0].extr_rule_id : '';
        const extrRuleId = generateNewId(lastestId, 'EXTRRULE');
        if (extrRuleId.length > 0) {
          const updateData = { ...body, extr_rule_id: extrRuleId };
          this.dataRes = { delt_flg: 'N', ...updateData };
          model.DexExtrRule.create(updateData).catch(_err => {
            throw new BadRequestError({ errorCode: 901 });
          });
        }
      })
      .catch(_err => {
        throw new BadRequestError({ errorCode: 901 });
      });
    return this.dataRes;
  }
}
