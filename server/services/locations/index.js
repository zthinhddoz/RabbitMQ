/* eslint-disable eqeqeq */
/* eslint-disable no-unused-vars */
/* eslint-disable consistent-return */
/* eslint-disable func-names */
import { Router } from 'express';
import { Op } from 'sequelize';
import multer from 'multer';
import fs from 'fs';
import generateNewId from '~/utils/generateNewId';
import { customRes, createBulkData } from '~/utils/commonFuncs';
import model from '~/shared/models';
import logger from '~/shared/logger';
import LocationServices from './LocationServices';
import FtpUploadMethod from './FtpUploadMethod';
import keycloak from '../shared/middleWare/checkSSO';
import { downloadFile, listFiles, getFolderInfo, uploadGGDrive } from './GDriveUploadMethod';
import { saveExtractDoc, uploadDocMethod, LOCATION_DOC_FILE} from '~/document/uploadDocMethod';
import AppConstants from '~/utils/constants';
import getEmailAttachment from './EmailUploadMethod';
import ExtractionServices from '../extraction/ExtractionServices';
import { BadRequestError } from '../utils/errors';

const router = Router();
export const PREFIX_ID_LOC = 'LOC';
const PREFIX_ID_UPL_MTHD = 'UM';
const PREFIX_ID_COM_DOC_FLD = 'COMDOCFLD';
const originFolder = 'googleDriveKeys';
const rimraf = require("rimraf");
const ftp = require("basic-ftp")


const jsonFilter = function(req, file, cb) {
  // Accept json file only
  if (!file.originalname.match(/\.(json)$/)) {
    req.isNotValidFile = true;
    return cb(new Error('Only files .json are allowed!'), false);
  }
  cb(null, true);
};

router.get('/locations', keycloak.protect(), async (req, res, next) => {
  const whereClause = {
    [Op.and]: [
      req.query && req.query.coCd && req.query.coCd !== 'All' ? { co_cd: req.query.coCd } : '',
      req.query && req.query.docTpId && req.query.docTpId !== 'All'
        ? { doc_tp_id: req.query.docTpId }
        : '',
      { delt_flg: req.query && req.query.deltFlg == 'true' ? 'Y' : 'N' },
      req.query && req.query.loc && req.query.loc !== 'All'
        ? {
            [Op.or]: [{ loc_cd: req.query.loc }, { loc_nm: { [Op.like]: `%${req.query.loc}%` } }],
          }
        : '',
    ],
  };
  try {
    const locs = await model.DexLoc.findAll({
      include: ['documents'],
      where: whereClause,
      order: [['loc_id', 'ASC']],
    })
      .then(result => {
        if (result == null || result.length == 0) {
          res.status(200).json({ result: '' });
        } else {
          res.status(200).json({ result, message: `Find ${result.length} documents suceesfully` });
        }
      })
      .catch(err => {
        logger.error(err);
        res.status(500).json({ errorCode: 300 });
      });
  } catch (error) {
    next(error);
  }
});

export async function getLatestId() {
  const lastLocation = await model.DexLoc.findAll({
    limit: 1,
    order: [['cre_dt', 'DESC']],
  });

  const lastComDocFld = await model.AdmCoDocFld.findAll({
    limit: 1,
    order: [['cre_dt', 'DESC']],
  });

  const lastLocationId = lastLocation.length > 0 ? lastLocation[0].loc_id : '';
  const newLocId = generateNewId(lastLocationId, PREFIX_ID_LOC);

  const lastComDocFldId = lastComDocFld.length > 0 ? lastComDocFld[0].adm_co_doc_fld_id : '';
  const newComDocFldId = generateNewId(lastComDocFldId, PREFIX_ID_COM_DOC_FLD);

  return { newLocId, newComDocFldId };
}

async function addCompanyDocument(params, listAllSubDocumentId) {
  // const listNewDataComDoc = [];
  const listNewDataSubLoc = [];
  const listNewDataSubComDocFld = [];
  const listNewDataParentComDocFld = [];
  const { newLocId, newComDocFldId } = await getLatestId();
  // Create data for parent Location
  await model.DexLoc.create({
    loc_id: newLocId,
    loc_cd: params.loc_cd,
    co_cd: params.co_cd,
    loc_nm: params.loc_nm,
    loc_tp_cd: params.loc_tp_cd,
    doc_tp_id: params.doc_tp_id,
    fol_loc_url: params.fol_loc_url,
    cre_usr_id: params.userId,
    upd_usr_id: params.userId,
    prnt_loc_id: '',
  }).catch(err => {
    logger.error(err);
    throw err;
  });
  // Create data field for document
  let newAdmComDocFldId = newComDocFldId;
  const listFieldParentDocument = await model.AdmDocFld.findAll({
    where: { doc_tp_id: params.doc_tp_id, delt_flg: 'N' },
  });
  for (let indexField = 0; indexField < listFieldParentDocument.length; indexField++) {
    listNewDataParentComDocFld.push({
      doc_fld_id: listFieldParentDocument[indexField].doc_fld_id,
      ord_no: listFieldParentDocument[indexField].ord_no,
      cre_usr_id: params.userId,
      upd_usr_id: params.userId,
      adm_co_doc_fld_id: newAdmComDocFldId,
      loc_id: newLocId,
      fld_cd: listFieldParentDocument[indexField].fld_cd,
    });
    newAdmComDocFldId = generateNewId(newAdmComDocFldId, PREFIX_ID_COM_DOC_FLD);
  }
  await createBulkData(model.AdmCoDocFld, listNewDataParentComDocFld);

  //---------------------------------------------------------------
  // Create data for sub location and sub document field
  if (listAllSubDocumentId.length !== 0) {
    let newSubLocationId = generateNewId(newLocId, PREFIX_ID_LOC);
    newAdmComDocFldId = generateNewId(newAdmComDocFldId, PREFIX_ID_COM_DOC_FLD);
    for (let indexIdSubDoc = 0; indexIdSubDoc < listAllSubDocumentId.length; indexIdSubDoc++) {
      listNewDataSubLoc.push({
        loc_id: newSubLocationId,
        loc_cd: params.loc_cd,
        co_cd: params.co_cd,
        loc_nm: params.loc_nm,
        loc_tp_cd: params.loc_tp_cd,
        doc_tp_id: listAllSubDocumentId[indexIdSubDoc],
        fol_loc_url: params.fol_loc_url,
        cre_usr_id: params.userId,
        upd_usr_id: params.userId,
        prnt_loc_id: newLocId,
      });

      const listFieldOfDocument = await model.AdmDocFld.findAll({
        where: { doc_tp_id: listAllSubDocumentId[indexIdSubDoc], delt_flg: 'N' },
      });
      for (let indexDataField = 0; indexDataField < listFieldOfDocument.length; indexDataField++) {
        listNewDataSubComDocFld.push({
          doc_fld_id: listFieldOfDocument[indexDataField].doc_fld_id,
          ord_no: listFieldOfDocument[indexDataField].ord_no,
          cre_usr_id: params.userId,
          upd_usr_id: params.userId,
          adm_co_doc_fld_id: newAdmComDocFldId,
          loc_id: newSubLocationId,
          fld_cd: listFieldOfDocument[indexDataField] ? listFieldOfDocument[indexDataField].fld_cd : null,
        });
        newAdmComDocFldId = generateNewId(newAdmComDocFldId, PREFIX_ID_COM_DOC_FLD);
      }
      newSubLocationId = generateNewId(newSubLocationId, PREFIX_ID_LOC);
    }
    await createBulkData(model.DexLoc, listNewDataSubLoc);
    await createBulkData(model.AdmCoDocFld, listNewDataSubComDocFld);
  }

  return { newLocId };
}

async function UpdateExistedCompanyDocument(data, actionType) {
  const listSubLocation = await model.DexLoc.findAll({
    where: {
      doc_tp_id: data.listDocId,
      prnt_loc_id: data.loc_id,
    },
  });
  const listLocationId = listSubLocation.map(item => item.loc_id);
  listLocationId.push(data.loc_id);
  await model.AdmCoDocFld.update(
    {
      delt_flg: actionType === 'Delete' ? 'Y' : 'N',
      upd_usr_id: data.userId,
    },
    {
      where: { loc_id: listLocationId },
    },
  ).catch(error => {
    logger.error(error);
    throw error;
  });

  // update dex_loc
  await model.DexLoc.update(
    {
      loc_cd: data.loc_cd,
      co_cd: data.co_cd,
      loc_tp_cd: data.loc_tp_cd,
      fol_loc_url: data.fol_loc_url,
      loc_nm: data.loc_nm,
      delt_flg: actionType === 'Delete' ? 'Y' : 'N',
      upd_usr_id: data.userId,
    },
    {
      where: {
        loc_id: listLocationId,
      },
    },
  ).catch(error => {
    logger.error(error);
    throw error;
  });
}

async function getAllSubDocument(listAllDocumentId, checkDocument) {
  if (checkDocument.grp_flg === 'Y') {
    const allSubDocument = await model.AdmDoc.findAll({
      where: { grp_doc_id: checkDocument.doc_tp_id, delt_flg: 'N' },
    });
    allSubDocument.forEach(subDoc => listAllDocumentId.push(subDoc.doc_tp_id)); // id of sub document
  }
}

router.post('/add', keycloak.protect(), async (req, res, next) => {
  try {
    const { params } = req.body;
    const checkLocation = await model.DexLoc.findOne({
      where: { fol_loc_url: params.fol_loc_url },
    });

    const checkDocument = await model.AdmDoc.findOne({
      where: { doc_tp_id: params.doc_tp_id },
    });

    if (checkLocation != null) {
      if (checkLocation.delt_flg == 'Y') {
        const listAllDocumentId = [checkDocument.doc_tp_id];
        await getAllSubDocument(listAllDocumentId, checkDocument);
        params.loc_id = checkLocation.loc_id;
        params.listDocId = listAllDocumentId;
        await UpdateExistedCompanyDocument(params, 'Add');
        customRes(req, res, next, { newLocId: checkLocation.loc_id });
      } else {
        res.status(500).json({ errorCode: 301 });
      }
    } else if (checkDocument.grp_flg === 'Y') {
      const allSubDocument = await model.AdmDoc.findAll({
        where: { grp_doc_id: checkDocument.doc_tp_id, delt_flg: 'N' },
      });
      const listAllSubDocumentId = allSubDocument.map(subDoc => subDoc.doc_tp_id); // id of sub document
      const newLocId = await addCompanyDocument(params, listAllSubDocumentId);
      customRes(req, res, next, newLocId);
    } else {
      const newLocId = await addCompanyDocument(params, []);
      customRes(req, res, next, newLocId);
    }
  } catch (error) {
    res.status(500).json({ errorCode: 302 });
    next(error);
  }
});

router.put('/update', keycloak.protect(), async (req, res, next) => {
  try {
    const { params } = req.body;
    const checkLocation = await model.DexLoc.findOne({
      where: { loc_id: params.loc_id, delt_flg: 'N' },
    });

    const checkDocument = await model.AdmDoc.findOne({
      where: { doc_tp_id: params.doc_tp_id },
    });

    if (checkLocation != null) {
      const listAllDocumentId = [checkDocument.doc_tp_id];
      await getAllSubDocument(listAllDocumentId, checkDocument);
      params.listDocId = listAllDocumentId;
      await UpdateExistedCompanyDocument(params, 'Update');
      res.status(200).json({ message: '' });
    } else {
      res.status(500).json({ errorCode: 301 });
    }
  } catch (error) {
    res.status(500).json({ errorCode: 303 });
    next(error);
  }
});

router.put('/delete', keycloak.protect(), async (req, res, next) => {
  try {
    const { params } = req.body;
    const checkLocation = await model.DexLoc.findOne({
      where: { loc_id: params.loc_id, delt_flg: 'N' },
    });
    const checkDocument = await model.AdmDoc.findOne({
      where: { doc_tp_id: params.doc_tp_id },
    });

    // delete upload method
    await model.DexUpldMzd.update(
      {
        delt_flg: 'Y',
        upd_usr_id: params.userId,
      },
      {
        where: {
          loc_id: params.loc_id,
        },
      },
    ).catch(errorDelete => {
      res.status(500).json({ errorCode: 304 });
      logger.error(errorDelete);
    });

    if (checkLocation != null) {
      const listAllDocumentId = [checkDocument.doc_tp_id];
      await getAllSubDocument(listAllDocumentId, checkDocument);
      params.listDocId = listAllDocumentId;
      await UpdateExistedCompanyDocument(params, 'Delete');
      res.status(200).json({ message: '' });
    } else {
      res.status(500).json({ errorCode: 301 });
    }
  } catch (error) {
    res.status(500).json({ errorCode: 304 });
    next(error);
  }
});

router.get('/location', keycloak.protect(), async (req, res, next) => {
  try {
    const loc = await model.DexLoc.findOne({ where: { loc_id: req.query.locationId } })
      .then(result => {
        if (result == null || result.length == 0) {
          res.status(200).json({ result: '' });
        } else {
          res.status(200).json({ result, message: 'Find location document suceesfully' });
        }
      })
      .catch(err => {
        logger.error(err);
        res.status(500).json({ errorCode: 305 });
      });
  } catch (error) {
    next(error);
  }
});

router.put('/upload-method/update', keycloak.protect(), async (req, res, next) => {
  try {
    const { params } = req.body;
    let usedMethod = '';
    const paramUsedMethod = params.usedMethods;
    for (let i = 0; i < paramUsedMethod.length; i++) {
      if (i === paramUsedMethod.length - 1) {
        usedMethod += paramUsedMethod[i];
        break;
      }
      usedMethod += `${paramUsedMethod[i]}-`;
    }
    // check exist item
    const checkExist = await model.DexUpldMzd.findOne({ where: { loc_id: params.loc_id } }).then(
      async result => {
        // create new one
        if (result == null) {
          // get latest id
          const lastMethod = await model.DexUpldMzd.findAll({
            limit: 1,
            order: [['upld_mzd_id', 'DESC']],
          });

          const lastMethodId = lastMethod.length > 0 ? lastMethod[0].upld_mzd_id : '';
          const newMethodId = generateNewId(lastMethodId, PREFIX_ID_UPL_MTHD);
          const addUploadMethod = await model.DexUpldMzd.create({
            upld_mzd_id: newMethodId,
            eml_tit_val: params.eml_tit_val,
            eml_addr: params.eml_addr,
            host_ip: params.host_ip,
            usr_id: params.usr_id,
            usr_pwd: params.usr_pwd,
            dir_path: params.dir_path,
            loc_id: params.loc_id,
            file_svr_path: params.file_svr_path,
            file_gg_drive_path: params.file_gg_drive_path,
            run_bg_flg: params.run_bg_flg,
            usd_mzd_cd: usedMethod,
            cre_usr_id: params.userId,
            upd_usr_id: params.userId,
          })
            .then(rowAdded => {
              if (rowAdded == null) {
                res.status(500).json({ errorCode: 302 });
              } else {
                res.status(200).json({ message: 'Add method upload of location successful' });
              }
            })
            .catch(err => {
              logger.error(err);
              res.status(500).json({ errorCode: 302 });
            });
        }
        // update the exist one
        else {
          const updateUploadMethod = await model.DexUpldMzd.update(
            {
              eml_tit_val: params.eml_tit_val,
              eml_addr: params.eml_addr,
              host_ip: params.host_ip,
              usr_id: params.usr_id,
              usr_pwd: params.usr_pwd,
              dir_path: params.dir_path,
              file_svr_path: params.file_svr_path,
              file_gg_drive_path: params.file_gg_drive_path,
              run_bg_flg: params.run_bg_flg,
              usd_mzd_cd: usedMethod,
              upd_usr_id: params.userId,
            },
            {
              where: {
                loc_id: params.loc_id,
              },
            },
          )
            .then(rowUpdate => {
              if (rowUpdate == null) {
                res.status(500).json({ errorCode: 303 });
              } else {
                res.status(200).json({ message: 'Update method upload of location successful' });
              }
            })
            .catch(err => {
              logger.error(err);
              res.status(500).json({ errorCode: 303 });
            });
        }
      },
    );
  } catch (error) {
    next(error);
  }
});

router.get('/upload-method/get', keycloak.protect(), async (req, res, next) => {
  try {
    const params = req.query;

    const getMethod = await model.DexUpldMzd.findOne({ where: { loc_id: params.locationId } })
      .then(result => {
        if (result == null) {
          res.status(200).json({ result: '' });
        } else {
          res.status(200).json({ result, message: 'Find upload method successfully' });
        }
      })
      .catch(err => {
        logger.error(err);
        res.status(500).json({ errorCode: 305 });
      });
  } catch (error) {
    next(error);
  }
});

router.post('/upload-method/upload-file', keycloak.protect(), (req, res) => {
  const upload = multer({ dest: `${originFolder}/temp`, fileFilter: jsonFilter }).single('my_file');
  upload(req, res, async function(err) {
    // req.file contains information of uploaded file
    // req.body contains information of text fields, if there were any
    const { companyCode, locationId, userId } = req.body;

    if (!fs.existsSync(`${originFolder}/${companyCode}/`)) {
      fs.mkdirSync(`${originFolder}/${companyCode}/`);
    } else {
      rimraf.sync(`${originFolder}/${companyCode}/`)
      fs.mkdirSync(`${originFolder}/${companyCode}/`);
    }

    if (req.isNotValidFile) {
      return res.status(500).json({ errorCode: 308 });
    }
    if (err instanceof multer.MulterError) {
      logger.error('multer error upload file');
      logger.error(err);
      return res.status(500).json({});
    }
    if (err) {
      logger.error('error upload file');
      logger.error(err);
      return res.status(500).json({});
    }

    let newFullPath = '';
    if (req.file) {
      const processedFile = req.file || {};
      let orgName = processedFile.originalname || '';
      orgName = orgName.trim().replace(/ /g, '-');
      const fullPathInServ = processedFile.path;

      const newTempFullPath = `${fullPathInServ}-${orgName}`;
      fs.renameSync(fullPathInServ, newTempFullPath);

      // Move file in temp folder to company folder
      fs.readdirSync(`${originFolder}/temp`).forEach(file => {
        fs.renameSync(`${originFolder}/temp/${file}`, `${originFolder}/${companyCode}/${file}`);
      });

      // Rename file to origin name
      fs.readdirSync(`${originFolder}/${companyCode}/`).forEach(file => {
        fs.renameSync(
          `${originFolder}/${companyCode}/${file}`,
          `${originFolder}/${companyCode}/${processedFile.originalname}`,
        );
      });

      fs.rmdirSync(`${originFolder}/temp/`, { recursive: true });

      newFullPath = `${originFolder}/${companyCode}/${processedFile.originalname}`;
    } else {
      // remove local files folder
      if (fs.existsSync(`${originFolder}/${companyCode}/`)) {
        fs.rmdirSync(`${originFolder}/${companyCode}/`, { recursive: true });
      }
    }

    model.DexUpldMzd.update(
      {
        file_svr_path: newFullPath,
        upd_usr_id: userId,
      },
      {
        where: {
          loc_id: locationId,
        },
      },
    ).then(rowUpdate => {
      if (rowUpdate == null) {
        res.status(500).json({ errorCode: 306 });
      } else {
        res.status(200).json({
          message: 'Location upload method updated',
        });
      }
    });
  });
});

router.get('/all-data', keycloak.protect(), async (req, res) => {
  const includeClause = ['documents'];
  const whereClause = { delt_flg: 'N' };
  const result = await LocationServices.getLocations(includeClause, whereClause);
  if (result) return res.status(200).json(result);
  return res.status(500).json({ errorCode: 100 });
});

router.get('/loc-data', keycloak.protect(), async (req, res) => {
  try {
    await model.DexLoc.findAll({
      attributes: ['loc_id', 'co_cd', 'loc_cd', 'loc_nm', 'doc_tp_id', 'delt_flg'],
    }).then(result => {
      if (result) {
        return res.status(200).json({ result, message: 'Found' });
      }
      throw new Error();
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ errorCode: 310 });
  }
});

router.get('/upload-from-drive', keycloak.protect(), async (req, res, next) => {
  try {
    const { locationId, folderLocation } = req.query;
    await model.DexUpldMzd.findOne({
      where: { loc_id: locationId },
    })
      .then(async result => {
        if (result) {
          const credentials_filepath = result.file_svr_path;
          const folder_id = result.file_gg_drive_path;
          const uploaded_time = result.file_upld_dt;
          const foldersInfo = await getFolderInfo(folder_id, credentials_filepath).catch(e => {
            logger.error('Error when get folder info: ');
            logger.error(e.stack);
          });

          // check if this folder is shared
          if (foldersInfo) {
            const files = await listFiles(folder_id, credentials_filepath).catch(e => {
              logger.error('Listing files error: ');
              logger.error(e.stack);
            });

            if (files) {
              let hasUpload = false;
              const docDataUpLoads=[]
              // Download file
              for (let i = 0; i < files.length; i++) {
                if(uploaded_time==null){ // check file_upld_dt is null when getTime() 
                  const down = await downloadFile(files[i], folderLocation, credentials_filepath)
                  const docData = {
                    urlFolder: req.query.folderLocation,
                    cre_usr_id: req.query.cre_usr_id,
                    co_cd: req.query.co_cd,
                    loc_id: req.query.locationId,
                    loc_cd: req.query.loc_cd,
                    doc_tp_id: req.query.doc_tp_id,
                    doc_grp_id: '',
                    prnt_doc_id: '',
                    root_nm: down,
                    file_sz: Number(files[i].size/1024).toFixed(1)
                  }
                  docDataUpLoads.push(docData)
                  hasUpload = true;
                }else if (
                  new Date(files[i].createdTime).getTime() > uploaded_time.getTime() ||
                  new Date(files[i].modifiedTime).getTime() > uploaded_time.getTime()
                ) {
                  const down = await downloadFile(files[i], folderLocation, credentials_filepath)
                  const docData = {
                    urlFolder: req.query.folderLocation,
                    cre_usr_id: req.query.cre_usr_id,
                    co_cd: req.query.co_cd,
                    loc_id: req.query.locationId,
                    loc_cd: req.query.loc_cd,
                    doc_tp_id: req.query.doc_tp_id,
                    doc_grp_id: '',
                    prnt_doc_id: '',
                    root_nm: down,
                    file_sz: Number(files[i].size/1024).toFixed(1)
                  }
                  docDataUpLoads.push(docData)
                  hasUpload = true;
                }
              }
              // Update current time when download is done
              if (hasUpload) {
                  // Extract file
                  for (let i = 0; i < docDataUpLoads.length; i++) {
                    try{
                      const uploadGG = await uploadGGDrive(docDataUpLoads[i],docDataUpLoads[i].root_nm)
                      const docExtractData = await ExtractionServices.makeExtractDocData(uploadGG,docDataUpLoads[i].cre_usr_id, true);
                      await ExtractionServices.extractDocument(docExtractData, false, true)
                      throw new Error("Error extract file: ");
                    }catch (e) {
                      console.error(e.message + docDataUpLoads[i].root_nm);
                    };
                  }
                await model.DexUpldMzd.update(
                  {
                    file_upld_dt: new Date(),
                  },
                  {
                    where: {
                      loc_id: locationId,
                    },
                  },
                ).then(rowUpdate => {
                        if (rowUpdate == null) 
                          res.status(500).json({ errorCode: 306 });
                        else 
                          res.status(200).json({
                            message: 'Location upload method updated',
                          });
                      })
                  .catch(err => {
                    logger.error('Update error: ');
                    logger.error(err);
                  });
              }else 
              return customRes(req, res, next, { message: 'Upload file completed' });
            } else
            return res.status(500).json({ errorCode: 306 });
          } else
          return res.status(500).json({ errorCode: 312 });
        }
      })
      .catch(error => {
        logger.error('Error downloading file: ', error);
        logger.error(error);
      });
  } catch (error) {
    logger.error(error);
    return res.status(500).json({ errorCode: 306 });
  }
});

router.post('/upload-from-email', async (req, res) => {
  try {
    const docInfo = req.body;
    const dataAllMethod = await LocationServices.getUploadData(['locationId'], { loc_id: docInfo.loc_id });
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
        const filePath = `${AppConstants.LOCATION_DOC_FILE}/${docInfo.urlFolder.replace('Output', 'Input')}/${fileName}`;
        const fileSize = (fs.statSync(filePath).size / 1024).toFixed(1);
        const dataRes = await ExtractionServices.saveExtractDocument(
          { ...docInfo, root_nm: fileName, file_sz: fileSize },
          fileName,
        );
        if (dataRes.status === 'N' && dataRes.extractJson == null) {
          logs.push({ dataRes: dataRes, message: 'Matching FAILED' });
        }
      } catch (err) {
        next(err);
        continue;
      }
    }
    res.status(200).json({
      message: 'Location upload method updated',
      logs: logs,
    });
  } catch (error) {
    res.status(500).json({ errorCode: 310 });
  }
});
router.post('/upload-from-ftp-sftp-server', async (req, res, next) => {
  const data = req.body;
  const dataAllMethod = await LocationServices.getUploadData(['locationId'], { loc_id: data.loc_id });
  let dataRes = null;
  if (data.isUseSFTP) {
    dataRes = await FtpUploadMethod.downloadFileSftpServer(dataAllMethod, data).catch(err => next(err));
  } else if (data.isUseFTP) {
    dataRes = await FtpUploadMethod.downloadFileFtpServer(dataAllMethod, data).catch(err => next(err));
  }
  customRes(req, res, next, dataRes);
});

export default router;
