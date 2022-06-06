import { Router } from 'express';
import logger from '~/shared/logger';
import LocationServices from '../locations/LocationServices';
import FtpUploadMethod from '../locations/FtpUploadMethod';
import { customRes } from '../utils/commonFuncs';
import AppConstants from '~/utils/constants';
import BATCH_JOB_CONFIG from '~/utils/batchJobConfig'
import getEmailAttachment from '../locations/EmailUploadMethod';
import ExtractionServices from '../extraction/ExtractionServices';
import BatchJobServices from './BatchJobServices';
import fs from 'fs';
const router = Router();
const cron = require('node-cron');
import keycloak from '../shared/middleWare/checkSSO';
import model from '~/shared/models';

const ftpMethod = cron.schedule(
  BATCH_JOB_CONFIG.SETUP_TIME.FTP_METHOD,
  async () => {
    try {
      const startTime = new Date().toLocaleString();
      logger.info(`Start time batch job FTP: ${startTime}`);
      const uploadMethodData = await LocationServices.getUploadData(['locationId'], {
        usd_mzd_cd: 'F',
        run_bg_flg: 'Y',
      });
      if (uploadMethodData.length > 0) {
        for await (const element of uploadMethodData) {
          const uploadPayload = element.dataValues.locationId.dataValues;
          uploadPayload.urlFolder = `${uploadPayload.fol_loc_url}/Output`;
          const dataAllMethod = await LocationServices.getUploadData(['locationId'], { loc_id: uploadPayload.loc_id });
          let dataRes = null;
          dataRes = await FtpUploadMethod.downloadFileFtpServer(dataAllMethod, uploadPayload);
          logger.info(dataRes);
        }
      }
      const endTime = new Date().toLocaleString();
      logger.info(`End time batch job FTP  ${endTime}`);
    } catch (error) {
      const endTime = new Date().toLocaleString();
      logger.info(`Error: ${error}`);
      logger.info(`End time batch job FTP  ${endTime}`);
    }
  },
  {
    scheduled: false,
  },
);

const emailMethod = cron.schedule(
  BATCH_JOB_CONFIG.SETUP_TIME.EMAIL_METHOD,
  async () => {
    try {
      const startTime = new Date().toLocaleString();
      logger.info(`Start time batch job Email: ${startTime}`);
      const uploadMethodData = await LocationServices.getUploadData(['locationId'], {
        usd_mzd_cd: 'E',
        run_bg_flg: 'Y',
      });
      if (uploadMethodData.length > 0) {
        for await (const element of uploadMethodData) {
          const uploadPayload = element.dataValues.locationId.dataValues;
          uploadPayload.urlFolder = `${uploadPayload.fol_loc_url}/Output`;
          const dataAllMethod = await LocationServices.getUploadData(['locationId'], { loc_id: uploadPayload.loc_id });
          const attachments = await getEmailAttachment({
            emailAddress: AppConstants.EMAIL_ATTACHMENT.EMAIL_ADDRESS,
            emailPassword: AppConstants.EMAIL_ATTACHMENT.EMAIL_PASSCODE,
            mailBox: AppConstants.EMAIL_ATTACHMENT.MAILBOX,
            dataAllMethod,
          });
          let logs = [];
          for (let i = 0, len = attachments.length; i < len; i++) {
            try {
              const fileName = attachments[i];
              const filePath = `${AppConstants.LOCATION_DOC_FILE}/${uploadPayload.urlFolder.replace(
                'Output',
                'Input',
              )}/${fileName}`;
              const fileSize = (fs.statSync(filePath).size / 1024).toFixed(1);
              const dataRes = await ExtractionServices.saveExtractDocument(
                { ...uploadPayload, root_nm: fileName, file_sz: fileSize },
                fileName,
              );
              if (dataRes.status === 'N' && dataRes.extractJson == null) {
                logs.push({ dataRes: dataRes, message: 'Matching FAILED' });
              }
              logger.info(fileName);
            } catch (err) {
              next(err);
              continue;
            }
          }
        }
      }
      const endTime = new Date().toLocaleString();
      logger.info(`End time back job Email: ${endTime}`);
    } catch (error) {
      const endTime = new Date().toLocaleString();
      logger.info(`Error: ${error}`);
      logger.info(`End time batch job Email: ${endTime}`);
    }
  },
  {
    scheduled: false,
  },
);
router.post('/update-flag-batchjob', async (req, res, next) => {
  const data = req.body;
  const dataRes = BatchJobServices.updateFlagBatchJob(data).catch(err => next(err));
  customRes(req, res, next, dataRes);
});
export default router;
