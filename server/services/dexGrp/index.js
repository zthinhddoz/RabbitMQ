import { Router } from 'express';
import DexGroupServices from './DexGroupsServices';
import { customRes } from '~/utils/commonFuncs';
import keycloak from '../shared/middleWare/checkSSO';

const router = Router();

router.get('/get-all', keycloak.protect(), async (req, res, next) => {
  const dataRes = await DexGroupServices.getAllDexGroup().catch(err => next(err));
  customRes(req, res, next, dataRes);
});

router.post('/create', keycloak.protect(), async (req, res, next) => {
    const { groupVal } = req.body;
    const dataRes = await DexGroupServices.createDexGroup(groupVal).catch(err => next(err));
    customRes(req, res, next, dataRes);
});

export default router;
