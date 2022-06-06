import { Router } from 'express';
import fs from 'fs';
import OtherAPIServices from './OtherAPIServices';
import ExtractionServices from '../extraction/ExtractionServices';
import { moveFileDownloadFromMiddleWareToInput } from '~/utils/commonFuncs';
import LocationServices from '../locations/LocationServices';
import { customRes } from '~/utils/commonFuncs';
const uploadDoc = require('../shared/middleWare/uploadDoc');

const router = Router();

router.get('/get-docs-from-date', async (req, res, next) => {
  const { date_from, date_to, co_cd, loc_cd, doc_tp_id, usr_id } = req.query;
  if (!co_cd || !loc_cd || !doc_tp_id || !usr_id || !date_from) next(new Error('Invalid Params!!!'));
  const dataRes = await OtherAPIServices.getListDocInfos(co_cd, loc_cd, doc_tp_id, usr_id, date_from, date_to).catch((err) => next(err));
  customRes(req, res, next, dataRes);
});

router.post('/upload-extract-doc', uploadDoc, async (req, res, next) => {
  const docData = req.body;
  try {
    const originalFileName = req.file.originalname;
    const result = await LocationServices.getLocations([], { loc_id: docData.com_doc_id }).catch((err) => next(err));
    const locationDetail = result[0].dataValues;
    docData.urlFolder = `${locationDetail.fol_loc_url}/Output/`;
    docData.co_cd = locationDetail.co_cd;
    docData.loc_cd = locationDetail.loc_cd;
    docData.doc_tp_id = locationDetail.doc_tp_id;
    docData.loc_id = docData.com_doc_id;
    docData.root_nm = originalFileName;
    // Get file size
    const stats = fs.statSync(`file/${docData.root_nm}`);
    const fileSizeInBytes = stats.size;
    docData.file_sz = parseInt(fileSizeInBytes / 1000, 10);
    await moveFileDownloadFromMiddleWareToInput(originalFileName, docData.urlFolder.replace('Output', 'Input'));
    const dataRes = await ExtractionServices.saveExtractDocument(docData, originalFileName);
    customRes(req, res, next, dataRes);
  } catch (err) {
    next(err);
  }
});

router.get('/get-doc-data', async (req, res, next) => {
  const { doc_id, is_origin } = req.query;
  if (!doc_id) next(new Error('Invalid Params!!!'));
  const dataRes = await OtherAPIServices.getDocData(doc_id, is_origin).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.get('/get-com-doc-id', async (req, res, next) => {
  const { co_cd, loc_cd } = req.query;
  if (!co_cd || !loc_cd) next(new Error('Invalid Params!!!'));
  const dataRes = await OtherAPIServices.getLocData(co_cd, loc_cd).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

export default router;
