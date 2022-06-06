import model from '~/shared/models';
const axios = require('axios');

// import model from '~/shared/models';

export default class CoreServices {
  constructor() {
    this.status = 400;
    this.dataRes = null;
  }

  static async checkDynamicType(data) {
    if (data) {
      const resData = {
        msg: '',
        is_dync: false,
        type: null,
      };
      this.dataRes = resData;
      return this.dataRes;
    }
    return 'No data';
  }

  static formatFileName(fileName) {
    this.dataRes = `${fileName.replace(/\.[^/.]+$/, '')}`;
    return this.dataRes;
  }

  static async saveOcrTrans(ipAddr, ocrEngine, fileUrl, docId, tmpltId, ocrDuration, ocrStatus, ocrEnv) {
    const createData = {
      ip_addr: ipAddr,
      ocr_eng_val: ocrEngine,
      file_url: fileUrl,
      doc_id: docId,
      tmplt_id: tmpltId,
      ocr_dur_val: ocrDuration,
      ocr_sts_val: ocrStatus,
      ocr_env_val: ocrEnv,
    };
    await model.DexOcrInfo.create(createData)
      .then(result => {
        if (!result) {
          this.dataRes = false;
          return this.dataRes;
        }
      })
      .catch(err => {
        throw err;
      });
  }
}
