import { Router } from 'express';
import DocDataServices from './DocDataServices';
import model from '~/shared/models';
import { customRes } from '~/utils/commonFuncs';
import logger from '~/shared/logger';
import keycloak from '../shared/middleWare/checkSSO';
import Excel from 'exceljs';
import * as path from 'path';
import fs from 'fs';
const router = Router();

router.get('/get-renderable-data/:docId', keycloak.protect(), async (req, res, next) => {
  const { docId } = req.params;
  const dataRes = await DocDataServices.getRenderableData(docId).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.get('/get-by-doc-name', keycloak.protect(), async (req, res, next) => {
  const { docName } = req.query;
  const dataRes = await DocDataServices.getDocDataInfoByDocName(docName).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.get('/get-doc-same-parent/:prntFileNm', async (req, res, next) => {
  const dataRes = await DocDataServices.getDocDataSameParent(req.params.prntFileNm).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.get('/latest-doc-by-tmpl-id', keycloak.protect(), async (req, res, next) => {
  const { tmpltId } = req.query;
  const dataRes = await DocDataServices.getLatestDocByTmplId(tmpltId).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.post('/update-tmpl-id-doc', keycloak.protect(), async (req, res, next) => {
  const { docId, templateId, usrId } = req.body;
  console.log('Doc', docId, templateId);
  const dataRes = await DocDataServices.updateTemplateIdForDoc(docId, templateId, usrId).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

/**
 * Sample API to get doc file data
 * TODO: Re-Handle
 */

router.get('/get-dex-doc', keycloak.protect(), async (req, res, next) => {
  const dataRes = await DocDataServices.getExtractedDocList(req.query).catch(err => {
    logger.error(err);
    next(err);
  });
  customRes(req, res, next, dataRes);
});

router.post('/add-dex-doc', keycloak.protect(), async (req, res, next) => {
  try {
    model.DexDoc.findAll({
      limit: 1,
      order: [['cre_dt', 'DESC']],
    }).then(async function(lastDoc) {
      const lastId = lastDoc.length > 0 ? lastDoc[0].doc_id : 0;
      let docId = Number(lastId) + 1;
      docId = docId.toString();
      req.body.doc.doc_id = docId;
      await DocDataServices.addDexdoc(req.body.doc);
      res.status(200).json({ docId, message: 'Insert document successful' });
    });
  } catch (error) {
    next(error);
  }
});

router.post('/update-biz-data', keycloak.protect(), async (req, res, next) => {
  const { bizData } = req.body;
  const { docId } = req.query;
  const dataRes = await DocDataServices.updateBizData(docId, bizData).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.get('/:docId', keycloak.protect(), async (req, res, next) => {
  const { docId } = req.params;
  const dataRes = await DocDataServices.getDocDataInfo(docId).catch(err => next(err));
  if (dataRes) return res.status(200).json(dataRes);
  return next();
});

router.post('/update-doc-status', keycloak.protect(), async (req, res, next) => {
  const { docId, status } = req.body;
  const dataRes = await DocDataServices.updateDocStatus(docId, status).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

/**
 * This func is used to update status and issue for document
 * docId: String
 * status: String
 * issueList: array
 */
router.post('/update-issue-status', keycloak.protect(), async (req, res, next) => {
  const { docId, status, issueList, replaceOldIssue, isBiz } = req.body;
  const dataRes = await DocDataServices.updateIssueStatusDoc(docId, status, issueList, replaceOldIssue, isBiz).catch(
    err => next(err),
  );
  customRes(req, res, next, dataRes);
});

router.post('/update-extracted-data', keycloak.protect(), async (req, res, next) => {
  const { docId, extractedData } = req.body;
  const dataRes = await DocDataServices.updateDocExtracData(docId, null, extractedData, null).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.put('/save-extraction-data', keycloak.protect(), async (req, res, next) => {
  const reqBody = req.body;
  const docId = reqBody ? reqBody.doc_id : null;
  const extractedData = reqBody ? reqBody.data : null;
  const docTypeId = reqBody ? reqBody.doc_tp_id : null;
  if (!docId || !extractedData || !docTypeId) {
    return res.status(500).json({ sts_cd: 500, msg: 'Invalid params' });
  }
  const dataRes = await DocDataServices.saveExtractionData(extractedData, docTypeId, docId).catch(err => next(err));
  customRes(req, res, next, dataRes);
});


router.post('/export-file-xls', async (req, res, next) => {
  const Excel = require('exceljs');
  try {
    const { data } = req.body;
    const { docInfo, dataList, normalTextData } = data;

    let docName = docInfo.adm_doc_tp.doc_nm;
    let file_name = `${docInfo.prnt_doc_id ? docInfo.prnt_doc_id : docInfo.doc_id}_${docName}_${Date.now().toString()}.xlsx`;
    let workSheets = [];

    if (normalTextData.length > 0) {
      let headers = [
        { header: 'Field Name', key: 'field_name', width: 15 },
        { header: 'Field Data', key: 'field_data', width: 30 },
      ];

      let rows = [];
      for (let i = 0; i < normalTextData.length; i++) {
        let obj = {};
        obj[headers[0].key] = normalTextData[i].field_name;
        obj[headers[1].key] = normalTextData[i].field_data;
        rows.push(obj);
      }
      workSheets.push({ docName: docName, headers: headers, rows: rows });
    }

    if (Object.keys(dataList).length > 0) {
      const keys = Object.keys(dataList);
      docName = keys[0] !== 'UN-KNOWN' ? keys[0] : docName;
      const arrDataList = dataList[keys[0]];
      const maxLengths = arrDataList.reduce(function(prev, current) {
        return prev.col_data.length > current.col_data.length ? prev : current;
      }).col_data.length;

      let headers = arrDataList.map(function(item) {
        return {
          header: item.col_name,
          key: item.col_name.toLowerCase().replace(/ /g, '_'),
          width: 15,
        };
      });

      let rows = [];
      for (let i = 0; i < maxLengths; i++) {
        let obj = {};
        for (let j = 0; j < headers.length; j++) {
          // Notes: When any col_data of col_name less than maxlength. We will set empty otherwise value of it.
          let value = i <= arrDataList[j].col_data.length ? arrDataList[j].col_data[i] : '';
          obj[headers[j].key] = value;
        }
        rows.push(obj);
      }
      workSheets.push({ docName: docName, headers: headers, rows: rows });
    }

    // File path locate.
    const fileFolder = 'file';
    const folderPath = `${fileFolder}/excels`;
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    const file_path = path.join(folderPath, file_name);

    // Stream Excel
    let workbook = new Excel.Workbook();
    for(let i = 0; i < workSheets.length; i++ ) {
      const { docName, headers, rows} = workSheets[i];
      let worksheet_obj = {};
      worksheet_obj[docName] = docName ? await workbook.addWorksheet(docName) : 'N/A';
      worksheet_obj[docName].columns = headers;
      await worksheet_obj[docName].addRows(rows);
    }
    await workbook.xlsx.writeFile(file_path);

    return res
      .status(200)
      .json({ message: 'Export successful', file_name: file_name, file_path: file_path.replace('file/', '') });
  } catch (error) {
    next(error);
  }
});

export default router;
