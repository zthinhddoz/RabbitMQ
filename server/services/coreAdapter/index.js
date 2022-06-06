import { Router } from 'express';
import keycloak from '../shared/middleWare/checkSSO';
import CoreAdapterServices from './CoreAdapter';
const router = Router();
const verify = require('../shared/middleWare/verifyToken');
import fs from 'fs';
const FormData = require('form-data');
const originFolder = 'file';

router.get('/get-core-system-nm', keycloak.protect(), async (req, res, next) => {
  const { docType } = req.query;
  try {
    const coreType = await CoreAdapterServices.getCoreSystemName(docType);
    res.json(coreType);
  } catch (err) {
    next(err);
  }
});

router.post('/matching', keycloak.protect(), async (req, res, next) => {
  const coreDataReq = req.body;
  const docTypeId = coreDataReq.doc_tp_id;
  try {
    const coreMatching = await CoreAdapterServices.runMatching(coreDataReq, docTypeId);
    res.json(coreMatching);
  } catch (err) {
    next(err);
  }
});

router.post('/submit-template', keycloak.protect(), async (req, res, next) => {
  const coreDataReq = req.body;
  const docTypeId = coreDataReq.doc_tp_id;
  try {
    const coreDetectKey = await CoreAdapterServices.runSubmitTemplate(coreDataReq, docTypeId);
    res.json(coreDetectKey);
  } catch (err) {
    next(err);
  }
});

router.post('/extract', keycloak.protect(), async (req, res, next) => {
  const coreDataReq = req.body;
  const docTypeId = coreDataReq.doc_tp_id;
  try {
    const coreExtractRes = await CoreAdapterServices.runExtract(coreDataReq, docTypeId);
    res.json(coreExtractRes);
  } catch (err) {
    next(err);
  }
});

router.post('/ocr/text', keycloak.protect(), async (req, res, next) => {
  const coreDataReq = req.body;
  const docTypeId = coreDataReq.doc_tp_id;
  try {
    const coreExtractRes = await CoreAdapterServices.runOcrText(coreDataReq, docTypeId);
    res.json(coreExtractRes);
  } catch (err) {
    next(err);
  }
});

router.post('/excel-info', async (req, res) => {
  try {
    const { file_url } = req.body;
    const payload = new FormData();
    const url = new URL(file_url);
    payload.append('file', fs.createReadStream(`${originFolder}/${url.pathname}`));
    const coreExcelRes = await CoreAdapterServices.runExcelInfo(payload);
    return res.status(200).json(coreExcelRes);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: error, sts_cd: 500 });
  }
});

export default router;
