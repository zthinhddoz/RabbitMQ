import { log } from 'console';
import ConvertCsvService from './convertCsvService';
const axios = require('axios');
const _ = require('lodash');
const fs = require('fs');

// import model from '~/shared/models';

export default class LightWeightSercive {
  // Normal case
  static KEY_FRAME_NO = ['NO.', 'FR.NO.', 'FR.NO', 'Frame', 'No.', 'Framing'];
  static KEY_AP = ['A.P.', 'x-coord.', 'FROM AP', '(m) AP', 'AP', 'From A.P. (m)'];
  static START_AP_LIST = ["AFT END", "Aft limit", "Aft end", "START POINT", "START", "FRAME AFT", "XA", "XMIN", "Xa", "AFT.END"]
  static END_AP_LIST=["FORE END", "Fwd limit", "Fore end", "END POINT", "END", "FRAME FORE", "XF", "XMAX", "Xf", "FWD.END"]
  static LCG_LIST=["LCG from A.P.", "L.C.G", "L.C.G.", "LCG", "LCG (m)", "X", "XCG"]
  static Weight_LIST=["WEIGHT", "Weight", "W", "Mass"]
  // Format 2
  static FRAME = ["FR"]
  static AP_LIST = ["X"]
  static Weight_LIST_2 = ["WDFR"]
  
  static FRAME_LIST = "Frame List";
  static EOL = '+';
  static SEPARATOR = '^';
  static LIGHT_SHIP = "Light Ship"
  constructor() {
    this.status = 400;
    this.dataRes = null;
  }
  static sortNumber(a,b){
    return a - b;
  }
  static async getDataByIndex (gridData, listIdx) {
    const arrayData = [];
    for (const row of gridData) {
        if (row.length > listIdx.endAp && (/\d/.test(row[listIdx.startAp])) && (/\d/.test(row[listIdx.endAp])) && (/\d/.test(row[listIdx.lcg])) && (/\d/.test(row[listIdx.weight]))) {
            const newObj = {};
            newObj.startAp = row[listIdx.startAp];
            newObj.endAp = row[listIdx.endAp];
            newObj.lcg = row[listIdx.lcg];
            newObj.weight = row[listIdx.weight];
            arrayData.push(newObj);
        }
    }
    return arrayData;
  }
  static async getDataByIndexCase2 (gridData, listIdx) {
    const arrayData = [];
    for (const idx in listIdx.apList) {
      for (const row of gridData) {
        if (row.length > listIdx.apList[idx] && (/\d/.test(row[listIdx.apList[idx]])) && (/\d/.test(row[listIdx.weight2[idx]]))) {
          const newObj = {};
          newObj.frame = parseInt(row[listIdx.frame[idx]]);
          newObj.apList = row[listIdx.apList[idx]];
          newObj.weight2 = row[listIdx.weight2[idx]];
          arrayData.push(newObj);
        }
      }
    }
    return arrayData;
  }
  static async doFormatDataCase2 (data) {
    const arrayData = [];
    for (let rowIdx=0; rowIdx < data.length-1; rowIdx++) {
      const newObj = {};
      newObj.startAp = data[rowIdx].apList;
      newObj.endAp = data[rowIdx+1].apList;
      newObj.weight = data[rowIdx].weight2;
      arrayData.push(newObj);
    }
    return arrayData;
  }
  static async getDataByIndexCase3 (data, listIdx) {
    const arrayData = [];
    for (const idx in listIdx.listStartAp) {
      for (const row of data) {
        if (row.length > listIdx.listStartAp[idx] && (/\d/.test(row[listIdx.listEndAp[idx]])) && (/\d/.test(row[listIdx.listWeight[idx]]))) {
          const newObj = {};
          newObj.idx = parseInt(row[listIdx.listStartAp[idx]]);
          newObj.startAp = row[listIdx.listStartAp[idx]];
          newObj.endAp = row[listIdx.listEndAp[idx]];
          newObj.weight = row[listIdx.listWeight[idx]];
          arrayData.push(newObj);
      }
      }
    }
    return arrayData;
  }
  static async addLCG (data) {
    const arrayData = [];
    for (const item of data) {
      let lcgData = (parseFloat(item.startAp) + parseFloat(item.endAp))/2;
      item.lcg = lcgData.toFixed(2);
      arrayData.push(item);
    }
    return arrayData;
  }
  static async convertToCVPFormat (data) {
      let result =`${this.LIGHT_SHIP}=`;
      for (let item in data) {
        let record = '';
        if (item == 0) {
          record += parseFloat(data[item].startAp).toFixed(1);
        } else {
          record += this.SEPARATOR + parseFloat(data[item].startAp).toFixed(1);
        }
        record += this.SEPARATOR + parseFloat(data[item].endAp).toFixed(2);
        record += this.SEPARATOR + parseFloat(data[item].lcg).toFixed(2);
        record += this.SEPARATOR + "0.0" + this.SEPARATOR + "0.0" + this.SEPARATOR + parseFloat(data[item].weight).toFixed(2);
        result += record;
      }
      result += this.EOL;
      return result
  }
  static async replaceWrongData (data) {
    let result = data;  
    result = await result.replace('\nWEIGHT,LCG from A.P.,AFT END,FORE END', '\n,,WEIGHT,,,,LCG from A.P.,AFT END,FORE END,');
    result = await result.replace('\n,,,,Weight,Length,Aft end,Fore end,Y /CL', '\n,,Weight,,Length,Aft end,Fore end,Y /CL');
    result = await result.replace('\n,,,,Description,LCG (m),Z (/BL)', '\n,,Description,LCG (m),Z (/BL)');
    result = await result.replace('\n98,-2.1,58.500,6.450,55.31,61.76,0.000,61.600 ', '\n98,,-2.1,58.500,6.450,55.31,61.76,0.000,61.600 ');
    result = await result.replace('\n99,158.9,244.517,10.790,239.34,250.13,0.310,58.955 N', '\n99,,158.9,244.517,10.790,239.34,250.13,0.310,58.955 N');
    result = await result.replace('\nAFT END,FORE END,LENGTH,WEIGHT,L.C.G.,L-MOMENT', '\n,,,AFT END,,,FORE END,LENGTH,WEIGHT,L.C.G.,L-MOMENT');
    result = await result.replace('\nDISTRIBUTION RANGE,SECTION,SECTION,L.C.G,L-MOMENT', '\nDISTRIBUTION RANGE,SECTION,SECTION,,,,,L.C.G,L-MOMENT');
    result = await result.replace('\nAFT END,FORE END,LENGTH,WEIGHT,FROM L/2', '\n,,AFT END,,FORE END,LENGTH,WEIGHT,L.C.G');
    result = await result.replace('\nNAME,WEIGHT,X,START POINT,END POINT', '\nNAME,,WEIGHT,X,START POINT,END POINT');
    result = result.split('132.14 163+0.22').join('132.14,163+0.22');
    result = await result.replace('\n5,3.50 125.89', '\n5,3.50,125.89');
    result = await result.replace('\n6,4.20 123.48', '\n6,4.20,123.48');
    result = await result.replace('\n7,4.90 123.68', '\n7,4.90,123.68');
    result = await result.replace('\n8,5.60 123.88', '\n8,5.60,123.88');
    result = await result.replace('\n9,6.30 125.75', '\n9,6.30,125.75');
    result = await result.replace('\n10,7.00 125.95', '\n10,7.00,125.95');
    result = await result.replace('\n11,7.70 126.15', '\n11,7.70,126.15');
    result = await result.replace('\n12,8.40 114.45', '\n12,8.40,114.45');
    result = await result.replace('\n13,9.10 114.65', '\n13,9.10,114.65');
    result = await result.replace('\n14,9.80 114.85', '\n14,9.80,114.85');
    result = await result.replace('\n15,10.58 115.21', '\n15,10.58,115.21');
    result = await result.replace('\n16,11.36 115.17', '\n16,11.36,115.17');
    result = await result.replace('\nITEM,AFT END,FORE END,L-MOMENT,WEIGHT,LCG', '\nITEM,AFT END,FORE END,L-MOMENT,,,WEIGHT,LCG');
    result = await result.replace('-6.78 (A.E)', '-6.78');
    result = await result.replace('0 (A.P)', '0');
    result = await result.replace('\nID,W,XCG,YCG,ZCG,XMIN,FRMIN,XMAX,FRMAX', '\n,ID,W,XCG,YCG,ZCG,XMIN,FRMIN,XMAX,FRMAX');
    result = await result.replace('\n,,WEIGHT,LCG,TCG,ZCG,XMIN,XMAX', '\n,,,WEIGHT,LCG,TCG,ZCG,XMIN,XMAX');
    return result;
  }
  static async getLightWeightData(data) {
    let measureUnit = 'm';
    const cleanedData = await this.replaceWrongData(data);
    const gridData = [];
    const listIdx = {};
    let result = '';
    for (const row of cleanedData.split('\n')) {
        const rowData = row.split(',');
        for(const idxItem in rowData) {
            if (rowData[idxItem] === 'mm') {
                measureUnit = 'mm';
            }
            if (listIdx.startAp && listIdx.endAp && listIdx.lcg && listIdx.weight) {
              continue;
            }
            if (!listIdx.startAp) listIdx.listStartAp = [];
            if (this.START_AP_LIST.includes(rowData[idxItem])) {
              listIdx.startAp = idxItem;
              listIdx.listStartAp.push(idxItem);
            };

            if (!listIdx.endAp) listIdx.listEndAp = [];
            if (this.END_AP_LIST.includes(rowData[idxItem])) {
              listIdx.endAp = idxItem;
              listIdx.listEndAp.push(idxItem);
            };

            if (!listIdx.lcg) {
              if (this.LCG_LIST.includes(rowData[idxItem])) listIdx.lcg = idxItem;
            }

            if (!listIdx.weight) listIdx.listWeight = [];
            if (this.Weight_LIST.includes(rowData[idxItem])) {
              listIdx.weight = idxItem;
              listIdx.listWeight.push(idxItem);
            };
            if (!listIdx.frame) listIdx.frame = [];
            if (!listIdx.apList) listIdx.apList = [];
            if (!listIdx.weight2) listIdx.weight2 = [];
            if (this.FRAME.includes(rowData[idxItem])  && !listIdx.frame.includes(idxItem)) listIdx.frame.push(idxItem);
            if (this.AP_LIST.includes(rowData[idxItem]) && !listIdx.apList.includes(idxItem)) listIdx.apList.push(idxItem);
            if (this.Weight_LIST_2.includes(rowData[idxItem]) && !listIdx.weight2.includes(idxItem)) listIdx.weight2.push(idxItem);
        }
        gridData.push(rowData);
    }
    if (listIdx.startAp && listIdx.endAp && listIdx.lcg && listIdx.weight) {
      // normal case
      // http://10.0.26.200:8081/vessel_profiles/1653470890578_LightWeight_Case1_KMTC.pdf
      result = await this.getDataByIndex(gridData, listIdx);
    } else if (listIdx.frame.length > 0 && listIdx.apList.length > 0 && listIdx.weight2.length > 0) {
      // case 2
      // http://10.0.26.200:8081/vessel_profiles/1653926813389_LightWeight_Case9_SCNO.pdf
      result = await this.getDataByIndexCase2(gridData, listIdx);
      result = result.sort(ConvertCsvService.dynamicSort('frame'));
      result = await this.doFormatDataCase2(result);
      result = await this.addLCG(result);
    } else {
      // case 3
      // http://10.0.26.200:8081/vessel_profiles/1653987409940_LightWeight_Case10_SCSA.pdf
      result = await this.getDataByIndexCase3(gridData, listIdx);
      result = result.sort(ConvertCsvService.dynamicSort('idx'));
      result = await this.addLCG(result);
    }
    if (result) {
      result = await this.convertToCVPFormat(result, measureUnit);
    }
    return result;
  }
}
