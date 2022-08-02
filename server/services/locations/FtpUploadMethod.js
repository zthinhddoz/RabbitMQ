import fs from 'fs';
import SFTPClient from 'ssh2-sftp-client';
import { BadRequestError } from '../utils/errors';
import AppConstants from '~/utils/constants';
import ExtractionServices from '../extraction/ExtractionServices';
import logger from '../shared/logger';
import { loggerUploadMethods, secureFilename } from '../utils/commonFuncs';
const ftp = require('basic-ftp');

export default class FtpUploadMethod {
  constructor() {
    this.dataRes = null;
  }

  static async downloadFileSftpServer(dataAllMethod, data) {
    try {
      const client = new SFTPClient();
      const downStartTime = Date.now();
      const config = {
        host: dataAllMethod[0] ? dataAllMethod[0].host_ip : null,
        username: dataAllMethod[0] ? dataAllMethod[0].usr_id : null,
        password: dataAllMethod[0] ? dataAllMethod[0].usr_pwd : null,
        port: '22',
      };
      const saveDestination = `${AppConstants.LOCATION_DOC_FILE}/${data.urlFolder.replace('Output', 'Input')}`;
      // Create recursive folder
      if (!fs.existsSync(saveDestination)) {
        fs.mkdirSync(saveDestination, { recursive: true });
      }
      const sourceFile = dataAllMethod[0] ? dataAllMethod[0].dir_path : null;
      const downloadedFiles = [];
      await client.connect(config).then(() => {
       return client.list(`/${sourceFile}`);
      }).then(async data => {
        loggerUploadMethods('info', AppConstants.UPLOAD_METHOD_TYPES.SFTP, `fetching files: ${data}`);
        for (let i = 0; i < data.length; i++) {
          const newFilename = secureFilename(data[i].name);
          const writeStreamFile = fs.createWriteStream(`${saveDestination}/${newFilename}`);
          const remoteFilePath = `/${sourceFile}/${data[i].name}`;
          if (client.exists(remoteFilePath)) {
            await client.get(remoteFilePath, writeStreamFile);
            downloadedFiles.push(newFilename);
          }
          writeStreamFile.close(); 
        }
        loggerUploadMethods('info', AppConstants.UPLOAD_METHOD_TYPES.SFTP, 'Total Download Time', downStartTime)
      }).catch(error => {
        loggerUploadMethods('error', AppConstants.UPLOAD_METHOD_TYPES.SFTP, ` Error while processing upload and extraction ${error}`);
      });
      client.end();

      // Logging execution time for Upload and Extraction Flow 
      const extractTimeStart = Date.now();
      await this.uploadAndRunFullFlow(downloadedFiles, saveDestination, data);
      loggerUploadMethods('info', AppConstants.UPLOAD_METHOD_TYPES.SFTP, 'Total Extract Time', extractTimeStart);
      return { message: 'Download file from SFTP server successfully', file: downloadedFiles };
    } catch (error) {
      loggerUploadMethods('error', AppConstants.UPLOAD_METHOD_TYPES.SFTP, ` Error while processing upload and extraction ${error}`);
      if (error?.code === 2) {
        throw new BadRequestError({ errorCode: 316 });
      } else {
        throw new BadRequestError({ errorCode: 313 });
      }
    }
  }

  static async downloadFileFtpServer(dataAllMethod, data) {
    try {
      const client = new ftp.Client();
      client.ftp.verbose = true;
      const saveDestination = `${AppConstants.LOCATION_DOC_FILE}/${data.urlFolder.replace('Output', 'Input')}`;
      // Create recursive folder
      if (!fs.existsSync(saveDestination)) {
        fs.mkdirSync(saveDestination, { recursive: true });
      }
      const sourceFile = dataAllMethod[0] ? dataAllMethod[0].dir_path : null; 
      const downStartTime = Date.now();
      await client.access({
        host: dataAllMethod[0] ? dataAllMethod[0].host_ip : null,
        user: dataAllMethod[0] ? dataAllMethod[0].usr_id : null,
        password: dataAllMethod[0] ? dataAllMethod[0].usr_pwd : null,
      });
      const attachments = await client.list(sourceFile);
      const downloadedFiles = [];
      if (attachments && attachments.length > 0) {
        // console.log('list files in dir: ', await client.list(sourceFile));
        for (let i = 0; i < attachments.length; i++) {
          const newFilename = secureFilename(attachments[i].name);
          const writeStreamFile = fs.createWriteStream(`${saveDestination}/${newFilename}`);
          const remoteFilePath = `${sourceFile}/${attachments[i].name}`;
          await client.downloadTo(writeStreamFile, remoteFilePath);
          downloadedFiles.push(newFilename);
          writeStreamFile.close(); 
        }
      } else {
        throw new BadRequestError({ errorCode: 316 });
      }
      client.close();
      loggerUploadMethods('info', AppConstants.UPLOAD_METHOD_TYPES.FTP, `Fetching attachment ${downloadedFiles}`);
      loggerUploadMethods('info', AppConstants.UPLOAD_METHOD_TYPES.FTP, 'Total Download Time', downStartTime);
      // Logging execution time for Upload and Extraction Flow 
      const extractTimeStart = Date.now();
      await this.uploadAndRunFullFlow(downloadedFiles, saveDestination, data);
      loggerUploadMethods('info', AppConstants.UPLOAD_METHOD_TYPES.FTP, 'Total Extract Time', extractTimeStart);
      return { message: 'Download file from FTP server successfully', file: downloadedFiles };
    } catch (error) {
      loggerUploadMethods('error', AppConstants.UPLOAD_METHOD_TYPES.FTP, ` Error while processing upload and extraction ${error}`);
      if (error?.code === 550) {
        throw new BadRequestError({ errorCode: 316 });
      } else {
        throw new BadRequestError({ errorCode: 314 });
      }
    }
  }

  static async uploadAndRunFullFlow(attachments, saveDestination, data) {
    for (let i = 0, len = attachments.length; i < len; i++) {
      try {
        const fileName = attachments[i];
        const filePath = `${saveDestination}/${fileName}`;
        const fileSize = (fs.statSync(filePath).size / 1024).toFixed(1);
        const fileExtractTimeStart = Date.now();
        await ExtractionServices.saveExtractDocument({ ...data, root_nm: fileName, file_sz: fileSize }, fileName);
        loggerUploadMethods('info', [AppConstants.UPLOAD_METHOD_TYPES.FTP, AppConstants.UPLOAD_METHOD_TYPES.SFTP].join(' '), ` Extracting file: ${fileName}`, fileExtractTimeStart);
      } catch (err) {
        loggerUploadMethods('error', AppConstants.UPLOAD_METHOD_TYPES, ` Error when Upload and Run Extraction Flow ${err}`);
        throw new BadRequestError({ errorCode: 313 });
      }
    }
  }
}