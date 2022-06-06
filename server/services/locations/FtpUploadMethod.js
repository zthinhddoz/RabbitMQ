import fs from 'fs';
import SFTPClient from 'ssh2-sftp-client';
import { BadRequestError } from '../utils/errors';
import AppConstants from '~/utils/constants';
import ExtractionServices from '../extraction/ExtractionServices';
import logger from '../shared/logger';
const ftp = require('basic-ftp');

export default class FtpUploadMethod {
  constructor() {
    this.dataRes = null;
  }

  static async downloadFileSftpServer(dataAllMethod, data) {
    try {
      const client = new SFTPClient();
      const attachments = [];
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
      await client.connect(config);
      client.on('download', info => {
        attachments.push(info.source.replace(/^.*[\\\/]/, ''));
      });
      const rslt = await client.downloadDir(sourceFile, saveDestination);
      await this.uploadAndRunFullFlow(attachments, saveDestination, data);
      // remove folder files input
      fs.rmdirSync(saveDestination, { recursive: true });
      return { message: 'Download file from SFTP server successfully', file: attachments };
    } catch (error) {
      console.log(error);
      throw new BadRequestError({ errorCode: 313 });
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
      await client.access({
        host: dataAllMethod[0] ? dataAllMethod[0].host_ip : null,
        user: dataAllMethod[0] ? dataAllMethod[0].usr_id : null,
        password: dataAllMethod[0] ? dataAllMethod[0].usr_pwd : null,
      });
      await client.downloadToDir(saveDestination, sourceFile);
      client.close();
      const attachments = [];
      fs.readdirSync(saveDestination).forEach(file => {
        attachments.push(file);
      });
      logger.info(`Fetching attachment %s ${attachments}`);
      await this.uploadAndRunFullFlow(attachments, saveDestination, data);
      // remove folder files input
      fs.rmdirSync(saveDestination, { recursive: true });
      return { message: 'Download file from FTP server successfully', file: attachments };
    } catch (error) {
      throw new BadRequestError({ errorCode: 314 });
    }
  }

  static async uploadAndRunFullFlow(attachments, saveDestination, data) {
    for (let i = 0, len = attachments.length; i < len; i++) {
      try {
        const fileName = attachments[i];
        const filePath = `${saveDestination}/${fileName}`;
        const fileSize = (fs.statSync(filePath).size / 1024).toFixed(1);
        await ExtractionServices.saveExtractDocument({ ...data, root_nm: fileName, file_sz: fileSize }, fileName);
      } catch (err) {
        throw new BadRequestError({ errorCode: 313 });
      }
    }
  }
}
