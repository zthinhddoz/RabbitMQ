/* eslint-disable no-return-assign */
/* eslint-disable arrow-parens */
import model from '~/shared/models';
import { BadRequestError } from '../utils/errors';
import DocDataServices from '../docData/DocDataServices';
import logger from '~/shared/logger';

export default class DocFieldServices {
  constructor() {
    this.dataRes = null;
  }

  static async getDocTypeFieldList(docTypeId) {
    await model.AdmDocFld.findAll({ where: { doc_tp_id: docTypeId, delt_flg: 'N' } })
      .then(result => (this.dataRes = result ? result : null))
      .catch(_error => {
        logger.error(_error);
        throw new BadRequestError({ errorCode: 300 });
      });
    return this.dataRes;
  }

  static async getFieldByComDoc(docId, docTypeId) {
    try {
      const locId = await DocDataServices.getLocIdByDocId(docId);
      if(locId){
        const result = await model.AdmCoDocFld.findAll({ where: { loc_id: locId, delt_flg: 'N' },
          attributes: ['adm_co_doc_fld_id', 'ord_no', 'fld_cd'], 
          include: [
            {
              model: model.AdmDocFld,
              as: "AdmDocFld",
              where: {doc_tp_id: docTypeId},
            }
          ],
          order: [['ord_no', 'ASC']],
        })
        const dataRes = [];
        if(result){
          for(let item of result){
            const fieldData = item.AdmDocFld.dataValues;
            fieldData.fld_cd = item.fld_cd;
            fieldData.ord_no = item.ord_no
            dataRes.push(fieldData);
          }
        }
        return dataRes
      }
      return null;
    } catch (error) {
      logger.error(error);
      throw new BadRequestError({ errorCode: 300 });
    }
  }

  static async getParentChildDocFields(docTypeId, getParentOnly = true, ruleFlag = null) {
    const whereClause = { doc_tp_id: docTypeId, delt_flg: 'N' };
    let ruleWhereClause = null;
    if (ruleFlag) ruleWhereClause = { delt_flg: ruleFlag };
    if (getParentOnly) whereClause.fld_grp_id = null;
    await model.AdmDocFld.findAll({
      where: whereClause,
      attributes: ['doc_fld_id', 'fld_nm', 'doc_tp_id'],
      include: [
        {
          model: model.AdmDocFld,
          as: 'child_fields',
          attributes: ['doc_fld_id', 'fld_nm', 'doc_tp_id'],
          include: [
            {
              model: model.DexExtrRule,
              as: 'dex_extr_rule',
              attributes: ['extr_rule_id', 'doc_fld_id', 'extr_rule_ctnt', 'delt_flg'],
              where: ruleWhereClause,
            },
          ],
        },
        {
          model: model.DexExtrRule,
          as: 'dex_extr_rule',
          where: ruleWhereClause,
        },
      ],
    })
      .then(result => (this.dataRes = result ? result.map(item => item.dataValues) : null))
      .catch(_error => {
        throw new BadRequestError({ errorCode: 300 });
      });
    return this.dataRes;
  }

  static async getDocFieldGroup(docTypeId) {
    await model.AdmDocFld.findAll({ where: { doc_tp_id: docTypeId, fld_grp_flg: 'Y' } })
      .then(result => {
        this.dataRes = result ? result.map(data => data.dataValues) : null;
      })
      .catch(_err => {
        throw new BadRequestError('Get Field Group failed');
      });
    return this.dataRes;
  }

  static sampleErrorMethod() {
    throw new BadRequestError({ errorCode: 505 });
  }

  static otherSampleErrorMethod() {
    throw new BadRequestError({ errorCode: 305 });
  }
}
