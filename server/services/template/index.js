import { Router } from 'express';
import TemplateServices from './TemplateServices';
import { customRes } from '~/utils/commonFuncs';
import AppConstants from '../utils/constants';
import keycloak from '../shared/middleWare/checkSSO';

const router = Router();

router.post('/create', keycloak.protect(), async (req, res, next) => {
  const { usrId } = req.body;
  const dataRes = await TemplateServices.createNewTemplate(req.body, usrId).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.post('/update', keycloak.protect(), async (req, res, next) => {
  const { tmpltId } = req.query;
  const dataRes = await TemplateServices.updateTemplateById(tmpltId, req.body).catch(err => next(err),);
  customRes(req, res, next, dataRes);
});

router.put('/update-status', async (req, res, next) => {
  const { tmpltId, status, usrId } = req.body;
  const dataRes = await TemplateServices.updateTemplateStatus(tmpltId, status, usrId).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.post('/update-tmpl-data-matching', keycloak.protect(), async (req, res, next) => {
  const { templateId, matchingData, usrId } = req.body;
  const dataRes = await TemplateServices.updateTemplateMatching(templateId, matchingData, usrId).catch(err =>
    next(err),
  );
  customRes(req, res, next, dataRes);
});

router.get('/get-tmpl-not-annotated', keycloak.protect(), async (req, res, next) => {
  const { groupId, templateType } = req.query;
  const dataRes = await TemplateServices.getAllTmpltNotAnnotated(groupId, templateType).catch((err) => next(err));
  customRes(req, res, next, dataRes);
});

router.get('/get', keycloak.protect(), async (req, res, next) => {
  const { tmpltId } = req.query;
  const dataRes = await TemplateServices.getTmplInfoById(tmpltId).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.post('/generate-new-format', keycloak.protect(), async (req, res, next) => {
  const { docId, docTpId, fileUrl, oldTmplId, usrId } = req.body;
  const dataRes = await TemplateServices.generateNewFormat(docId, docTpId, fileUrl, oldTmplId, usrId).catch(err =>
    next(err),
  );
  customRes(req, res, next, dataRes);
});

router.get('/get-version', keycloak.protect(), async (req, res, next) => {
  const { tmpltId } = req.query;
  const dataRes = await TemplateServices.getTemplateVersion(tmpltId).catch(err => next(err),);
  customRes(req, res, next, dataRes);
});

function getStatus(dataRes, dataSearch) {
  const result = [];
  dataRes.forEach(item => {
    const element = {};
    const cordiVal = JSON.parse(item.cordi_val_ctnt);
    const cordiKey = JSON.parse(item.cordi_key_ctnt);
    const cordiCalc = JSON.parse(item.cordi_calc_ctnt);
    if (item.sts_flg === '1') {
      element.status = AppConstants.TEMPLATE_STATUSES.ANNOTATING;
    } else if (
      cordiVal.length === 0 ||
      cordiKey.length === 0 ||
      !cordiCalc.key_sequence ||
      cordiCalc.key_sequence.length === 0 ||
      cordiCalc.key_sequence.includes('1.0')
    ) {
      element.status = AppConstants.TEMPLATE_STATUSES.NOT_ANNOTATE;
    } else {
      element.status = AppConstants.TEMPLATE_STATUSES.ANNOTATED;
    }
    element.tmplt_id = item.tmplt_id;
    element.tmplt_nm = item.tmplt_nm;
    element.sts_flg = item.sts_flg;
    element.proc_usr_id = item.proc_usr_id;
    element.img_nm = item.img_nm;
    element.tp_val = item.tp_val;
    element.img_url = item.img_url;
    element.cre_usr_id = item.cre_usr_id;
    element.cre_dt = item.cre_dt;
    element.upd_dt = item.upd_dt;
    element.upd_usr_id = item.upd_usr_id;
    element.doc_tp_id = item.doc_tp_id;
    element.rule_id_val = item.rule_id_val;
    element.dex_tmplt_doc = item.dex_tmplt_doc;
    if (!dataSearch.stsNm || dataSearch.stsNm === 'All') result.push(element);
    else if (dataSearch.stsNm === element.status) result.push(element);
  });

  return result;
}

router.post('/get-template', keycloak.protect(), async (req, res, next) => {
  const dataSearch = req.body;
  const dataRes = await TemplateServices.getAllTemplate(dataSearch).catch(err => next(err));
  const result = getStatus(dataRes, dataSearch);
  customRes(req, res, next, result);
});

router.post('/delete', keycloak.protect(), async (req, res, next) => {
  const data = req.body;
  const dataRes = await TemplateServices.deleteTemplate(data.tmpltId, data.usrId).catch(err => next(err));
  customRes(req, res, next, dataRes);
});
export default router;
