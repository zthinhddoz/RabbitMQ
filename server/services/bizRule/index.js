/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable camelcase */
/* eslint-disable arrow-parens */
import { Router } from 'express';
import { customRes } from '../utils/commonFuncs';
import * as ExecuteBizRuleService from './ExecuteBizRuleService';
import DocDataServices from '../docData/DocDataServices';
import BizRuleService from './BizRuleService';
import { getRuleAndOutputCompare } from './BizRuleFunctions';
import LocationServices from '../locations/LocationServices';
import SetUpComDocService from '../setupComDoc/SetUpComDocService';
import DocFieldServices from '../docField/DocFieldServices';
import AppConstants from '../utils/constants';
import logger from '~/shared/logger';
import keycloak from '../shared/middleWare/checkSSO';
import { bizDataLogger, bizRunLogger } from './auto-test/biz.test.logger';

const router = Router();

router.get('/all-doc-fld', keycloak.protect(), async (req, res, next) => {
  const dataRes = await DocFieldServices.getDocTypeFieldList(null).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.get('/get-biz-rule', keycloak.protect(), async (req, res, next) => {
  const dataRes = await BizRuleService.getBizLogic({
    adm_co_doc_fld_id: req.query.adm_co_doc_fld_id,
  }).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.get('/biz-rule-by-id', keycloak.protect(), async (req, res, next) => {
  const dataRes = await BizRuleService.getBizLogic({ biz_rule_id: req.query.id }).catch(err => next(err));
  customRes(req, res, next, dataRes[0]);
});

router.put('/update-biz-rule', keycloak.protect(), async (req, res, next) => {
  const updateClause = {
    biz_rule_desc: req.body.biz_rule_desc,
    cond_tp_cd: req.body.cond_tp_cd,
    ord_no: req.body.ord_no,
    cond_ctnt: req.body.cond_ctnt,
    act_ctnt: req.body.act_ctnt,
    upd_usr_id: req.body.upd_usr_id,
  };
  const whereClause = { biz_rule_id: req.body.biz_rule_id };
  const dataRes = await BizRuleService.updateBizLogic(updateClause, whereClause).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.post('/create-biz-rule', keycloak.protect(), async (req, res, next) => {
  const dataRes = await BizRuleService.createBizLogic(req.body).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.put('/change-flag-biz-rule', keycloak.protect(), async (req, res, next) => {
  const updateClause = { delt_flg: req.body.newFlag, upd_usr_id: req.body.upd_usr_id };
  const whereClause = { biz_rule_id: req.body.biz_rule_id };
  const dataRes = await BizRuleService.updateBizLogic(updateClause, whereClause).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.put('/run-copy-biz-rule', keycloak.protect(), async (req, res, next) => {
  const dataRes = await BizRuleService.copyBizLogic(req.body).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.get('/get-rule-field', keycloak.protect(), async (req, res, next) => {
  const dataRes = await SetUpComDocService.getFieldForBizLogic(req.query).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

export const processRunBizRuleByDoc = async docId => {
  let dataRes = null;
  let issueList = [];
  const docData = await DocDataServices.getDocDataInfo(docId).catch(err => logger.error(err));
  if (!docData.file_sz || !docData.dex_tmplt_id) {
    return {};
  }

  if (!docData || !docData.extr_ctnt) {
    dataRes = { error: 'Document has no extracted content!' };
    return dataRes;
  }

  const extractedContent = JSON.parse(docData.extr_ctnt);

  const condition = {
    co_cd: docData.co_cd,
    loc_cd: docData.loc_cd,
    doc_tp_id: docData.doc_tp_id,
  };

  const ruleFields = await SetUpComDocService.getFieldForBizLogic(condition).catch(err => logger.error(err));
  const { ruleFieldsFormatted, outputCompare, allDocTypeFields } = getRuleAndOutputCompare(
    ruleFields,
    extractedContent,
  );

  dataRes = await ExecuteBizRuleService.runBizRuleByDoc(
    extractedContent,
    ruleFieldsFormatted,
    outputCompare,
    allDocTypeFields,
  ).catch(err => {
    // Biz apply failed
    issueList = [AppConstants.DOC_ISSUES_CODE.BF];
    logger.error(err);
  });
  // Get current issue list
  if (dataRes) {
    const fieldHasRule = dataRes.docCompare.filter(field => field.biz_rule.length > 0);
    const numOfFieldsFailBiz = fieldHasRule.filter(field => field.biz_rule.find(rule => rule.error)).length;
    const numOfFieldsHasRule = fieldHasRule.length;
    // Partial biz applied
    if (numOfFieldsFailBiz > 0 && numOfFieldsFailBiz < numOfFieldsHasRule) {
      issueList = [AppConstants.DOC_ISSUES_CODE.PB];
    }
    // All biz are failed
    if (numOfFieldsFailBiz > 0 && numOfFieldsFailBiz === numOfFieldsHasRule) {
      issueList = [AppConstants.DOC_ISSUES_CODE.BF];
    }
  }

  dataRes.issueList = issueList;
  return dataRes;
};

router.get('/all-dex-loc', keycloak.protect(), async (req, res, next) => {
  const dataRes = await LocationServices.getLocationForBizLogic(req).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.get('/run-biz-rule-by-doc', keycloak.protect(), async (req, res, next) => {
  const { docId } = req.query;
  const dataRes = await processRunBizRuleByDoc(docId).catch(err => next(err));
  if (dataRes && dataRes.error) return res.status(400).json({ message: dataRes.error });
  return res.status(200).json(dataRes);
});

router.put('/run-biz-rule-preview', keycloak.protect(), async (req, res, next) => {
  const input = { mainField: req.body.input };
  const output = await ExecuteBizRuleService.runSingleBizRule(input, req.body.bizRule, req.body.extend);
  if (output) {
    const outputReturn = await ExecuteBizRuleService.hanldeExtractExtendOuput(output, req.body.extendOutput);
    customRes(req, res, next, outputReturn);
  }
  return next();
});

router.put('/run-biz-rule-by-field-preview', keycloak.protect(), async (req, res, next) => {
  const allBizRuleByField = await BizRuleService.getBizLogic({
    adm_co_doc_fld_id: req.body.adm_co_doc_fld_id,
  }).catch(err => next(err));

  if (allBizRuleByField) {
    const input = { mainField: req.body.input };
    const output = await ExecuteBizRuleService.runBizRuleByField(input, allBizRuleByField, req.body.extend);
    const outputReturn = await ExecuteBizRuleService.hanldeExtractExtendOuput(output, req.body.extendOutput);
    customRes(req, res, next, outputReturn);
  }
  return next();
});

router.get('/run-biz-rule-auto-test', keycloak.protect(), async (req, res, next) => {
  bizRunLogger.info('-----Starting biz rule auto test-----');
  // Get documents for running biz logic
  const docList = await DocDataServices.getDocList(req.body);
  const dataRes = {};
  if (docList.length) {
    bizRunLogger.info('Get document list successful');
    bizRunLogger.info(`Number of documents: ${docList.length} \n`);
    dataRes.numberOfDocs = docList.length;
    let numOfFailedFields = 0;
    const { co_cd, loc_cd, doc_tp_id } = req.body;
    const condition = { co_cd, loc_cd, doc_tp_id };
    const ruleFields = await SetUpComDocService.getFieldForBizLogic(condition).catch(err => bizRunLogger.error(err));
    const failedFields = [];
    // Run biz logic for all documents
    for (let i = 0; i < docList.length; i++) {
      const extractedContent = JSON.parse(docList[i].extr_ctnt);
      const { ruleFieldsFormatted, outputCompare, allDocTypeFields } = getRuleAndOutputCompare(ruleFields, extractedContent);
      bizRunLogger.info(`Running biz logic for document #${i + 1} with id ${docList[i].doc_id}`);

      // Run biz logic
      const { docCompare } = await ExecuteBizRuleService.runBizRuleByDoc(
        extractedContent,
        ruleFieldsFormatted,
        outputCompare,
        allDocTypeFields,
      ).catch(err => bizRunLogger.error(err));

      // Check the result
      const fieldHasRule = docCompare.filter(field => field.biz_rule.length > 0);
      const fieldsFailBiz = fieldHasRule.filter(field => field.biz_rule.find(rule => rule.error));
      const numOfFieldsFailBiz = fieldsFailBiz.length;
      numOfFailedFields += numOfFieldsFailBiz;
      const numOfFieldsHasRule = fieldHasRule.length;
      bizRunLogger.info(`Document has total ${docCompare.length} fields`);
      bizRunLogger.info(`${numOfFieldsHasRule} fields has biz rule`);
      if (numOfFieldsFailBiz > 0) {
        bizRunLogger.error(`${numOfFieldsFailBiz} fields run biz failed \n`);
        failedFields.push({
          documentNo: i + 1,
          docId: docList[i].doc_id,
          failedFields: fieldsFailBiz,
        });
      } else bizRunLogger.info('All biz rule run successful\n');
      bizDataLogger.info({
        documentNo: i + 1,
        docId: docList[i].doc_id,
        docCompare,
      });
    }
    dataRes.numOfFailedFields = numOfFailedFields;
    if (failedFields.length === 0) dataRes.status = 'All rules run successfully';
    else {
      dataRes.failedFields = failedFields;
      dataRes.status = 'Encounter error in the biz rule process';
    }
  } else {
    dataRes.message = 'No document found with current condition!';
  }
  bizRunLogger.info('-----Biz rule auto test complete-----\n\n\n\n');
  dataRes.message = 'Biz auto test complete, see logs file for more details';
  customRes(req, res, next, dataRes);
});

export default router;
