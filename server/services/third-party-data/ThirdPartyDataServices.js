/* eslint-disable quotes */
import model from '~/shared/models';
import generateWhereClauses from '~/utils/generateWhereClauses';
import { BadRequestError } from '../utils/errors';

export default class ThirdPartyDataServices {
  constructor() {
    this.status = 400;
    this.dataRes = null;
  }

  static async getThirdPartyData(whereClauseObj, attrArr, errCd, other) {
    const whereClause = generateWhereClauses(whereClauseObj);
    await model.DexN3ptyDat.findAll({
      where: whereClause,
      include: [
        {
          model: model.DexLoc,
          as: 'dex_loc',
          attributes: ['loc_nm'],
        },
      ],
      attributes: attrArr || '',
      order: [['cre_dt', 'DESC']],
      ...other,
    })
      .then(result => {
        this.dataRes = result;
      })
      .catch(err => {
        throw new BadRequestError({ errorCode: errCd });
      });
    return this.dataRes;
  }

  static async createThirdPartyData(attrCre) {
    await model.DexN3ptyDat.create(attrCre)
      .then(result => {
        this.dataRes = result;
      })
      .catch(_err => {
        throw new BadRequestError({ errorCode: 406 });
      });
    return { ...attrCre };
  }

  static async updateThirdPartyData(whereClausesObj, attrUpd) {
    const whereClause = generateWhereClauses(whereClausesObj);
    await model.DexN3ptyDat.update(attrUpd, { where: whereClause })
      .then(result => {
        this.dataRes = result;
      })
      .catch(_err => {
        throw new BadRequestError({ errorCode: 404 });
      });
    return { ...attrUpd };
  }
}
