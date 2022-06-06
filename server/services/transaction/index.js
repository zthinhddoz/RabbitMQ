import { Router } from 'express';
import TransactionServices from './TransactionServices';
import DocDataServices from '../docData/DocDataServices';
import AppConstants from '~/utils/constants';
import keycloak from '../shared/middleWare/checkSSO';

const router = Router();

router.post('/save-transaction', keycloak.protect(), async (req, res, next) => {
  const { transType } = req.query;
  const dataRes = await TransactionServices.saveTransaction(req.body).catch(err => next(err));
  if (transType === 'doc') {
    await DocDataServices.updateDocStatus(req.body.transTypeId, AppConstants.DOC_STATUS.VERIFY, req.body.userId).catch(err => next(err),);
  }
  if (dataRes) {
    return res.status(200).json(dataRes);
  }
  return next();
});

router.get('/transaction-history/:docId', keycloak.protect(), async (req, res, next) => {
    const { docId } = req.params;
    const dataRes = await TransactionServices.getTransactionHistory(docId).catch(err => next(err));
    if (dataRes) return res.status(200).json(dataRes);
    return next();
});

export default router;