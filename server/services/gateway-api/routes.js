import { Router } from 'express';
import logger from '~/shared/logger';
import httpLogger from '~/shared/httpLogger';
import { getReqErrorInfo } from '~/utils/commonFuncs';

// import helloWorld from '~/__example__/service-ex1';
import authentication from '~/authentication';
// import document from '~/document';
// import bizRule from '~/bizRule';
// import commonData from '~/common-data';
// import docField from '~/docField';
// import docData from '~/docData';
// import docTmplt from '~/docTmplt';
import auth from '~/auth';
// import BPApi from '~/BPApi';
// import setupComDoc from '~/setupComDoc';
// import locations from '~/locations';
// import specialRule from '~/specialRule';
// import uploadFile from '~/uploadFile';
// import chromeExtApi from '~/chromeExtApi';
// import Template from '~/template';
// import Transaction from '~/transaction';
import CoreServiceAPI from '~/CoreServiceAPI';
// import DexGroup from '~/dexGrp';
// import extraction from '~/extraction';
// import Dashboard from '~/dashboard';
// import DynamicType from '~/dynamicType';
// import Migration from '~/migrations';
// import ExtractionRule from '~/extractionRule';
// import OtherAPI from '~/otherAPIs';
// import CoreAdapter from '~/coreAdapter';
// import manageApi from '~/manageApi';
import ThirdPartyData from '~/third-party-data';
// import UploadVesselProfile from '~/uploadVesselProfile';
// import BatchJobScheduler from '~/batchJobScheduler';
// import VesselProfile from '~/vesselProfile';

const router = Router();

router.use(httpLogger);

router.get('/', (req, res) => {
  res.send('Good Job');
});

router.post('/save-track-log', (req, res) => {
  const logType = req.query.type;
  const service = req.query.type || '';
  logger.info(`${service} Req to save tracklog for data: ${JSON.stringify(req.body)}`);
  if (logType === 'error') {
    logger.error(`${service} ERROR: Req to save tracklog for data: ${JSON.stringify(req.body)}`);
  }
  return res.status(200).send('Log save!!!');
});

// router.use('/dashboard', Dashboard);
// router.use('/hello-world', helloWorld);
router.use('/authentication', authentication);
router.use('/auth', auth);
// router.use('/bp-api', BPApi);

// router.use('/location-management', locations);
// router.use('/common-data', commonData);
// router.use('/doc-setting', document);
// router.use('/setup-special-rule', specialRule);
// router.use('/upload-file', uploadFile);
// router.use('/template', Template);

// router.use('/setup-com-doc', setupComDoc);
// Get list fields
//router.use('/doc-field', docField);
// Get Data Dex Doc
// router.use('/doc-data', docData);
// Get Biz Rule
// router.use('/biz-rule', bizRule);
// router.use('/doc-tmplt', docTmplt);
router.use('/api/v1', CoreServiceAPI);
// router.use('/api/xtn', chromeExtApi);
// router.use('/api/others/v1', OtherAPI);
// router.use('/extraction', extraction);
// router.use('/transaction', Transaction);
// router.use('/dex-grp', DexGroup);
// router.use('/dynamic-type', DynamicType);
// router.use('/migrate/', Migration);
// router.use('/extr-rule/', ExtractionRule);
// router.use('/core-services/', CoreAdapter);
// router.use('/api-manage', manageApi);
router.use('/third-party-data/', ThirdPartyData);
// router.use('/upload-vessel-profile/', UploadVesselProfile);
// router.use('/batch-job-services', BatchJobScheduler);
// router.use('/vessel-profile-services', VesselProfile);
/**
 * Error handler if pointing wrong endpoint
 * You must map your end-point before these lines
 */
router.use('*', (req, res, next) => {
  const error = new Error(`${req.ip} tried to access ${req.originalUrl}`);
  error.statusCode = 301;
  next(error);
});

router.use((error, req, res, next) => {
  logger.error(getReqErrorInfo(req));
  logger.error(error);
  if (!error.statusCode) error.statusCode = 500;
  if (error.statusCode === 301) {
    // return res.status(301).redirect('/not-found');
    return res.status(301).json({ error: error.message });
  }
  return res.status(error.statusCode).json({ error: error.toString() });
});

export default router;
