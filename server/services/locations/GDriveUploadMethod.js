import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import fs from 'fs';
import AppConstants from '../utils/constants';
import { SERVICE_ACCOUNT } from '../env';
import logger from '~/shared/logger';
import { saveFileProcGGDrive, saveFileExcelProc } from '~/utils/commonFuncs';
import DocDataServices from '../docData/DocDataServices';
import { saveImgAsPdfGGDrive } from '../document/uploadDocMethod';

const FILE_FOLDER = 'file';
const DOWNLOAD_FOLDER_NAME_GGDRIVE = 'Input';

async function getDriveAPI(credentials_filepath) {
  return credentials_filepath.trim()
  ? await getDriveClient(credentials_filepath)
  : await getDriveService();
}

// Get drive api from service email
async function getDriveService() {
  const oauth2Client = new google.auth.OAuth2(SERVICE_ACCOUNT.GOOGLE.clientId, SERVICE_ACCOUNT.GOOGLE.clientSecret);
  try {
    oauth2Client.credentials = { refresh_token: SERVICE_ACCOUNT.GOOGLE.refreshToken };
    await oauth2Client.refreshAccessToken((err, tokens) => {
      if (err) {
        logger.error("Refresh token error: ");
        logger.error(err);
      }
      oauth2Client.credentials = { access_token: tokens.access_token };
    });

    return google.drive({
      version: 'v3',
      auth: oauth2Client,
    });
  } catch (error) {
    logger.error(error);
  }
}

// Get drive api from credentials file
async function getDriveClient(keyFilePath) {
  const credFilePath = `./${keyFilePath}`;
  if (fs.existsSync(credFilePath)) {
    const keys = JSON.parse(fs.readFileSync(credFilePath));
    console.log('credentials file found');
    const oAuthClient = new JWT({
      email: keys.client_email,
      key: keys.private_key,
      scopes: AppConstants.SCOPES,
    });
    return google.drive({
      version: 'v3',
      auth: oAuthClient,
    });
  } else {
    console.log('client credentials: ', error);
  }
}

// List all files by folder id
export async function listFiles(folderId, credentials_filepath) {
  const drive = await getDriveAPI(credentials_filepath);

  let files = [];

  console.log("Folder id: ", folderId);
  if (folderId) {
    const pageToken = null;
    const customQuery = `'${folderId}' in parents and trashed = false`;

    try {
      const response = await drive.files.list({
        q: customQuery,
        fields: 'nextPageToken, files(id, name, size, mimeType, createdTime, modifiedTime)',
        spaces: 'drive',
        pageToken: pageToken,
        pageSize: 10,
      });
      files = response.data.files;

      console.log('files: ', files);
      return files;
    } catch (error) {
      throw error;
    }
  } else {
    return files;
  }
}

// Get folder infomation by folder ID
export async function getFolderInfo(folderId, credentials_filepath) {
  const drive = await getDriveAPI(credentials_filepath);
  const customQuery = `mimeType='application/vnd.google-apps.folder' and trashed = false`;
  const pageToken = null;
  try {
    const response = await drive.files.list({
      q: customQuery,
      spaces: 'drive',
      pageToken: pageToken,
      pageSize: 10,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true
    });

    let folder = null;
    if (response.data.files) {
      const folders = response.data.files;
      folders.map((folderInfo, index) => {
        if (folderId === folderInfo.id) {
          folder = folderInfo;
        }
      });
      return folder;
    }
  } catch (error) {
    logger.error('The API returned an error:');
    logger.error(error);
    throw error;
  }
}

// Download file and store into file server
export function downloadFile(file, folderLocation, credentials_filepath) {
  return new Promise((resolve, reject) => {
    const { id, name, mimeType } = file;
    const fullPath = `${FILE_FOLDER}/${folderLocation.replace('Output', DOWNLOAD_FOLDER_NAME_GGDRIVE)}`;
    // Create new folders if not exist.
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  
    // Check if file's already on server. Add number after file name
    // e.g. file_name(1).pdf
    let duplFileNum = 0;
    let newFile = name;
    const fileExt = `${newFile}`.split('.').pop();
    const fileName = newFile.replace(`.${fileExt}`, '');
    // Check file types for uploading
    if (AppConstants.INCLUDE_FILE_TYPES.includes(`.${fileExt}`.toLowerCase())) {
      // Loop rename newFile
      while (fs.existsSync(`${fullPath}/${newFile}`)) {
        duplFileNum += 1;
        newFile = `${fileName}(${duplFileNum}).${fileExt}`;

      }
      // Write file to FILE FOLDER
      if (fs.existsSync(fullPath) && !AppConstants.EXCLUDE_MIMETYPE.includes(mimeType)) { // here
        const dest = fs.createWriteStream(`${fullPath}/${newFile}`); // here
        getDriveAPI(credentials_filepath).then(drive => {
          const data = drive.files.get(
            { fileId: id, alt: 'media' },
            { responseType: 'stream' },
            (err, { data }) => {
              if (err) {
                logger.error(err);
                return;
              }
              data
                .on('end', () => {
                  console.log('Upload success: ', name)
                  resolve(newFile)
                }
                )
                .on('error', err => {
                  logger.error('Error during download');
                  logger.error(err);
                  throw err;
                })
                .pipe(dest);                
            },
          );
        });
      }
    }

  });
}

// upload Google Drive
export const uploadGGDrive = async (docData, originalFileName) => {
  try {
    console.log("docData_uploadDocMethod",docData)
    let servPath = '';
    let xlsPath = '';
    let xlsxPath = '';
    const latestDoc = await DocDataServices.getLatestDexDoc();
    const splitFileName = originalFileName.split('.');
    const fileExtension = splitFileName[splitFileName.length - 1]?.toLowerCase() || '';
    const fileName = splitFileName.slice(0, -1).join('.');
    const nextDocId = latestDoc.doc_id ? (Number(latestDoc.doc_id) + 1).toString() : 0;
    let nextDocNm = `${nextDocId}_${originalFileName}`;
    const oldFilePath = `${AppConstants.LOCATION_DOC_FILE}/${docData.urlFolder}/${DOWNLOAD_FOLDER_NAME_GGDRIVE}/${originalFileName}`
    const newFilePath = `${process.env.REACT_APP_DOC_LOC}/${docData.urlFolder}/${nextDocId}_${fileName}`;
    const newFolderPath = `${AppConstants.LOCATION_DOC_FILE}/${docData.urlFolder}/Output`;
    if (AppConstants.FILE_TYPE_DOC_IMG.includes(fileExtension)) {
      nextDocNm = `${nextDocId}_${fileName}.pdf`;
      await saveImgAsPdfGGDrive(docData.urlFolder, originalFileName, nextDocNm, fileExtension);
    } else if (AppConstants.FILE_TYPE_DOC_EXCEL.includes(fileExtension)) {
      await saveFileExcelProc(AppConstants.LOCATION_DOC_FILE, docData.urlFolder, originalFileName, `${nextDocId}_${fileName}`, nextDocId);
      servPath = `${newFilePath}.pdf`;
      xlsPath = `${newFilePath}.xls`;
      xlsxPath = `${newFilePath}.xlsx`;
    } else {
      await saveFileProcGGDrive(oldFilePath,newFolderPath,nextDocNm);
    }
    const addDocData = {
      ...docData,
      doc_id: nextDocId,
      doc_nm: nextDocNm,
    };
    if (!servPath) {
      servPath =  `${process.env.REACT_APP_DOC_LOC}/${addDocData.urlFolder}/Output/${nextDocNm}`;
    }
    await DocDataServices.addDexdoc(addDocData);
    return {
      sts_cd: 200,
      msg: 'Insert document successful',
      file_url: servPath,
      doc_id: nextDocId,
      co_cd: addDocData.co_cd,
      loc_cd: addDocData.loc_cd,
      doc_type: addDocData.doc_tp_id,
      file_type: fileExtension,
      file_size: addDocData.file_sz,
      prnt_doc_id: addDocData.prnt_doc_id,
      doc_grp_id: addDocData.doc_grp_id,
      usr_id: addDocData.cre_usr_id,
      xls_url: xlsPath,
      xlsx_url: xlsxPath,
    };
  } 
  catch (err) {
  throw err;
  }
};
