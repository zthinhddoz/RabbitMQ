import model from '~/shared/models';
import generateNewId from '~/utils/generateNewId';
import { BadRequestError } from '../utils/errors';
import logger from '~/shared/logger';

export default class DynamicTypeService {
  constructor() {
    this.dataRes = null;
  }

  static async getDynamicType(whereClause) {
    await model.DexDyn.findAll({
      where: { ...whereClause },
      attributes: ['dyn_id', 'dyn_nm', 'reg_expr_val', 'src_val', 'delt_flg'],
      order: [['cre_dt', 'DESC']],
    })
      .then(result => (this.dataRes = result ? result : null))
      .catch(_err => {
        logger.error(_err);
        throw new BadRequestError({ errorCode: 900 });
      });
    return this.dataRes;
  }

  static async getDynamicTypeById(dynId) {
    await model.DexDyn.findOne({
      where: { dyn_id: dynId, delt_flg: 'N' },
    })
      .then(result => (this.dataRes = result ? result.dataValues : null))
      .catch(_err => {
        logger.error(_err);
        throw new BadRequestError({ errorCode: 900 });
      });
    return this.dataRes;
  }

  static async addDynamicType(body) {
    await model.DexDyn.findAll({
      limit: 1,
      order: [['cre_dt', 'DESC']],
    })
      .then(lastest => {
        const lastestId = lastest.length > 0 ? lastest[0].dyn_id : '';
        const dynId = generateNewId(lastestId, 'DYNTP');
        if (dynId.length > 0) {
          const updateData = { ...body, dyn_id: dynId };
          this.dataRes = { delt_flg: 'N', ...updateData };
          model.DexDyn.create(updateData).catch(_err => {
            throw new BadRequestError({ errorCode: 901 });
          });
        }
      })
      .catch(_err => {
        logger.error(_err);
        throw new BadRequestError({ errorCode: 901 });
      });
    return this.dataRes;
  }

  static async updateDynamicType(body) {
    await model.DexDyn.update(body, { where: { dyn_id: body.dyn_id } }).catch(_err => {
      logger.error(_err);
      throw new BadRequestError({ errorCode: 902 });
    });
    return { delt_flg: 'N', ...body };
  }
}
