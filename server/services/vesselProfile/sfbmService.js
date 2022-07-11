import { log } from 'console';
import ConvertCsvService from './convertCsvService';
const axios = require('axios');
const _ = require('lodash');
const fs = require('fs');

// import model from '~/shared/models';

export default class SfbmSercive {
  // Normal case
  static EOL = '+';
  static SEPARATOR = '^';
  static SFBM_LIST= "Frame";
  constructor() {
    this.status = 400;
    this.dataRes = null;
  }
  static sortNumber(a,b){
    return a - b;
  }
  static isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
  }

  static async convertToCVPFormat (data) {
      let result =`${this.SFBM_LIST}=`;
      if (data) {
        const lineNo = Object.keys(data).length;
        result += lineNo + this.SEPARATOR;
        Object.keys(data).forEach(frameNo => {
          result += parseInt(frameNo).toFixed(3).toString() + this.SEPARATOR;
          result += data[frameNo].AP + this.SEPARATOR;
          result += "0" + this.SEPARATOR + "0" + this.SEPARATOR;
          // Check rule
          // Rule: 
          //   + if sag = 0 then -2
          //   + if hog = 0 then 1
          if (data[frameNo].BM.HogSea === '0') {
            data[frameNo].BM.HogSea = 1;
          }
          if (data[frameNo].BM.HogPort === '0') {
            data[frameNo].BM.HogPort = 1;
          }
          if (data[frameNo].SF.HogSea === '0') {
            data[frameNo].SF.HogSea = 1;
          }
          if (data[frameNo].SF.HogPort === '0') {
            data[frameNo].SF.HogPort = 1;
          }
          if (data[frameNo].BM.SagSea === '0') {
            data[frameNo].BM.SagSea = -2;
          }
          if (data[frameNo].BM.SagPort === '0') {
            data[frameNo].BM.SagPort = -2;
          }
          if (data[frameNo].SF.SagSea === '0') {
            data[frameNo].SF.SagSea = -2;
          }
          if (data[frameNo].SF.SagPort === '0') {
            data[frameNo].SF.SagPort = -2;
          }
          result += Object.values(data[frameNo].SF).join(this.SEPARATOR) + this.SEPARATOR;
          result += Object.values(data[frameNo].BM).join(this.SEPARATOR) + this.SEPARATOR;
          if (data[frameNo].TM != 0) {
            result += data[frameNo].TM + this.SEPARATOR;
            result += '-'  + data[frameNo].TM + this.SEPARATOR;
            result += data[frameNo].TM + this.SEPARATOR;
            result += '-' + data[frameNo].TM + this.SEPARATOR;
          } else {
            result += '0^0^0^0^';
          }
        })
        result += this.EOL;
      }
      
      return result
  }
  static async replaceWrongData (data) {
    let result = data;  
    result = await result.replace(',NO.,A.P.(m) Mid Ship,HOG.,SAG.,HOG.,SAG.,POSITIVE NEGATIVE POSITIVE NEGATIVE,', 'NO.,,A.P.(m),Mid Ship,HOG.,SAG.,HOG.,SAG.,POSITIVE,NEGATIVE,POSITIVE,NEGATIVE,');
    result = await result.replace(',,,Hogging Min.Hog. Hogging Min.Hog. Hogging,Sagging,Hogging Min.Hog. Hogging Min.Hog. Hogging Hogging,Sagging', 'No.,AP,Hogging,Min.Hog.,Hogging,Sagging,Hogging,Min.Hog.,Hogging,Sagging');
    result = await result.replace('53+750', '54');
    result = await result.replace('76+700', '76');
    result = await result.replace(',(+),,(-),,(+),(-)', ',,,,,(+),(-),(+),(-)');
    result = await result.replace(',,Negative,,,Negative Positive,Positive', ',Negative,,,,,Negative,Positive,Positive');
    result = await result.replace(',FR.,Positive,,Negative,positive/negative', ',FR.,Positive,,,Negative,,positive/negative');
    result = await result.replace('FR.,Hogging,,Sagging,Hogging,Sagging', 'FR.,Hogging,,Sagging,Hogging,,,Sagging');
    result = await result.replace('14,150000,,,0,,253000,-,250000', '14,150000,,0,253000,-,,250000');
    result = await result.replace('32,600000,,,0,,1479000,-,1468000', '32,600000,,0,1479000,-,,1468000');
    result = await result.replace('50,1100000,,,0,,2700000,-,2682000', '50,1100000,,0,2700000,-,,2682000');
    result = await result.replace('69,1700000,,,0,,3498000,-,3472000', '69,1700000,,0,3498000,-,,3472000');
    result = await result.replace('87,2100000,,,0,,3976000,-,3943000', '87,2100000,,0,3976000,-,,3943000');
    result = await result.replace('249,700000,,0,,,2620000,2588000', '249,700000,,0,2620000,,,2588000');
    result = await result.replace('267,450000,,0,,,1945000,1922000', '267,450000,,0,1945000,,,1922000');
    result = await result.replace('285,250000,,0,,,1399000,1384000', '285,250000,,0,1399000,,,1384000');
    result = await result.replace('301,125000,,0,,,1364000,1356000', '301,125000,,0,1364000,,,1356000');
    result = await result.replace('-8,550', '-8550');
    result = await result.replace('-5,950', '-5950');
    result = await result.replace('101,400', '101400');
    result = await result.replace('2,700', '2700');
    result = await result.replace('65,000', '65000');
    result = await result.replace('210,214', '210214');
    result = await result.replace('52700,-400,1200', '52,700,-400,1200');
    result = await result.replace(',,,(TON-M)', ',,,,,(TON-M)');
    result = await result.replace(',Hogging Sagging,Hogging,,Sagging', ',Hogging,Sagging,Hogging,Sagging');
    result = await result.replace(',Hogging,Sagging,NEGATIVE,POSITIVE,Hogging,Sagging,Hogging,Sagging', 'FRAME,Hogging,Sagging,NEGATIVE,POSITIVE,Hogging,Sagging,Hogging,Sagging');
    return result;
  }
  static async getDataByIndexCase1 (gridData) {
    const objectData = {};
    const FRAME_NO = ['FRAME', 'NO.'];
    const AP_NO = ['A.P.(m)'];
    const BM_LIST = ['hog.', 'sag.', 'hogging', 'sagging'];
    const SF_LIST = ['positive', 'negative', 'hogging', 'sagging'];
    const START_POINT = ['*. Metric - Unit', 'SWBM(MT-M)', 'SHEAR FORCE (MT)', 'BENDING MOMENT (MT-M)', 'Bending moment'];
    const listIdx = {'BM': [], 'SF': []};
    let checkStartPoint = false;
    for (let row of gridData) {
      if (!listIdx.frame || listIdx.BM.length == 0 || listIdx.SF.length == 0) {
        for (let idx in row) {
          if (!checkStartPoint) {
            if (START_POINT.includes(row[idx])) checkStartPoint = true;
          } else {
            if (AP_NO.includes(row[idx])) {
              listIdx.ap = idx;
            }
            if (FRAME_NO.includes(row[idx])) {
              listIdx.frame = idx;
            }
            if (listIdx.BM.length < 4 && BM_LIST.includes(row[idx].toLowerCase())) {
              listIdx.BM.push(idx);
            } else if (listIdx.SF.length < 4 && SF_LIST.includes(row[idx].toLowerCase())) {
              listIdx.SF.push(idx);
            }
          }
        }
      } else {
        if (row[listIdx.frame] && this.isNumeric(row[listIdx.frame]) && this.isNumeric(row[listIdx.frame])) {
          objectData[row[listIdx.frame]] = {'AP': 0,'TM': 0, 'BM': {}, 'SF': {}};
          if (listIdx.ap && row[listIdx.ap]) {
            objectData[row[listIdx.frame]].AP = (parseFloat(row[listIdx.ap])*100).toFixed(0).toString();
          }
          objectData[row[listIdx.frame]].BM.HogSea = (parseInt(row[listIdx.BM[0]])).toString();
          objectData[row[listIdx.frame]].BM.SagSea = (parseInt(row[listIdx.BM[1]])).toString();
          objectData[row[listIdx.frame]].BM.HogPort = (parseInt(row[listIdx.BM[2]])).toString();
          objectData[row[listIdx.frame]].BM.SagPort = (parseInt(row[listIdx.BM[3]])).toString();
          objectData[row[listIdx.frame]].SF.HogSea = (parseInt(row[listIdx.SF[0]])).toString();
          objectData[row[listIdx.frame]].SF.SagSea = (parseInt(row[listIdx.SF[1]])).toString();
          objectData[row[listIdx.frame]].SF.HogPort = (parseInt(row[listIdx.SF[2]])).toString();
          objectData[row[listIdx.frame]].SF.SagPort = (parseInt(row[listIdx.SF[3]])).toString();
        }
      }
    }
    return objectData;
  }
  static async getDataByIndexCase2 (gridData) {
    const objectData = {};
    const FRAME_NO = ['No.'];
    const AP_NO = ['AP'];
    const LIST_KEY = ['Hogging', 'Min.Hog.', 'Sagging'];
    const listIdx = {'BM': [], 'SF': []};
    for (let row of gridData) {
      if (!listIdx.ap || !listIdx.frame || listIdx.BM.length == 0 || listIdx.SF.length == 0) {
        for (let idx in row) {
          if (AP_NO.includes(row[idx])) {
            listIdx.ap = idx;
          }
          if (FRAME_NO.includes(row[idx])) {
            listIdx.frame = idx;
          }
          if (LIST_KEY.includes(row[idx])) {
            if (listIdx.BM.length < 4) {
              listIdx.BM.push(idx);
            } else {
              listIdx.SF.push(idx);
            }
          }
        }
      } else {
        if (this.isNumeric(row[0]) && this.isNumeric(listIdx.ap) && this.isNumeric(listIdx.frame)) {
          objectData[row[listIdx.frame]] = {'TM': 0, 'BM': {}, 'SF': {}};
          objectData[row[listIdx.frame]].AP = (parseFloat(row[listIdx.ap])*100).toFixed(0).toString();
          objectData[row[listIdx.frame]].BM.HogSea = (parseInt(row[listIdx.BM[0]])).toString();
          objectData[row[listIdx.frame]].BM.SagSea = (parseInt(row[listIdx.BM[1]])).toString();
          objectData[row[listIdx.frame]].BM.HogPort = (parseInt(row[listIdx.BM[2]])).toString();
          objectData[row[listIdx.frame]].BM.SagPort = (parseInt(row[listIdx.BM[3]])).toString();
          objectData[row[listIdx.frame]].SF.HogSea = (parseInt(row[listIdx.SF[0]])).toString();
          objectData[row[listIdx.frame]].SF.SagSea = (parseInt(row[listIdx.SF[1]])).toString();
          objectData[row[listIdx.frame]].SF.HogPort = (parseInt(row[listIdx.SF[2]])).toString();
          objectData[row[listIdx.frame]].SF.SagPort = (parseInt(row[listIdx.SF[3]])).toString();
        }
      }
    }
    return objectData;
  }

  static async getDataByIndexCase3 (gridData) {
    const objectData = {};
    const FRAME_NO = ['Position', 'NO.', 'No.', 'Fr.No.', 'Fr'];
    const LIST_KEY = ['hog(+)',	'sag(-)', '(+)', '(-)', 'hogging', 'sagging', 'positive',	'negative', '+', '-'];
    const CHECKBM = ['bending moment', 'bending moment (ton-m)', 'permissible still water bending moments.', 'permissible still water bending moment (ton-metres)', 'max. allowable still water bending moment (mt-m)',
    'permissible value of still bending moments[kn.m]'];
    const CHECKSF = ['shear force', 'shear force (ton)', 'permissible still water shear force', 'permissible still water shear force (ton)', 'max. allowable still water shear force (tonnes)',
    'permissible value of still water shear forces [kn]'];
    const TM = ['(ton-m)'];
    const listIdx = {'BM': [], 'SF': []};
    let sfbm = null;
    for (let row of gridData) {
      for (let idx in row) {
        if (FRAME_NO.includes(row[idx])) {
          listIdx.frame = idx;
        }
        if (CHECKBM.includes(row[idx].toLowerCase())) sfbm = 'BM';
        if (CHECKSF.includes(row[idx].toLowerCase())) sfbm = 'SF';
        if (LIST_KEY.includes(row[idx].toLowerCase())) {
          if (sfbm === 'BM') {
            listIdx.BM.push(idx);
          } else if (sfbm === 'SF') {
            listIdx.SF.push(idx);
          }
        }
        if (TM.includes(row[idx].toLowerCase())) listIdx.TM = idx;
      }
      if (sfbm && row[listIdx.frame] && this.isNumeric(row[listIdx.frame].replace('FR.', '').split('(')[0])) {
        const frameNo = row[listIdx.frame].replace('FR.', '').split('(')[0];
        if (!objectData.hasOwnProperty(frameNo)) objectData[frameNo] = {AP: 0, TM: 0, BM: {}, SF: {}};
        objectData[frameNo][sfbm].HogSea = (parseInt(row[listIdx[sfbm][0]])).toString();
        objectData[frameNo][sfbm].SagSea = (parseInt(row[listIdx[sfbm][1]])).toString();
        objectData[frameNo][sfbm].HogPort = (parseInt(row[listIdx[sfbm][2]])).toString();
        objectData[frameNo][sfbm].SagPort = (parseInt(row[listIdx[sfbm][3]])).toString();
        if (listIdx.TM && !objectData[frameNo].TM) {
          objectData[frameNo].TM = (parseInt(row[listIdx.TM])).toString();
        }
      }
    }
    return objectData;
  }

  static async getDataByIndexCase4 (gridData) {
    const objectData = {};
    const FRAME_NO = ['FRAME', 'No.'];
    const LIST_KEY = ['POSITIVE / NEGATIVE', 'POSITIVE / NEGATIVE',	'HOGGING', 'HOGGING'];
    const BREAK_POINT = ['117.5'];
    const LIST_TM = ['MT-M'];
    const listIdx = {'BM': [], 'SF': []};
    let frameTmBefore = 0;
    let flagRun = true;
    for (let row of gridData) {
      for (let idx in row) {
        if (FRAME_NO.includes(row[idx])) {
          listIdx.frame = idx;
        }
        if (LIST_KEY.includes(row[idx])) {
          if (listIdx.SF.length === 2) {
            listIdx.BM.push(idx);
          } else {
            listIdx.SF.push(idx);
          }
        }
        if (!flagRun && !listIdx.TM) {
          if (LIST_TM.includes(row[idx])) {
            listIdx.TM = idx;
          }
        }
      }
      if (row[listIdx.frame] && this.isNumeric(row[listIdx.frame])) {
        if (flagRun) {
          const frameNo = row[listIdx.frame];
          if (!objectData.hasOwnProperty(frameNo)) objectData[frameNo] = {AP: 0, TM: 0, BM: {}, SF: {}};
          objectData[frameNo].BM.HogSea = row[listIdx.BM[0]];
          objectData[frameNo].BM.SagSea = '-' + row[listIdx.BM[0]];
          objectData[frameNo].BM.HogPort = row[listIdx.BM[1]];
          objectData[frameNo].BM.SagPort = '-' + row[listIdx.BM[1]];
          objectData[frameNo].SF.HogSea = row[listIdx.SF[0]];
          objectData[frameNo].SF.SagSea = '-' + row[listIdx.SF[0]];
          objectData[frameNo].SF.HogPort = row[listIdx.SF[1]];
          objectData[frameNo].SF.SagPort = '-' + row[listIdx.SF[1]];
        }
        if (!flagRun && this.isNumeric(row[listIdx.TM])) {
          const frameNo = row[listIdx.frame];
          const listFrame = Object.keys(objectData);
          for (let frameNo of listFrame) {
            if (frameNo > frameTmBefore && frameNo <= row[listIdx.frame] || frameNo === '0') {
              objectData[frameNo].TM = (parseFloat(row[listIdx.TM])*1000).toString();
            }
          }
          frameTmBefore = frameNo;
        }
      }
      if (BREAK_POINT.includes(row[0])) flagRun = false;
    }
    return objectData;
  }
  static async getDataByIndexCase5 (gridData) {
    const objectData = {};
    const FRAME_NO = ['FR.'];
    const LIST_KEY = ['Positive', 'Negative', 'Hogging', 'Sagging'];
    const BEGIN_SF = ['SF in kN'];
    const BEGIN_BM = ['BM in kN m'];
    let sfbm = null;
    const BOTH_HOG_SAG = ['positive/negative'];
    const listIdx = {'BM': [], 'SF': []};
    for (let row of gridData) {
      for (let idx in row) {
        if (BEGIN_SF.includes(row[idx])) sfbm = 'SF';
        else if (BEGIN_BM.includes(row[idx])) sfbm = 'BM';
        else if (sfbm && LIST_KEY.includes(row[idx])) {
          listIdx[sfbm].push(idx);
        } else if (sfbm && BOTH_HOG_SAG.includes(row[idx])) {
          listIdx[sfbm].push(idx);
          listIdx[sfbm].push(idx);
        } else if (FRAME_NO.includes(row[idx])) listIdx.frame = idx;
      }
      if (row[listIdx.frame] && this.isNumeric(row[listIdx.frame])) {
        const frameNo = row[listIdx.frame];
        if (!objectData.hasOwnProperty(frameNo)) objectData[frameNo] = {AP: 0, TM: 0, BM: {}, SF: {}};
        objectData[frameNo][sfbm].HogSea = row[listIdx[sfbm][0]];
        objectData[frameNo][sfbm].SagSea = '-' + row[listIdx[sfbm][1]];
        objectData[frameNo][sfbm].HogPort = row[listIdx[sfbm][2]];
        objectData[frameNo][sfbm].SagPort = '-' + row[listIdx[sfbm][3]];
      }
    }
    return objectData;
  }

  static getCase(cleanedData, gridData) {
    if (cleanedData.includes('±')) {
      return 5;
    }
    if (cleanedData.includes('Metric - Unit') || cleanedData.includes('Hogging,Sagging,Hogging,Sagging,Positive,Negative,Positive,Negative')
    || cleanedData.includes('positive,negative,positive,negative,hogging,sagging,hogging,sagging')
    || cleanedData.includes('HOGGING,SAGGING,HOGGING,SAGGING,POSITIVE,NEGATIVE,POSITIVE,NEGATIVE')
    || cleanedData.includes('Hogging,Sagging,NEGATIVE,POSITIVE,Hogging,Sagging,Hogging,Sagging')) {
      return 1;
    }
    if (cleanedData.includes('POSITIVE / NEGATIVE')) {
      return 4;
    }
    if ((/FR.[\d]/g).test(cleanedData)) {
      return 3;
    }
    for (let row of gridData) {
      if (this.isNumeric(row[0])) {
        if (row.length === 10 && this.isNumeric(row[1]) && this.isNumeric(row[9])) {
          console.log(row);
          return 2;
        }
        if (row.length === 5 || row.length === 6) {
          return 3;
        }
      }
    }
    if (cleanedData.includes('FR.')) return 3;
    return 0;
  }
  static async getSfbmData(data) {
    const cleanedData = await this.replaceWrongData(data);
    const gridData = [];
    let result = '';
    for (const row of cleanedData.split('\n')) {
      const rowData = row.split(',');
      gridData.push(rowData);
    }
    let checkCase = this.getCase(cleanedData, gridData);
    if (checkCase === 1) {
      // http://10.0.26.200:8081/vessel_profiles/1656521540904_SFBM_case1_KMB.pdf
      result = await this.getDataByIndexCase1(gridData);
    } else if (checkCase === 2) {
      // http://10.0.26.200:8081/vessel_profiles/1656521701324_SFBM_case2_KAK.pdf
      result = await this.getDataByIndexCase2(gridData);
    } else if (checkCase === 3) {
    //http://10.0.26.200:8081/vessel_profiles/1656521749325_SFBM_case3_KNB.pdf
      result = await this.getDataByIndexCase3(gridData);
    } else if (checkCase === 4) {
      //http://10.0.26.200:8081/vessel_profiles/1656521840964_SFBM_Case5_SCSZ.pdf
      result = await this.getDataByIndexCase4(gridData);
    }
    else if (checkCase === 5) {
      //http://10.0.26.200:8081/vessel_profiles/1656662995943_SFBM_Case6_SCVP.pdf
      result = await this.getDataByIndexCase5(gridData);
    }
    if (result) {
      result = await this.convertToCVPFormat(result);
    }
    return result;
  }
}
