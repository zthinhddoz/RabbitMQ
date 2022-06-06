import { Router } from 'express';
import DocFieldServices from './DocFieldServices';
import keycloak from '../shared/middleWare/checkSSO';

const router = Router();
const verify = require('../shared/middleWare/verifyToken');

/**
 * This is sample API to return error with errorCode
 */
router.get('/test/alway-err-with-err-code-2', keycloak.protect(), (req, res, next) => {
  let dataRes = null;
  try {
    dataRes = DocFieldServices.otherSampleErrorMethod(req, res, next);
  } catch (error) {
    return next(error);
  }
  return res.status(200).json(dataRes); // It'll never be called
});
router.get('/test/alway-err-with-err-code', keycloak.protect(), (req, res) => {
  const dataRes = DocFieldServices.sampleErrorMethod();
  return res.status(200).json(dataRes); // It'll never be called
});

/**
 * Sample API to get doc field list
 * TODO: Re-Handle
 * router.get('/:docTypeId', verify, async (req, res) => {
 */
router.get('/get-field-by-doc-com', keycloak.protect(), async (req, res, next) => {
  const { docId, docTypeId } = req.query;
  const dataRes = await DocFieldServices.getFieldByComDoc(docId, docTypeId).catch(err => next(err));
  return res.status(200).json(dataRes);
});

router.get('/:docTypeId', keycloak.protect(), async (req, res, next) => {
  const { docTypeId } = req.params;
  const dataRes = await DocFieldServices.getDocTypeFieldList(docTypeId).catch(err => next(err));
  return res.status(200).json(dataRes);
});

router.get('/parent-child/:docTypeId', keycloak.protect(), async (req, res, next) => {
  const { docTypeId } = req.params;
  const dataRes = await DocFieldServices.getParentChildDocFields(docTypeId).catch(err => next(err));
  return res.status(200).json(dataRes);
});

export default router;