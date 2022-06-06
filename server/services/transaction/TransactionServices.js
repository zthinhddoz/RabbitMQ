import model from '~/shared/models';
import generateNewId from '~/utils/generateNewId';
import AppConstants from '../utils/constants';
import { BadRequestError } from '../utils/errors';
import logger from '~/shared/logger';
const axios = require('axios');

export default class TransactionServices {
  constructor() {
    this.dataRes = null;
  }

  static async saveTransaction(data) {
    const lastestTrans = await model.DexTrans.findAll({
      limit: 1,
      order: [['cre_dt', 'DESC']],
    });
    const lastestId = lastestTrans.length > 0 ? lastestTrans[0].tj_id : '';
    await model.DexTrans.create({
      tj_id: generateNewId(lastestId, 'TRANS'),
      tj_ctnt: JSON.stringify(data.transactionContent),
      tp_id: data.transTypeId,
      tp_nm: data.typeName,
      cre_usr_id: data.userId,
      upd_usr_id: data.userId,
    })
      .then(result => {
        this.dataRes = result ? result.dataValues : null;
      })
      .catch(_error => {
        logger.error(_error);
        throw new BadRequestError({ errorCode: 1111 });
      });
    return this.dataRes;
  }

  static async getTransactionHistory(docId) {
    await model.DexTrans.findAll({
      where: { tp_id: docId, tp_nm: [AppConstants.TRANSACTION.VERIFY, AppConstants.TRANSACTION.RE_APPLY_BIZ] },
      attributes: ['tj_ctnt', 'cre_usr_id', 'cre_dt', 'tp_nm'],
      order: [['cre_dt', 'DESC']],
    }).then(result => {
      this.dataRes = result ? result.map(data => data.dataValues) : null;
    });
    return this.dataRes;
  }

  static async getLatestTransactionHistory(docId) {
    await model.DexTrans.findOne({
      where: { tp_id: docId },
      attributes: ['tj_ctnt', 'cre_usr_id', 'cre_dt', 'tp_nm'],
      order: [['cre_dt', 'DESC']],
      raw: 'true',
    }).then(result => {
      this.dataRes = result || null;
    });
    return this.dataRes;
  }
}
