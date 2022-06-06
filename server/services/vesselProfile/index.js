import { Router } from 'express';
import logger from '~/shared/logger';
import { customRes } from '../utils/commonFuncs';
import AppConstants from '../utils/constants';
import ConvertCsvService from './convertCsvService';
import FrameTableSercive from './frameTableService';
import LightWeightSercive from './lightWeightService';
import { moveFileFileFromMiddlewareToOther } from '~/utils/commonFuncs';
import { log } from 'console';
const uploadDoc = require('../shared/middleWare/uploadDoc');
const fs = require('fs');
const axios = require('axios');
const router = Router();

router.post('/process-cvp', async (req, res, next) => {
  try {
    const listFileUploaded = req.body.data;
    let cvpData = '';
    let ftData = '';
    let lwData = '';
    if (listFileUploaded) {
      for(let fileData of listFileUploaded) {
        if (fileData.type === 'CVP') {
          try {
            const splitPath = fileData.path.split('/');
            const folderPath = `file/${splitPath[3]}/${splitPath[4]}`
            cvpData = fs.readFileSync(folderPath, 'utf8');
          } catch (err) {
            console.error(err);
          }
        } else {
          try {
            // Call pre-process to convert csv file
            const preProcessRes = await axios.post(`${process.env.MAIN_CORE}${AppConstants.CORE_API.RUN_PRE_PROCESS}`, {file_url: fileData.path});
            let csvData = '';
            if (preProcessRes && preProcessRes.status === 200) {
              const dataRoot = preProcessRes.data.words_pdf;
              for (let page = 0; page < dataRoot.length; page++) {
                const lineWords = await ConvertCsvService.groupWordsToLines(dataRoot[page]);
                const sentences = await ConvertCsvService.createSentences(lineWords);
                const result = await ConvertCsvService.processToCsv(sentences);
                csvData += result;
              }
            } else {
              throw new Error();
            }
            // Write file
            await fs.mkdirSync('file/vessel_profiles', { recursive: true });
            const fileNameTime = new Date().getTime();
            fs.writeFile(`file/vessel_profiles/${fileNameTime}.csv`, csvData, err => {
              if (err) {
                console.error(err);
              }
            });
            // Run business logic
            if (fileData.type === 'Frame Table') {
              ftData = await FrameTableSercive.getFrameTableData(csvData);
            } else if (fileData.type === 'Light Weight Table') {
              lwData = await LightWeightSercive.getLightWeightData(csvData);
            }
          } catch (error) {
            console.log(error);
          }
        }
      }
      if (ftData) {
        cvpData = cvpData.replace('Frame List=+', ftData);
      }
      if (lwData) {
        cvpData = cvpData.replace('Light Ship=+', lwData);
      }
      return res.status(200).json({ result: cvpData.split('\n') });
    }
  } catch (err) {
    console.log(err);
    throw new Error('Calling api failed');
  }
});
router.post('/upload-file', uploadDoc, async (req, res) => {
  try {
    const path = await moveFileFileFromMiddlewareToOther(req.file.originalname,'', 'vessel_profiles');
    return res.status(200).json({ type: req.body.file_type, path: path });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ errorCode });
  }
});
export default router;
