import { Router } from 'express';
import ExtractionServices from './ExtractionServices';
import { customRes } from '~/utils/commonFuncs';
const uploadDoc = require('../shared/middleWare/uploadDoc');

const router = Router();

router.post('/extract-doc', async (req, res, next) => {
  const { extractData, reExtract, updateTmplt } = req.body;
  const dataRes = await ExtractionServices.extractDocument(extractData, reExtract, updateTmplt).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.post('/smart-link', uploadDoc, async (req, res, next) => {
  const docData = req.body;
  const originalFileName = req.file.originalname;
  const dataRes = await ExtractionServices.saveExtractDocument(docData, originalFileName).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

export default router;
