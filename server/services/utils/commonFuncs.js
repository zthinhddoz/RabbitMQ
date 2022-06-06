/* eslint-disable no-restricted-syntax */
import fs from 'fs';
import AppConstants from './constants';
import logger from '~/shared/logger';
import axios from 'axios';
const FormData = require('form-data');
/**
 * This is common func to res data with services
 * @param {*} res
 * @param {*} next
 * @param {*} dataRes
 * @returns
 */
export const customRes = (req, res, next, dataRes) => {
  if (dataRes) return res.status(200).json(dataRes);
  console.log(`${req._startTime} - ${req.method}: ${req.originalUrl} FAILED!!!`);
  return next();
};

// Find or create folder doc location
export const checkAddFolderDoc = (folderLoc) => {
  // Find or create folder doc location
  if (!fs.existsSync(`${AppConstants.LOCATION_DOC_FILE}/${folderLoc}/`)) {
    fs.mkdirSync(`${AppConstants.LOCATION_DOC_FILE}/${folderLoc}/`, { recursive: true });
  }
};

export const checkAddFolderGGDrive = (folderLoc) => {
  // Find or create folder doc location
  if (!fs.existsSync(`${folderLoc}/`)) {
    fs.mkdirSync(`${folderLoc}/`, { recursive: true });
  }
};

// This function move file downloads by middleware to input folder with more details.
export const moveFileDownloadFromMiddleWareToInput = async (fileName, urlFolder) => {
  checkAddFolderDoc(`${urlFolder}`);
  const oldPath = `${AppConstants.LOCATION_DOC_FILE}/${fileName}`;
  const newPath = `${AppConstants.LOCATION_DOC_FILE}/${urlFolder}/${fileName}`;
  fs.copyFileSync(oldPath, newPath, err => {
    if (err) console.log('Err', err);
  });
  // Remove added file
  fs.unlinkSync(oldPath);
}

export const moveFileFileFromMiddlewareToOther = async (fileName, prefixFileName, urlFolder) => {
  checkAddFolderDoc(`${urlFolder}`);
  const oldPath = `${AppConstants.LOCATION_DOC_FILE}/${fileName}`;
  const newPath = `${AppConstants.LOCATION_DOC_FILE}/${urlFolder}/${prefixFileName}${fileName}`;
  console.log(oldPath);
  console.log(newPath);
  fs.copyFileSync(oldPath, newPath, err => {
    if (err) console.log('Err', err);
  });
  // Remove added file
  fs.unlinkSync(oldPath);
  return newPath;
}


/**
 * This function is used to move file into new location
 * @param {*} originFolder
 * @param {*} targetForder
 * @param {*} originalFileName
 * @param {*} newDocName
 */
export const saveFileProc = (originFolder, targetForder, originalFileName, newDocName) => {
  checkAddFolderDoc(targetForder);
  // Copy file into doc location
  const oldPath =  `${originFolder}/${targetForder.replace("Output","Input")}/${originalFileName}`;
  fs.copyFileSync(oldPath, `${originFolder}/${targetForder}/${newDocName}`, err => {
    if (err) console.log('Err', err);
  });
  // Remove added file
  fs.unlinkSync(`${oldPath}`);
};

/**
 * This function is used to move file into new location
 * @param {*} originFolder
 * @param {*} targetForder
 * @param {*} originalFileName
 * @param {*} newDocName
 * @param {*} nextDocId
 */
export const saveFileExcelProc = async (originFolder, targetForder, originalFileName, newDocName, nextDocId) => {
  try {
    checkAddFolderDoc(targetForder);
    // Copy file into doc location
    const oldPath = `${originFolder}/${targetForder.replace("Output", "Input")}/${originalFileName}`;
    const formDataConvertExcel = new FormData();
    const formDataConvertPdf = new FormData();
    formDataConvertExcel.append('file', fs.createReadStream(oldPath));
    formDataConvertPdf.append('file', fs.createReadStream(oldPath));

    const convertExcelRes = await axios
      .create({
        headers: formDataConvertExcel.getHeaders(),
        responseType: 'stream'
      })
      .post(process.env.EXCEL_CONV, formDataConvertExcel);

    if (convertExcelRes && convertExcelRes.status === 200) {
      let filename = `${newDocName}.${convertExcelRes.headers["x-filename"].split('.').pop().toLowerCase()}`;
      let newPathExcel = `${originFolder}/${targetForder}/${filename}`;
      convertExcelRes.data.pipe(fs.createWriteStream(newPathExcel));
    } else {
      throw new Error();
    }

    const convertPdfRes = await axios
      .create({
        headers: formDataConvertPdf.getHeaders(),
      })
      .post(process.env.PDF_CONV, formDataConvertPdf);
    if (convertPdfRes && convertPdfRes.status === 200) {
      if (convertPdfRes.data.data && convertPdfRes.data.data.message === "CONVERT TO PDF SUCCESSFULLY" && convertPdfRes.data.data.path) {
        const fileRes = await axios
          .create({
            responseType: 'stream'
          })
          .get(convertPdfRes.data.data.path)
        if (fileRes && fileRes.status === 200) {
          fileRes.data.pipe(fs.createWriteStream(`${originFolder}/${targetForder}/${newDocName}.pdf`));
        } else throw new Error();
      } else throw new Error();
    } else throw new Error();

    fs.copyFileSync(oldPath, `${originFolder}/${targetForder}/${newDocName}.${originalFileName.split('.').pop()}`, err => {
      if (err) console.log('Err', err);
    });
    // Remove added file
    fs.unlinkSync(`${oldPath}`);
  } catch (error) {
    logger.error(error);
    throw new Error('Save file Error');
  }

};


export const saveFileProcGGDrive = (oldFilePath,newFolderPath,nextDocNm) => {
  // Copy file into doc location
  checkAddFolderGGDrive(newFolderPath);
  const newFilePath = `${newFolderPath}/${nextDocNm}`;
  fs.copyFileSync(oldFilePath, newFilePath, err => {
    if (err) console.log('Err', err);
  });
  // Remove added file
  fs.unlinkSync(`${oldFilePath}`);
};


/**
 * This function is used to create massive data at the same time.
 * The last data item will have different "create date" compared with other items.
 * Therefore we can create new data base on create date.
 * @param {*} tableModel
 * @param {*} listData
 */
export const createBulkData = async (tableModel, listData) => {
  // Seperate the last items from their list data
  const lastDataItem = listData[listData.length - 1];
  listData.splice(listData.length - 1, 1);

  // create multiple data except the last one
  await tableModel
    .bulkCreate(listData, { returning: true })
    .then(rowAdded => {
      if (rowAdded == null) {
        throw 'errorAdd';
      }
    })
    .catch(errorAdd => {
      throw errorAdd;
    });

  /* Create data for the last item
    This item will be created after creating the seperated data above, so it will have different cre_dt */
  if (lastDataItem) {
    await tableModel.create(lastDataItem).catch(errorAdd => {
      throw errorAdd;
    });
  }
};

export const removeIPandPort = url => url
    .split('/')
    .slice(3, url.split('/').length)
    .join('/');

export const getCurrentTimeString = () => {
  const today = new Date();
  const date = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  const time = `${today.getHours()}:${today.getMinutes()}:${today.getSeconds()}`;
  return `${date}-${time}`;
};

export const getReqErrorInfo = (req) => {
  let infoReq = `${req.ip} call ${req.method} - ${req.url}`;
  if (req.method === 'POST') {
    infoReq += `\nBody Request:\n ${JSON.stringify(req.body)}`;
  }
  return infoReq;
};

export const formatAttr = attributes => {
  const result = {};
  for (const item of JSON.parse(attributes)) {
    result[item.attribute] = item.value;
  }
  return result;
};

export const getBaseCoreUrl = (coreName) => coreName === AppConstants.CORE_SYS_NAME.LABEL ? process.env.LABEL_CORE : process.env.MAIN_CORE;

export const modifyCoreReqData = (coreName, reqData) => {
  if (coreName === AppConstants.CORE_SYS_NAME.MAIN) return reqData;
  // For core Label, re-check and modify base on their APIs
  const fileUrl = reqData.file_url || reqData.root_url;
  const fileExtension = fileUrl
    .split('.')
    .pop()
    .toLowerCase();
  const isImgFile = AppConstants.FILE_TYPE_DOC_IMG.includes(fileExtension);
  if (isImgFile) {
    reqData.type = 'image';
    reqData.label = '1'; // This is hard-code for Label Core, will be removed when Label core deploy with multi env
  }
  return reqData;
};
