import logger from '~/shared/logger';
import model from '~/shared/models';
import AppConstants from '../utils/constants';
import { getBaseCoreUrl, modifyCoreReqData } from '../utils/commonFuncs';
const axios = require('axios');

export default class BPServices {
  constructor() {
    this.dataRes = {};
  }

  static async getCoreSystemName(docTypeId) {
    if (!docTypeId) return AppConstants.CORE_SYS_NAME.MAIN;
    const foundDocType = await model.AdmDoc.findOne({
      where: { doc_tp_id: docTypeId },
      attributes: ['core_sys_nm'],
    });
    if (foundDocType) {
      this.dataRes = foundDocType.core_sys_nm;
    } else {
      throw new Error('Could not found doc type !!!');
    }
    return this.dataRes;
  }

  static async runMatching(coreDataReq, docTypeId) {
    try {
      const coreSysName = await this.getCoreSystemName(docTypeId);
      const baseCoreUrl = getBaseCoreUrl(coreSysName);
      coreDataReq = modifyCoreReqData(coreSysName, coreDataReq);
      logger.info(`Req matching from core ${baseCoreUrl}`);
      logger.info(JSON.stringify(coreDataReq));
      const matchingRes = await axios
        .create({
          baseURL: baseCoreUrl,
          headers: {
            'APP-API-ADDRESS': process.env.SERVER_URL,
          },
        })
        .post(AppConstants.CORE_API.MATCHING, coreDataReq);
      if (matchingRes && matchingRes.status === 200) {
        this.dataRes = matchingRes.data; // RAW data from CORE
      } else {
        throw new Error();
      }
    } catch (err) {
      logger.error(err);
      throw new Error('Calling Matching from Core Error');
    }
    return this.dataRes;
  }

  static async runSubmitTemplate(coreDataReq, docTypeId) {
    let coreSubmitTemplateRes = null;
    try {
      const coreSysName = await this.getCoreSystemName(docTypeId);
      const baseCoreUrl = getBaseCoreUrl(coreSysName);
      coreDataReq = modifyCoreReqData(coreSysName, coreDataReq);
      const fileUrl = coreDataReq.file_url || coreDataReq.root_url;
      const fileExtension = fileUrl
        .split('.')
        .pop()
        .toLowerCase();
      const isExcelFile = AppConstants.FILE_TYPE_DOC_EXCEL.includes(fileExtension);
      logger.info(`Req Submit template from core ${baseCoreUrl}`);
      logger.info(JSON.stringify(coreDataReq));
      const submitTemplateEndPoint = isExcelFile ? AppConstants.CORE_API.SUBMIT_TEMPLATE_EXCEL : AppConstants.CORE_API.SUBMIT_TEMPLATE;
      coreSubmitTemplateRes = await await axios
        .create({
          baseURL: baseCoreUrl,
          headers: {
            'APP-API-ADDRESS': process.env.SERVER_URL,
          },
        })
        .post(submitTemplateEndPoint, coreDataReq);
      if (coreSubmitTemplateRes && coreSubmitTemplateRes.status === 200) {
        const resultData = coreSubmitTemplateRes.data;
        resultData.status_code = 200;
        this.dataRes = coreSubmitTemplateRes.data; // RAW data from CORE
      } else {
        throw new Error('Calling Submit Template from Core Error');
      }
    } catch (err) {
      logger.error(err);
      const errRes = err.response;
      // For case status = 400, send to FE to render err message
      if (errRes && errRes.status === 400) {
        const resultData = errRes.data;
        resultData.status_code = 400;
        return errRes.data;
      }
      throw new Error('Calling Extraction from Core Error');
    }
    return this.dataRes;
  }

  static async runExtract(coreDataReq, docTypeId) {
    try {
      const coreSysName = await this.getCoreSystemName(docTypeId);
      const baseCoreUrl = getBaseCoreUrl(coreSysName);
      coreDataReq = modifyCoreReqData(coreSysName, coreDataReq);
      logger.info(`Req run extraction from core ${baseCoreUrl}`);
      logger.info(JSON.stringify(coreDataReq));
      const extractRes = await axios
        .create({
          baseURL: baseCoreUrl,
          headers: {
            'APP-API-ADDRESS': process.env.SERVER_URL,
          },
        })
        .post(AppConstants.CORE_API.EXTRACTION, coreDataReq);
      if (extractRes && extractRes.status === 200) {
        this.dataRes = extractRes.data; // RAW data from CORE
      } else {
        throw new Error();
      }
    } catch (err) {
      logger.error(err);
      throw new Error('Calling Extraction from Core Error');
    }
    return this.dataRes;
  }

  static async runGenNewFormat(coreDataReq, docTypeId) {
    try {
      const coreSysName = await this.getCoreSystemName(docTypeId);
      const baseCoreUrl = getBaseCoreUrl(coreSysName);
      coreDataReq = modifyCoreReqData(coreSysName, coreDataReq);
      logger.info(`Req generate new format core ${baseCoreUrl}`);
      logger.info(JSON.stringify(coreDataReq));
      const genFormatRes = await axios
        .create({
          baseURL: baseCoreUrl,
          headers: {
            'APP-API-ADDRESS': process.env.SERVER_URL,
          },
        })
        .post(AppConstants.CORE_API.GENERATE_FORMAT, coreDataReq);
      if (genFormatRes && genFormatRes.status === 200) {
        this.dataRes = genFormatRes.data; // RAW data from CORE
      } else {
        throw new Error();
      }
    } catch (err) {
      logger.error(err);
      throw new Error('Calling Generate new Format from Core Error');
    }
    return this.dataRes;
  }

  static async runOcrText(coreDataReq, docTypeId) {
    try {
      const coreSysName = await this.getCoreSystemName(docTypeId);
      const baseCoreUrl = getBaseCoreUrl(coreSysName);
      coreDataReq = modifyCoreReqData(coreSysName, coreDataReq);
      logger.info(`Req OCR text core ${baseCoreUrl}`);
      logger.info(JSON.stringify(coreDataReq));
      const ocrRes = await axios.post(baseCoreUrl + AppConstants.CORE_API.OCR_TEXT, coreDataReq);
      if (ocrRes && ocrRes.status === 200) {
        this.dataRes = ocrRes.data; // RAW data from CORE
      } else {
        throw new Error();
      }
    } catch (err) {
      logger.error(err);
      throw new Error('Calling OCR text from Core Error');
    }
    return this.dataRes;
  }
  
  static async runExcelInfo(coreDataReq) {
    try {
      const excelRes = await axios
        .create({
          headers: coreDataReq.getHeaders(),
        })
        .post(`${process.env.MAIN_CORE}${AppConstants.CORE_API.EXCEL_INFO}`, coreDataReq);
      if (excelRes && excelRes.status === 200) {
        this.dataRes = excelRes.data; // RAW data from CORE
      } else {
        throw new Error();
      }
    } catch (err) {
      logger.error(err);
      throw new Error('Calling api from Core Error');
    }
    return this.dataRes;
  }
}
