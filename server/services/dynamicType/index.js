import { Router } from 'express';
import { customRes } from '../utils/commonFuncs';
import DynamicTypeService from './DynamicTypeService';
import keycloak from '../shared/middleWare/checkSSO';

const router = Router();

router.get('/get-dynamic-type', keycloak.protect(), async (req, res, next) => {
  const dataRes = await DynamicTypeService.getDynamicType(req.query).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.post('/add-dynamic-type', keycloak.protect(), async (req, res, next) => {
  const dataRes = await DynamicTypeService.addDynamicType(req.body).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.put('/update-dynamic-type', keycloak.protect(), async (req, res, next) => {
  const dataRes = await DynamicTypeService.updateDynamicType(req.body).catch(err => next(err));
  customRes(req, res, next, dataRes);
});

export default router;
