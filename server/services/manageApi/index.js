import { Router } from 'express';

// import model from '~/shared/models';
// import genareteNewId from "../utils/generateNewId";
import ManageApiServices from './manageApiServices';
import { customRes } from '../utils/commonFuncs';
import generateNewId from '~/utils/generateNewId';
import keycloak from '../shared/middleWare/checkSSO';
import DocDataServices from '../docData/DocDataServices';
import { getCodeFromClientWithAuthen, getCodeFromClient, callReturnCodeProc } from './manageApiFunctions';

const router = Router();

router.get('/getAll', keycloak.protect(), async (req, res, next) => {
  const dataRes = await ManageApiServices.getAllConfigs(req.query).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.post('/add', keycloak.protect(), async (req, res, next) => {
  const { params } = req.body;
  const attributes = {
    api_nm: params.api_nm,
    loc_cd: params.loc_cd,
    doc_tp_id: params.doc_tp_id,
    co_cd: params.co_cd,
    doc_fld_id: params.doc_fld_id,
    fld_cd: params.fld_cd,
    fld_nm: params.fld_nm,
    api_info_ctnt: params.api_info_ctnt,
    cre_usr_id: params.cre_usr_id,
    upd_usr_id: params.upd_usr_id,
    delt_flg: 'N',
  };

  // Find lastest id in Database
  const otherClause = {
    limit: 1,
    order: [['cre_dt', 'DESC']],
  };

  const lastestApi = await ManageApiServices.getApiConfig(null, null, otherClause).catch(err => next(err));
  const idLastest = lastestApi.length ? lastestApi[0].api_id : '';
  const idGenNew = generateNewId(idLastest, 'API');
  const createAttributes = {
    ...attributes,
    api_id: idGenNew,
  };
  const dataRes = await ManageApiServices.addNewApi(createAttributes).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.put('/update', keycloak.protect(), async (req, res, next) => {
  const whereClause = { api_id: req.body.api_id };
  const dataRes = await ManageApiServices.updateApiConfig(whereClause, req.body).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.get('/getApiDetail', keycloak.protect(), async (req, res, next) => {
  const whereClause = {
    co_cd: req.query.co_cd,
    loc_cd: req.query.loc_cd,
    doc_tp_id: req.query.doc_tp_id,
    doc_fld_id: req.query.doc_fld_id,
    delt_flg: 'N',
  };
  const dataRes = await ManageApiServices.getApiConfig(whereClause, null, null).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.get('/searchApiList', keycloak.protect(), async (req, res, next) => {
  const whereClause = {
    co_cd: req.query.co_cd,
    loc_cd: req.query.loc_cd,
    doc_tp_id: req.query.doc_tp_id,
    cre_usr_id: req.query.userId,
    delt_flg: req.query.delt_flg,
  };
  const attributes = [
    'api_id',
    'api_nm',
    'co_cd',
    'loc_cd',
    'api_info_ctnt',
    'doc_tp_id',
    'doc_fld_id',
    'fld_nm',
    'api_id',
  ];
  const dataRes = await ManageApiServices.getApiConfig(whereClause, attributes, null).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.get('/getApiManageByDoc', keycloak.protect(), async (req, res, next) => {
  const { docId, userId } = req.query;

  try {
    const docInfo = await DocDataServices.getDocInfo(docId);
    let dataRes = [];
    if (docInfo) {
      const whereClause = {
        co_cd: docInfo.co_cd,
        loc_cd: docInfo.loc_cd,
        doc_tp_id: docInfo.doc_tp_id,
        delt_flg: 'N',
        cre_usr_id: userId,
      };
      dataRes = await ManageApiServices.getApiConfig(whereClause, null, null).catch(err => next(err));
    }
    customRes(req, res, next, dataRes);
  } catch (err) {
    next(err);
  }
});

router.post('/getDataCodeFromURL', keycloak.protect(), async (req, res, next) => {
  try {
    const fieldInfo = req.body.fieldInfo || {};
    const fldValues = req.body.fldValues || {};
    const { fldId } = req.body;
    const { api_url, response_key, field_query } = fieldInfo;
    const { usrNm, pwd, token } = fieldInfo.content || {};
    const path = new URL(api_url);
    const returnCode = response_key.toLowerCase();
    if (fieldInfo.auth_type === 'No Auth') {
      getCodeFromClient(path.origin)
        .get(path.pathname, { params: fldValues })
        .then(response => {
          let results = [];
          if (response && response.data) {
            results = Array.isArray(response.data[returnCode]) ? response.data : [response.data];
          }
          let dataRes = {};
          if (results) {
            dataRes = {
              ...fieldInfo,
              fld_id: fldId,
              return_code: results,
            };
          }
          customRes(req, res, next, dataRes);
        })
        .catch(error => {
          next(error);
        });
    } else {
      getCodeFromClientWithAuthen(path.origin, { usrNm, pwd, token }, fieldInfo.auth_type)
        .get(path.pathname, { params: fldValues })
        .then(response => {
          let results = [];
          if (response && response.data) {
            results = response.data ? response.data : [];
          }
          let dataRes = {};
          if (results) {
            dataRes = {
              ...fieldInfo,
              fld_id: fldId,
              return_code: results,
            };
          }
          customRes(req, res, next, dataRes);
        })
        .catch(error => {
          next(error);
        });
    }
  } catch (error) {
    next(error);
  }
});

router.post('/formatReturnCodeData', keycloak.protect(), async (req, res, next) => {
  try {
    const { datAPI, resKey } = req.body;
    const dataRes = (await callReturnCodeProc(datAPI, resKey)) || '';
    customRes(req, res, next, { [[resKey]]: dataRes });
  } catch (error) {
    next(error);
  }
});

export default router;
