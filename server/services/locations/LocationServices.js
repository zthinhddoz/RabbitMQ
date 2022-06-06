import model from '~/shared/models';
import { BadRequestError } from '../utils/errors';
import logger from '~/shared/logger';
import fs from 'fs';
export default class LocationService {
  constructor() {
    this.status = 400;
    this.dataRes = null;
  }

  static async getLocations(includeClause, whereClause) {
    await model.DexLoc.findAll({ include: includeClause, where: whereClause })
      .then(result => {
        this.dataRes = result || null;
      })
      .catch(_err => {
        logger.error(_err);
        throw new BadRequestError({ errorCode: 804 });
      });
    return this.dataRes;
  }

  static async getUploadData(includeClause, whereClause) {
    await model.DexUpldMzd.findAll({ include: includeClause, where: whereClause })
      .then(result => {
        this.dataRes = result || null;
      })
      .catch(_err => {
        logger.error(_err);
        throw new BadRequestError({ errorCode: 804 });
      });
    return this.dataRes;
  }

  static async getLocationForBizLogic(req) {
    return await this.getLocations(
      [
        {
          model: model.AdmDoc,
          as: 'documents',
          where: { delt_flg: 'N' },
          include: [
            {
              model: model.AdmDocFld,
              as: 'doc_fields',
              where: { delt_flg: 'N' },
              required: false,
            },
          ],
        },
      ],
      { delt_flg: 'N', ...req.query },
    );
  }

  static async getFolLocUrl(coCd, locCd, docTpId) {
    const whereClause = { co_cd: coCd, loc_cd: locCd, doc_tp_id: docTpId };
    await model.DexLoc.findOne({ where: whereClause })
      .then(result => {
        this.dataRes = result || null;
      })
      .catch(_err => {
        logger.error(_err);
        return null;
      });
    return this.dataRes;
  }
}
