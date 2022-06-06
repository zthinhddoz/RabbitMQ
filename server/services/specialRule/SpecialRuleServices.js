import model from '~/shared/models';
import { BadRequestError } from '../utils/errors';
import logger from '~/shared/logger';

export default class SpecialRuleServices {
  constructor() {
    this.dataRes = null;
  }

  static async getMatchingCfg() {
    try {
      const whereClause = { delt_flg: 'N' };
      await model.DexRule.findAll({
        attributes: ['rule_id', 'img_url'],
        where: whereClause,
      }).then(result => {
        this.dataRes = result ? result.map(data => data.dataValues) : null;
      });
      return this.dataRes;
    } catch (error) {
      logger.error(error);
      this.dataRes = false;
      return this.dataRes;
    }
  }

  static async getAllSpecialRule() {
    await model.DexTmpltRule.findAll()
      .then(result => {
        this.dataRes = result ? result.map(rule => rule.dataValues) : null;
      })
      .catch(_error => {
        logger.error(_error);
        throw new BadRequestError({ errorCode: 1113 });
      });
    return this.dataRes;
  }

  static async getSpecialRuleOfTemplateId(templateId, docTypeId) {
    const allDexRule = await model.DexRule.findAll({ where: { delt_flg: 'N' } });
    const newDexRule = [];
    allDexRule.forEach(element => {
      if (element.dataValues.doc_tp_ctnt && element.dataValues.doc_tp_ctnt !== 'null') {
        const docType = JSON.parse(element.dataValues.doc_tp_ctnt);
        if (docType) {
          const arrDocTp = [];
          docType.forEach(item => {
            arrDocTp.push(item.doc_tp_id);
          });
          if (arrDocTp.includes(docTypeId)) {
            newDexRule.push(element);
          }
        }
      }
    });
    if (!newDexRule) throw new Error('Can not getting Special Rules');
    await model.DexTmpltRule.findAll({ where: { tmplt_id: templateId } })
      .then(result => {
        if (result) {
          const resultList = result.map(result => result.dataValues);
          // filter rule without have defined ruleInfo
          this.dataRes = newDexRule.map(ruleInfo => {
            for (let i = 0; i < resultList.length; i++) {
              if (ruleInfo.dataValues.rule_id === resultList[i].rule_id) {
                ruleInfo.dataValues.isChecked = true;
              }
            }
            return ruleInfo;
          });
          return this.dataRes;
        } else {
          this.dataRes = newDexRule.map(rule => rule.dataValues);
        }
        throw new Error('Can not getting Special Rules');
      })
      .catch(_error => {
        logger.error(_error);
        throw new BadRequestError({ errorCode: 1113 });
      });
    return this.dataRes;
  }

  static async getSpecialRule(specialRuleId) {
    await model.DexTmpltRule.findOne({ where: { rule_id: specialRuleId } })
      .then(result => {
        this.dataRes = result ? result.dataValues : null;
      })
      .catch(_error => {
        logger.error(_error);
        throw new BadRequestError({ errorCode: 1113 });
      });
    return this.dataRes;
  }
}
