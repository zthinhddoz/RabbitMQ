import model from '~/shared/models';
import { BadRequestError } from '../utils/errors';
import logger from '~/shared/logger';
import AppConstants from '../utils/constants';
import SyncDataService from './SyncDataService';
const Sequelize = require('sequelize');
const _ = require('lodash');
const axios = require('axios');

const checkResBPServer = resData => {
  if (resData.status === 200 && resData.data) {
    return true;
  }
  return false;
};

export default class BPServices {
  constructor() {
    this.dataRes = {};
  }

  static async getBtnAuth(mnuPgmUrl, usrId, pjtId) {
    try {
      if (usrId === 'admin') {
        await model.AdmMnuPgmBtn.findAll({ raw: true, attributes: ['btn_no'], group: ['btn_no'] })
          .then(result => {
            this.dataRes = result || null;
          }).catch(_err => {
            logger.error(_err);
            throw new BadRequestError('Get User Role failed');
          });
      } else {
        const raw_query = `
        SELECT auth.BTN_NO
        FROM adm_role_pgm_btn_auth auth,
             adm_mnu_pgm mnu
        WHERE 1 = 1
          AND mnu.MNU_PGM_ID = auth.MNU_PGM_ID
          AND mnu.MNU_PGM_URL_HTML = '${mnuPgmUrl}'
          AND ROLE_ID IN (
            SELECT LSTROLE.ROLE_ID
            FROM (
                     (SELECT distinct adm_role.ROLE_ID
                     FROM adm_usr_role,
                          adm_role
                     WHERE 1 = 1
                       AND adm_usr_role.ROLE_ID = adm_role.ROLE_ID
                       AND adm_usr_role.USR_ID = '${usrId}')
                     UNION
                     (SELECT distinct ROLE_ID
                     FROM adm_pjt_usr USR,
                          adm_pjt PJT
                     WHERE 1 = 1
                       AND USR.PJT_ID = PJT.PJT_ID
                       AND USR.PJT_ID = '${pjtId}'
                       AND PJT.USE_FLG = 'Y'
                       AND USR.USR_ID = '${usrId}')
                 ) LSTROLE
            )
          `;
        this.dataRes = await model.sequelize.query(raw_query, {
          type: Sequelize.QueryTypes.SELECT,
        });
      }
      return this.dataRes;
    } catch (error) {
      throw new BadRequestError('Get Button failed');
    }
  }

  static async getMenuAuth(usrId, pjtId) {
    const finalData = {};
    if (usrId === 'admin') {
      const whereClause = { delt_sts_flg: 'N', pjt_id: pjtId };
      await model.AdmMnuPgm.findAll({ where: whereClause, raw: true, order: [['mnu_pgm_ord_no', 'ASC']] })
        .then(result => {
          finalData.menuList = result ? toCamelCase(result) : null;
        }).catch(_err => {
          logger.error(_err);
          throw new BadRequestError('Get Menu failed');
        });
    } else {
      const raw_query = `
      SELECT
        MNU.MNU_PGM_ID,
        MNU.MNU_PGM_NM,
        MNU.PRNT_MNU_ID,
        MNU.MNU_PGM_URL_HTML,
        MNU.MNU_PGM_ORD_NO,
        MNU.MNU_ICON
        from (
            SELECT DISTINCT
            C.MNU_PGM_ID,
            C.MNU_PGM_NM,
            C.PRNT_MNU_ID,
            C.MNU_PGM_URL_HTML,
            C.MNU_PGM_ORD_NO,
            C.MNU_ICON
            FROM ADM_ROLE_PGM_AUTH A,
            ADM_MNU_PGM C
            WHERE A.ROLE_ID IN
            (
            SELECT RL.ROLE_ID
            FROM
            (
            SELECT DISTINCT ADM_ROLE.ROLE_ID
            FROM ADM_USR_ROLE ,
            ADM_ROLE
            WHERE 1 = 1
            AND ADM_USR_ROLE.ROLE_ID = ADM_ROLE.ROLE_ID
            AND ADM_USR_ROLE.USR_ID = '${usrId}'
            UNION
            SELECT DISTINCT ROLE_ID
            FROM ADM_PJT_USR USR,
            ADM_PJT PJT
            WHERE 1 = 1
            AND USR.PJT_ID = PJT.PJT_ID
            AND PJT.USE_FLG = 'Y'
            AND USR.USR_ID = '${usrId}'
            ) RL
            )
            AND A.MNU_PGM_ID = C.MNU_PGM_ID
            AND MNU_USD ='Y'
            AND DELT_STS_FLG ='N'
            AND POPUP_FLG ='N'
            AND PJT_ID = '${pjtId}'
        ) MNU
        order by MNU_PGM_ORD_NO, MNU_PGM_NM asc
        `;
      const result = await model.sequelize.query(raw_query, {
        type: Sequelize.QueryTypes.SELECT,
      });
      finalData.menuList = result ? toCamelCase(result) : null;
    }

    return finalData;
  }

  static async getAllCompanies() {
    /*
      Will call api to blueprint, will return list company have contract with Cyberlogitec VietNam
    */
    const reqData = { pjtId: process.env.PROJECT_ID };
    const result = await axios.get(process.env.BP_SERVER + AppConstants.BP_API.ALL_COM, { params: reqData });
    this.dataRes = result ? result.data.mnuDfnr : [];
    if (result && result.data) {
      this.dataRes.push({ CO_CD: result.data.coCd, CO_NM: result.data.coNm });
    }
    return this.dataRes;
  }

  static async getUserRoleNm(userId) {
    const whereClause = {usr_id: userId};
    await model.AdmUsrRole.findOne({ where: whereClause, include: ['usrRole'] })
      .then(result => {
        this.dataRes = result.dataValues.usrRole ? result.dataValues.usrRole.dataValues.role_nm : null;
      }).catch(_err => {
        logger.error(_err);
        throw new BadRequestError('Get User Role failed');
      });
    return this.dataRes;
  }

  static async getUserDetail(userId) {
    await model.AdmUsr.findAll({ where: { usr_id: userId }, raw: true })
      .then(result => {
        this.dataRes = result || null;
      }).catch(_err => {
        logger.error(_err);
        throw new BadRequestError('Get User Role failed');
      });
    return this.dataRes;
  }

  static async getUserInfo(userId) {
    const result = {};
    const roleNm = await this.getUserRoleNm(userId);
    let userDetail = await this.getUserDetail(userId);
    userDetail = toCamelCase(userDetail);
    result.usrRoleNm = roleNm;
    result.usrInfo = Array.isArray(userDetail) ? userDetail[0] : null;
    return result;
  }

  static async getProjectByUser(userId) {
    await model.AdmPjtUsr.findAll({ where: { usr_id: userId }, raw: true })
      .then(result => {
        this.dataRes = result || null;
      }).catch(_err => {
        logger.error(_err);
        throw new BadRequestError('Get User Role failed');
      });
    return this.dataRes;
  }

  static async getProjectByName() {
    await model.AdmPjt.findOne({ where: { pjt_nm: process.env.PROJECT_NAME }, raw: true })
      .then(result => {
        this.dataRes = result || null;
      }).catch(_err => {
        logger.error(_err);
        throw new BadRequestError('Get User Role failed');
      });
    return this.dataRes;
  }

  static async getDataSync() {
    try {
      /*
        At a time, only one server can connect to Rabbitmq and call the api synchronize data
        Therefore after get data change we must save data for all servers.
      */
      const reqData = { pjtId: process.env.PROJECT_ID };
      const result = await axios.get(process.env.BP_SERVER + AppConstants.BP_API.SYNC_DATA, { params: reqData });
      if (result && result.data.length > 0) {
        const dataChange = result.data;
        // // Save for site dev
        await axios.post(process.env.BACKEND_DEV + AppConstants.BP_API.SAVE_SYNCHRONIZE_DATA, {
          data: dataChange,
        });
        // // Save for site test
        await axios.post(process.env.BACKEND_TEST + AppConstants.BP_API.SAVE_SYNCHRONIZE_DATA, {
          data: dataChange,
        });
        // // Save for site staging
        // await axios.post(process.env.BACKEND_STAGING + AppConstants.BP_API.SAVE_SYNCHRONIZE_DATA, {
        //   data: dataChange,
        // });
      }
    } catch (err) {
      console.log(err);
      logger.error(err);
      throw new Error('Calling api sync data failed');
    }
    return this.dataRes;
  }

  static async processSaveData(dataChange) {
    /*
      Formar dataChange:
      [
        {
          dataTypeCd: MNU || ROLE || USR || AUTH,
          data: {
            ...
          },
          actCd: I || U || D // Insert or update or delete
        }
      ]
    */
    dataChange.forEach(element => {
      if (element.dataTypeCd === AppConstants.BP_TYPE_CHANGE.MENU) {
        SyncDataService.handleMenuChange(element);
      } else if (element.dataTypeCd === AppConstants.BP_TYPE_CHANGE.ROLE) {
        SyncDataService.handleRoleChange(element);
      } else if (element.dataTypeCd === AppConstants.BP_TYPE_CHANGE.USR) {
        SyncDataService.handleUserChange(element);
      } else if (element.dataTypeCd === AppConstants.BP_TYPE_CHANGE.AUTH) {
        SyncDataService.handleAuthChange(element);
      }
    });
  }
}

export const getOptionsHeaderBP = (req) => {
  const token = req.header('Authorization').split(' ')[1];
  return {
    headers: {
      Authorization: token,
    },
  };
};

export const toCamelCase = listData => {
  if (Array.isArray(listData)) {
    const result = [];
    listData.forEach (element => {
      const objectCamel = {};
      Object.keys(element).forEach(key => {
        const keyName = _.camelCase(key);
        objectCamel[keyName] = element[key];
      });
      result.push(objectCamel);
    });
    return result;
  }
  return listData;
};
