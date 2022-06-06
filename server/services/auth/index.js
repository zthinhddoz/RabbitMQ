import { Router } from 'express';
import verifyToken from '../shared/middleWare/verifyToken';
import AppConstants from '../utils/constants';
import logger from '~/shared/logger';

const axios = require('axios');

const router = Router();

const getDecryptToken = (encryptToken, isEncrypted) => {
  let decryptToken = '';
  if (isEncrypted) {
    if (encryptToken) {
      let startPos = 0;
      let endPos = 9;
      while (endPos < encryptToken.length) {
        decryptToken += encryptToken.substring(startPos, endPos);
        startPos += 11;
        endPos += 11;
      }
      if (startPos < encryptToken.length) {
        decryptToken += encryptToken.substring(startPos);
      }
    }
  } else {
    decryptToken = encryptToken;
  }
  return decryptToken;
};
router.post('/login-bp', async (req, res, next) => {
  const encryptToken = req.body.token;
  const { isEncrypted } = req.body;
  const decryptToken = getDecryptToken(encryptToken, isEncrypted);

  try {
    const options = {
      headers: {
        Authorization: decryptToken,
      },
    };
    const urlReq = process.env.BP_URL + AppConstants.BP_API.USR_INFO;
    axios
      .get(urlReq, options)
      .then(result => {
        const resData = result.data;
        if (resData) {
          return res.status(200).json({
            usrInfo: resData.usrInfo,
            usrRoleNm: resData.usrRoleNm,
            token: decryptToken,
            message: 'Getting Info from BP success',
          });
        }
        throw new Error('Login BP failed!!!');
      })
      .catch(err => {
        logger.error(err);
        res.status(400).json({ message: 'Login failed' });
      });
  } catch (error) {
    next(error);
  }
});

export default router;
