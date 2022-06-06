/* eslint-disable arrow-parens */
/* eslint-disable object-curly-newline */
/* eslint-disable camelcase */
import { Router } from 'express';
import { customRes } from '~/utils/commonFuncs';
import ExtractionRuleServices from './ExtractionRuleServices';
import DocDataServices from '../docData/DocDataServices';
import DocFieldServices from '../docField/DocFieldServices';
import * as ExecuteExtrRuleServices from './ExecuteExtractionRuleServices';
import keycloak from '../shared/middleWare/checkSSO';

const router = Router();

router.put('/update-extr-rule', keycloak.protect(), async (req, res, next) => {
  const dataRes = await ExtractionRuleServices.updateExtrRule(req.body).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.post('/create-extr-rule', keycloak.protect(), async (req, res, next) => {
  const dataRes = await ExtractionRuleServices.createExtrRule(req.body).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.put('/run-single-extr-rule', keycloak.protect(), async (req, res, next) => {
  const { input, extrRule } = req.body;
  const { fieldData } = await ExecuteExtrRuleServices.runSingleExtrRule(input, extrRule.dex_extr_rule[0]);
  customRes(req, res, next, fieldData.length ? fieldData : '*data not found');
});

router.put('/run-multi-extr-rule', keycloak.protect(), async (req, res, next) => {
  const { input, extrRule } = req.body;
  const dataRes = await ExecuteExtrRuleServices.runMultiExtrRule(input, extrRule.child_fields);
  customRes(req, res, next, dataRes);
});

router.get('/run-extr-rule-by-doc', keycloak.protect(), async (req, res, next) => {
  const { docId } = req.query;
  const dataRes = await processRunExtrRuleByDoc(docId).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

export const processRunExtrRuleByDoc = async docId => {
  let dataRes = null;
  const docData = await DocDataServices.getDocDataInfo(docId);
  const extractedContent = JSON.parse(docData.extr_ctnt);
  const allExtrRule = await DocFieldServices.getParentChildDocFields(docData.doc_tp_id, false, 'N');
  const currentExtrRule = allExtrRule.filter(item => item.child_fields.length || item.dex_extr_rule.length);
  dataRes = ExecuteExtrRuleServices.runExtrRuleByDoc(extractedContent, currentExtrRule).catch(err => console.log(err));
  return dataRes;
};

export default router;
