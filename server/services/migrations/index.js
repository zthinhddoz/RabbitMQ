import { Router } from 'express';
import MigrationServices from './MigrationServices';
import { customRes } from '~/utils/commonFuncs';
import keycloak from '../shared/middleWare/checkSSO';

const router = Router();

router.post('/add-extr-default-to-template', keycloak.protect(), async (req, res, next) => {
  const dataRes = await MigrationServices.addExtrTypeToTmplt().catch(err => next(err));
  customRes(req, res, next, dataRes);
});

export default router;
