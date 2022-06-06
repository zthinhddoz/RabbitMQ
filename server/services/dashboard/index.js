import { Router } from 'express';

// import model from '~/shared/models';
// import genareteNewId from "../utils/generateNewId";
import DashboardServices from './DashboardServices';
import { customRes } from '../utils/commonFuncs';
import keycloak from '../shared/middleWare/checkSSO';

const router = Router();

router.get('/all-templates', keycloak.protect(), async (req, res, next) => {
  const dataRes = await DashboardServices.getAllTemplates(req.query).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.get('/all-locs', keycloak.protect(), async (req, res, next) => {
  const dataRes = await DashboardServices.getAllLocs(req.query).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.get('/doc-proc-month', keycloak.protect(), async (req, res, next) => {
  const dataRes = await DashboardServices.getDocsProByMonth(req.query).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.get('/docs-by-comp', keycloak.protect(), async (req, res, next) => {
  const dataRes = await DashboardServices.getAllDocsByComp(req.query).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.get('/docs-by-loc', keycloak.protect(), async (req, res, next) => {
  const dataRes = await DashboardServices.getAllDocsByLoc(req.query).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.get('/distri-docs', keycloak.protect(), async (req, res, next) => {
  const dataRes = await DashboardServices.getDistributeOfDoc(req.query).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.get('/distri-docs-details', keycloak.protect(), async (req, res, next) => {
  const dataRes = await DashboardServices.getDistributeOfDocDetails(req.query).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.get('/doc-pages-process', keycloak.protect(), async (req, res, next) => {
  const dataRes = await DashboardServices.getDocPageProc(req.query).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.get('/total-doc-processed', keycloak.protect(), async (req, res, next) => {
  const dataRes = await DashboardServices.getAllDocProcessed(req.query).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.get('/total-page-processed', keycloak.protect(), async (req, res, next) => {
  const dataRes = await DashboardServices.getAllPageProcessed(req.query).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.get('/doc-by-status', keycloak.protect(), async (req, res, next) => {
  const dataRes = await DashboardServices.getDocsByStatus(req.query).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.get('/docs-success', keycloak.protect(), async (req, res, next) => {
  const dataRes = await DashboardServices.getDocsSuccess(req.query).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.get('/process-time-avg', keycloak.protect(), async (req, res, next) => {
  const dataRes = await DashboardServices.getProcTimeAvg(req.query).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.get('/annotate-time-avg', keycloak.protect(), async (req, res, next) => {
  const dataRes = await DashboardServices.getAnnoTimeAvg(req.query).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.get('/process-time-avg-month', keycloak.protect(), async (req, res, next) => {
  const dataRes = await DashboardServices.getProcessTimeByMonth(req.query).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.get('/annotate-time-avg-month', keycloak.protect(), async (req, res, next) => {
  const dataRes = await DashboardServices.getAnnotateTimeByMonth(req.query).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.get('/get-last-three-years', keycloak.protect(), async (req, res, next) => {
  const dataRes = await DashboardServices.getLastThreeYears(req.query).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

export default router;
