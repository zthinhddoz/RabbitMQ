/* eslint-disable no-restricted-syntax */
/* eslint-disable camelcase */
/* eslint-disable arrow-parens */
import model from '~/shared/models';
import generateNewId from '~/utils/generateNewId';
import { BadRequestError } from '../utils/errors';
import logger from '~/shared/logger';
import SetUpComDocService from '../setupComDoc/SetUpComDocService';
import { createBulkData } from '../utils/commonFuncs';

export default class BizRuleService {
  constructor() {
    this.dataRes = null;
  }

  static async getBizLogic(whereClause) {
    await model.DexBizRule.findAll({
      where: { ...whereClause },
      order: [['ord_no', 'ASC']],
    })
      .then(result => (this.dataRes = result ? result : null))
      .catch(_err => {
        logger.error(_err);
        throw new BadRequestError({ errorCode: 801 });
      });
    return this.dataRes;
  }

  static async updateBizLogic(updateClause, whereClause) {
    await model.DexBizRule.update(updateClause, {
      where: whereClause,
    })
      .then(result => (this.dataRes = result ? result : null))
      .catch(_err => {
        logger.error(_err);
        throw new BadRequestError({ errorCode: 802 });
      });
    return this.dataRes;
  }

  static async createBizLogic(object) {
    await model.DexBizRule.findAll({
      limit: 1,
      order: [['cre_dt', 'DESC']],
    }).then(lastest => {
      const lastestId = lastest.length > 0 ? lastest[0].biz_rule_id : '';
      const bizRuleId = generateNewId(lastestId, 'BIZRULE');
      if (bizRuleId.length !== 0) {
        model.DexBizRule.create({
          ...object,
          biz_rule_id: bizRuleId,
        })
          .then(result => (this.dataRes = result ? result : null))
          .catch(_err => {
            logger.error(_err);
            throw new BadRequestError({ errorCode: 803 });
          });
      } else throw new BadRequestError({ errorCode: 803 });
    });
    return this.dataRes;
  }

  static async copyBizLogic(data) {
    const { com_cd, doc_tp_id, source_loc_cd, target_loc_cd, usr_id } = data;
    const condition = {
      co_cd: com_cd,
      doc_tp_id,
    };
    try {
      const currentFields = await SetUpComDocService.getFieldForBizLogic({ ...condition, loc_cd: source_loc_cd });
      const targetFields = await SetUpComDocService.getFieldForBizLogic({ ...condition, loc_cd: target_loc_cd });
      const currentFieldsHasBiz = currentFields
        .filter(field => field.DexBizRule.length > 0)
        .map(item => {
          const element = { doc_fld_id: item.AdmDocFld.doc_fld_id, bizRule: item.DexBizRule };
          return element;
        });
      if (currentFieldsHasBiz.length === 0) return { message: 'Source document has no biz!', variant: 'warning' };
      const targetFieldsInfo = targetFields.map(item => {
        const element = { doc_fld_id: item.AdmDocFld.doc_fld_id, adm_co_doc_fld_id: item.adm_co_doc_fld_id };
        return element;
      });
      currentFieldsHasBiz.forEach(currentField => {
        for (const targetField of targetFieldsInfo) {
          if (targetField.doc_fld_id === currentField.doc_fld_id) {
            targetField.bizRule = currentField.bizRule;
            break;
          }
        }
      });
      const lastestBiz = await model.DexBizRule.findAll({
        limit: 1,
        order: [['cre_dt', 'DESC']],
      });
      let lastestId = lastestBiz.length > 0 ? lastestBiz[0].biz_rule_id : '';
      let copiedBizRules = [];
      targetFieldsInfo.forEach(targetField => {
        if (targetField.bizRule) {
          const bizRules = targetField.bizRule.map(rule => {
            const bizRuleId = generateNewId(lastestId, 'BIZRULE');
            lastestId = bizRuleId;
            const newBiz = {
              biz_rule_id: bizRuleId,
              adm_co_doc_fld_id: targetField.adm_co_doc_fld_id,
              biz_rule_desc: rule.biz_rule_desc,
              cond_tp_cd: rule.cond_tp_cd,
              ord_no: rule.ord_no,
              cond_ctnt: rule.cond_ctnt,
              act_ctnt: rule.act_ctnt,
              delt_flg: rule.delt_flg,
              cre_usr_id: usr_id,
              upd_usr_id: usr_id,
            };
            return newBiz;
          });
          copiedBizRules = [...copiedBizRules, ...bizRules];
        }
      });
      if (copiedBizRules.length === 0) return { message: 'No biz copied!', variant: 'warning' };
      await createBulkData(model.DexBizRule, copiedBizRules);
      return { message: 'Copy biz successfully!', variant: 'success' };
    } catch (error) {
      logger.error(error);
      return { message: 'Copy biz error!', variant: 'success' };
    }
  }
}
