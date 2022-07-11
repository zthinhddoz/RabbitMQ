import { Router } from 'express';
import { log } from 'console';
import logger from '~/shared/logger';
import { customRes } from '../utils/commonFuncs';
import AppConstants from '../utils/constants';
import ConvertCsvService from './convertCsvService';
import FrameTableSercive from './frameTableService';
import LightWeightSercive from './lightWeightService';
import BonjeanSercive from './bonjeanService';
import KnTableService from './knTableService';
import TankArrangementService from './tankArrangementService';
import VolumnSercive from './VolumnService copy';
import SfbmSercive from './sfbmService';
import HydroSercive from './hydroService';
import { moveFileFileFromMiddlewareToOther } from '~/utils/commonFuncs';
const fs = require('fs');
const axios = require('axios');
const uploadDoc = require('../shared/middleWare/uploadDoc');
const router = Router();

router.post('/process-cvp', async (req, res, next) => {
  try {
    let listFileUploaded = req.body.data;
    const objData = {};
    if (listFileUploaded) {
      listFileUploaded = listFileUploaded.sort((a, b) => (a.type > b.type ? 1 : b.type > a.type ? -1 : 0));
      for (const fileData of listFileUploaded) {
        if (fileData.type === 'CVP') {
          const splitPath = fileData.path.split('/');
          const folderPath = `file/${splitPath[3]}/${splitPath[4]}`;
          objData.cvpData = fs.readFileSync(folderPath, 'utf8');
        } else {
          try {
            // Convert csv file
            const csvData = await writeFileCsv(fileData);
            // // Run business logic
            if (fileData.type === 'Frame Table') {
              objData.ftData = await FrameTableSercive.getFrameTableData(csvData);
            } else if (fileData.type === 'Light Weight Table') {
              objData.lwData = await LightWeightSercive.getLightWeightData(csvData);
            } else if (fileData.type === 'Bonjean Table') {
              objData.bjData = await BonjeanSercive.getBonjeanData(csvData);
            } else if (fileData.type === 'KN Table') {
              objData.knData = await KnTableService.getKnData(csvData);
            } else if (fileData.type === 'Tank Arrangement Table') {
              objData.tankData = await TankArrangementService.getTankData(csvData);
            } else if (fileData.type === 'Volumn Table') {
              [objData.volumnData, objData.numberOfTank] = await VolumnSercive.getVolumnData(
                csvData,
                objData.tankData,
              );
            } else if (fileData.type === 'Allowable SF/SB') {
              objData.sfbmData = await SfbmSercive.getSfbmData(csvData);
            } else if (fileData.type === 'Hydro') {
              objData.hydroData = await HydroSercive.getHydroData(csvData);
            }
          } catch (error) {
            throw new Error(error);
          }
        }
      }
      const cvpResult = await addDataIntoCvp(objData);
      return res.status(200).json({ result: cvpResult });
    }
  } catch (err) {
    return res.status(500).json({ err });
  }
});
async function writeFileCsv(fileData) {
  // Call pre-process to convert csv file
  const preProcessRes = await axios.post(`${process.env.MAIN_CORE}${AppConstants.CORE_API.RUN_PRE_PROCESS}`, {
    file_url: fileData.path,
  });
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
  const fileNameTime = `${fileData.path.replace(/^.*[\\\/]/, '').replace(/\.[^/.]+$/, '')}`;
  fs.writeFile(`file/vessel_profiles/${fileNameTime}.csv`, csvData, err => {
    if (err) {
      console.error(err);
    }
  });
  return csvData;
}
async function addDataIntoCvp(objData) {
  const cvpResult = objData.cvpData.split('\n');
  for (const idx in cvpResult) {
    if (cvpResult[idx].includes('Frame List')) {
      // Frame table
      if (objData.ftData) cvpResult[idx] = objData.ftData;
      // Bonjean
      if (objData.bjData) {
        if (cvpResult[parseInt(idx) + 1][0] === '+') {
          cvpResult[parseInt(idx) + 1] = objData.bjData;
        } else {
          cvpResult.splice(parseInt(idx) + 1, 0, objData.bjData);
        }
      }
    } else if (cvpResult[idx].includes('Light Ship')) {
      // Lightweight
      if (objData.lwData) cvpResult[idx] = objData.lwData + '\r';
    } else if (cvpResult[idx].includes('KN Curve=')) {
      //KN
      if (objData.knData) cvpResult[idx] = objData.knData + '\r';
    }
    //Tank-Volumn
    if (objData.volumnData) {
      if (cvpResult[idx].includes('General Particular=')) {
        let strTemp1 = cvpResult[idx].split('^');
        strTemp1[39] = objData.numberOfTank.toString();
        let strTemp2 = '';
        for (let item of strTemp1) {
          if (strTemp2 === '') {
            strTemp2 += item;
          } else {
            strTemp2 += '^' + item;
          }
        }
        cvpResult[idx] = strTemp2;
      } else if (cvpResult[idx].includes('Tank=')) {
        cvpResult[idx] = objData.volumnData + '\r';
      }
    }
    // sfbm
    if (cvpResult[idx].includes('Frame=')) {
      if (objData.sfbmData) {
        cvpResult[idx] = `${objData.sfbmData}\r`;
      }
    }
    // hydro
    if (cvpResult[idx].includes('Hydrodata=')) {
      if (objData.hydroData) {
        cvpResult[idx] = objData.hydroData + '\r';
      }
    }
  }
  return cvpResult;
}
router.post('/upload-file', uploadDoc, async (req, res) => {
  try {
    const path = await moveFileFileFromMiddlewareToOther(req.file.originalname, '', 'vessel_profiles');
    return res.status(200).json({ type: req.body.file_type, path });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ errorCode });
  }
});
export default router;
