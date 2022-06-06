import { Router } from 'express';
import BPServices, { getOptionsHeaderBP, toCamelCase } from './BPServices';
const router = Router();
import keycloak from '../shared/middleWare/checkSSO';

const successStatus = 200;

router.post('/get-menu', keycloak.protect(), async (req, res, next) => {
  const { usrId } = req.body;
  const projectInfo = await BPServices.getProjectByName().catch(err => next(err));
  const dataRes = await BPServices.getMenuAuth(usrId, projectInfo.pjt_id || null).catch(err => next(err));
  return res.status(successStatus).json(dataRes);
});

router.post('/get-btn', keycloak.protect(), async (req, res, next) => {
  const { mnuPgmUrl, usrId } = req.body;
  const projectInfo = await BPServices.getProjectByName().catch(err => next(err));
  const dataRes = await BPServices.getBtnAuth(mnuPgmUrl, usrId, projectInfo.pjt_id || null).catch(err => next(err));
  const result = [];
  if (dataRes.length > 0) {
    dataRes.forEach(item => {
      const btn = { BTN_NO: item.btn_no };
      result.push(btn);
    });
  }
  return res.status(successStatus).json(result);
});

router.get('/get-all-com', keycloak.protect(), async (req, res, next) => {
  const dataRes = await BPServices.getAllCompanies().catch(err => next(err));
  const result = toCamelCase(dataRes);
  return res.status(successStatus).json({ comList: result });
});

router.get('/get-user-info', keycloak.protect(), async (req, res, next) => {
  const { userId } = req.query;
  const dataRes = await BPServices.getUserInfo(userId).catch(err => next(err));
  return res.status(successStatus).json(dataRes);
});

router.post('/save-synchronize-data', async (req, res, next) => {
  const { data } = req.body;
  await BPServices.processSaveData(data).catch(err => next(err));
  return res.status(successStatus).json({ sts_cd: 200 });
});

export default router;
