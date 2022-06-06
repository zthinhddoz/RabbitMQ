import model from '~/shared/models';
import { BadRequestError } from '../utils/errors';
import generateNewId from '~/utils/generateNewId';
import logger from '~/shared/logger';

export default class SetUpComDocService {
  constructor() {
    this.dataRes = null;
  }

  static async getFieldForBizLogic(param) {
    const condition = Object.entries(param).reduce((acc, curr) => {
      const item = {};
      if (curr[1] && curr[1] !== 'all') item[curr[0]] = curr[1];
      acc[curr[0]] = item;
      return acc;
    }, {});

    await model.AdmCoDocFld.findAll({
      where: { delt_flg: 'N', ...condition.adm_co_doc_fld_id },
      include: [
        {
          model: model.AdmDocFld,
          as: 'AdmDocFld',
          where: { delt_flg: 'N', ...condition.doc_fld_id },
        },
        {
          model: model.DexBizRule,
          as: 'DexBizRule',
          where: { delt_flg: 'N' },
          required: false,
        },
        {
          model: model.DexLoc,
          as: 'DexLoc',
          where: { delt_flg: 'N', ...condition.co_cd, ...condition.loc_cd },
          include: [
            {
              model: model.AdmDoc,
              as: 'documents',
              where: { delt_flg: 'N', ...condition.doc_tp_id },
            },
          ],
        },
      ],
      order: [['ord_no', 'ASC'], [{ model: model.DexBizRule, as: 'DexBizRule' }, 'ord_no', 'ASC']],
    })
      .then(result => (this.dataRes = result || null))
      .catch(_err => {
        logger.error(_err);
        throw new BadRequestError({ errorCode: 805 });
      });
    return this.dataRes;
  }

  static async updateFieldDetail(param) {
    const { locId, documentId, fieldId, active, orderNumber, fieldCode, userId } = param;
    try {
      const updataField = model.AdmCoDocFld.update(
        { upd_usr_id: userId, delt_flg: active, ord_no: orderNumber, fld_cd: fieldCode },
        {
          where: {
            loc_id: locId,
            doc_fld_id: fieldId,
          },
        },
      ).catch(error => {
        logger.error(error);
        throw new BadRequestError({ errorCode: 205 });
      });
    } catch (error) {
      logger.error(error);
      throw new BadRequestError({ errorCode: 205 });
    }
  }

  static async getLatestId() {
    const PREFIX_ID_COM_DOC_FLD = 'COMDOCFLD';
    const lastComField = await model.AdmCoDocFld.findAll({
      limit: 1,
      order: [['cre_dt', 'DESC']],
    });

    const lastComFieldId = lastComField.length > 0 ? lastComField[0].adm_co_doc_fld_id : '';
    const newComFieldId = generateNewId(lastComFieldId, PREFIX_ID_COM_DOC_FLD);
    return newComFieldId;
  }
}
