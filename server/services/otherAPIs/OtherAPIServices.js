import logger from '~/shared/logger';
import model from '~/shared/models';
import { BadRequestError } from '../utils/errors';
import DocDataServices from '../docData/DocDataServices.js';
import LocationServices from '../locations/LocationServices';
import AppConstants from '../utils/constants';
const { Op } = require('sequelize');

export default class OtherAPIServices {
  constructor() {
    this.dataRes = null;
  }

  static async getListDocInfos(comCd, locCd, docTypeId, usrId, fromDate, toDate) {
    const lastDate = `${toDate.split('T')[0]} 23:59:59`;
    const whereClause = {
      prnt_doc_id: null,
      cre_dt: { [Op.between]: [fromDate, lastDate] },
    };
    const whereClauseDexLoc = {};
    whereClauseDexLoc.loc_nm = locCd;
    whereClauseDexLoc.co_cd = comCd;
    whereClauseDexLoc.cre_usr_id = usrId;
    whereClauseDexLoc.doc_tp_id = docTypeId;
    const attributes = ['doc_id', 'sts_cd', 'aft_biz_ctnt'];
    await model.DexDoc.findAll({
      where: whereClause,
      order: [['upd_dt', 'DESC']],
      attributes,
    })
      .then(result => {
        let formatedListDoc = [];
        if (result) {
          formatedListDoc = result.map(res => ({
            doc_id: res.doc_id,
            status: res.sts_cd,
            data: res.aft_biz_ctnt,
          }));
        }
        const resObj = {
          list_doc: formatedListDoc,
        };
        this.dataRes = resObj || null;
      })
      .catch(err => {
        logger.error(err);
        throw new BadRequestError('Getting List Doc-Data From Date was failed!');
      });
    return this.dataRes;
  }

  static async getDocData(docId, isOrigin) {
    try {
      const resObj = {
        sts_cd: 200,
        status: null,
      };
      const latestTransaction = isOrigin !== 'true' ? true : false;
      const renderableData = await DocDataServices.getRenderableData(docId, latestTransaction);
      if (renderableData) {
        resObj.status = renderableData.extractedData ? renderableData.extractedData.sts_cd : renderableData.sts_cd;
        resObj.extract_json = renderableData.extractedData?.aft_biz_ctnt;
        if (renderableData.extractedData) {
          resObj.extract_url = `${process.env.CLIENT_URL}${AppConstants.CLIENT_URL.VIEW_EXT}/${renderableData.extractedData.doc_id}`;
        } else {
          const tmpltData = renderableData.dex_tmplt?.dataValues;
          resObj.annotate_url = tmpltData
            ? `${process.env.CLIENT_URL}${AppConstants.CLIENT_URL.ANNOTATE}/${tmpltData.tp_val}/${tmpltData.tmplt_id}`
            : null;
        }
      }
      this.dataRes = resObj;
    } catch (err) {
      logger.error(err);
      throw new BadRequestError('Getting doc info failed!');
    }
    return this.dataRes;
  }

  static async getLocData(coCd, locCd) {
    try {
      const result = [];
      const locationData = await LocationServices.getLocations(['documents'], { co_cd: coCd, loc_cd: locCd });
      locationData.forEach(locData => {
        const comDocData = {};
        comDocData.com_doc_id = locData.loc_id;
        comDocData.doc_tp_id = locData.doc_tp_id;
        comDocData.doc_nm = locData.documents?.dataValues?.doc_nm;
        result.push(comDocData);
      });
      return result;
    } catch (err) {
      logger.error(err);
      throw new BadRequestError('Getting doc info failed!');
    }
  }
}
