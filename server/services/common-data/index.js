import { Router } from 'express';
import { customRes } from '../utils/commonFuncs';
import generateNewId from '~/utils/generateNewId';
import CommonDataServices from './CommonDataServices';
import keycloak from '../shared/middleWare/checkSSO';

const router = Router();

router.get('/all-common-data', keycloak.protect(), async (req, res, next) => {
  const attributes = ['com_dat_id', 'com_dat_nm', 'com_dat_cd'];
  const dataRes = await CommonDataServices.getCommonData(null, attributes, 401).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.get('/common-data-by-id', keycloak.protect(), async (req, res, next) => {
  const whereClause = { com_dat_id: req.query.id };
  const attributes = ['com_dat_id', 'com_dat_val', 'com_dat_cd', 'com_dat_nm', 'delt_flg'];
  const rawDataRes = await CommonDataServices.getCommonData(whereClause, attributes).catch(err => next(err));
  const dataRes = rawDataRes ? rawDataRes[0] : {};
  customRes(req, res, next, dataRes);
});

router.put('/update-common-data-value', keycloak.protect(), async (req, res, next) => {
  const whereClause = { com_dat_id: req.body.com_dat_id };
  const dataRes = await CommonDataServices.updateCommonDataValue(whereClause, req.body).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.post('/create-common-data', keycloak.protect(), async (req, res, next) => {
  // find exist data
  const attributesUpdate = {
    com_dat_nm: req.body.com_dat_nm,
    com_dat_val: req.body.com_dat_val,
    upd_usr_id: req.body.userId,
    delt_flg: 'N',
  };
  const commonDataCode = { com_dat_cd: req.body.com_dat_cd };

  const dataExisted = await CommonDataServices.getCommonData(commonDataCode, null, 404).catch(err => next(err));

  let dataRes = null;

  if (dataExisted.length) {
    // data existed --> update delete flag from Y to N
    dataRes = await CommonDataServices.updateCommonDataValue(commonDataCode, attributesUpdate).catch(err => next(err));
  } else {
    // data not existed --> create new common date
    // find lastest id in database
    const otherClause = {
      limit: 1,
      order: [['cre_dt', 'DESC']],
    };

    const dataLastest = await CommonDataServices.getCommonData(null, null, 404, otherClause).catch(err => next(err));

    const idLastest = dataLastest.length ? dataLastest[0].com_dat_id : '';
    const idGenNew = generateNewId(idLastest, 'COMDAT');
    const attributesCreate = {
      ...attributesUpdate,
      com_dat_id: idGenNew,
      com_dat_cd: req.body.com_dat_cd,
      cre_usr_id: req.body.userId,
    };

    dataRes = await CommonDataServices.createCommonData(attributesCreate).catch(err => next(err));
  }
  customRes(req, res, next, dataRes);
});

router.post('/common-data-by-code', keycloak.protect(), async (req, res, next) => {
  const whereClause = { com_dat_cd: req.body.codeList, delt_flg: 'N' };
  const attributes = ['com_dat_id', 'com_dat_cd', 'com_dat_val', 'com_dat_nm'];
  const dataRes = await CommonDataServices.getCommonData(whereClause, attributes).catch(err => next(err));
  if (dataRes) {
    dataRes.forEach(res => (res.com_dat_val = JSON.parse(res.com_dat_val)));
    return res.status(200).json(dataRes);
  }

  return next();
});

router.get('/common-data-for-biz', keycloak.protect(), async (req, res, next) => {
  const dataRes = await CommonDataServices.getCommonDataForBiz().catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.get('/mtch-tp', keycloak.protect(), async (req, res, next) => {
  const whereClause = { com_dat_cd: 'MATCHING_TYPE' };
  const rawDataRes = await CommonDataServices.getCommonData(whereClause);
  if (rawDataRes[0] && rawDataRes[0].com_dat_val) {
    const resultData = JSON.parse(rawDataRes[0].com_dat_val);
    const result = resultData.data.filter(item => item.deleted === 'No');
    return res.status(200).json({
      msg: 'Get Matching Type successful',
      result,
    });
  }
  return next(res.status(500).json({ errorCode: 107 }));
});

export default router;
