import { log } from 'console';
const axios = require('axios');
const _ = require('lodash');
const fs = require('fs');

// import model from '~/shared/models';

export default class LightWeightSercive {
  static KEY_FRAME_NO = ['NO.', 'FR.NO.', 'FR.NO', 'Frame', 'No.', 'Framing'];
  static KEY_AP = ['A.P.', 'x-coord.', 'FROM AP', '(m) AP', 'AP', 'From A.P. (m)'];
  static FRAME_LIST = "Frame List";
  static START_AP_LIST = ["AFT END", "Aft limit", "Aft end", "START POINT", "START", "FRAME AFT", "XA", "XMIN", "Xa", "AFT.END"]
  static END_AP_LIST=["FORE END", "Fwd limit", "Fore end", "END POINT", "END", "FRAME FORE", "XF", "XMAX", "Xf", "FWD.END"]
  static LCG_LIST=["LCG from A.P.", "L.C.G", "L.C.G.", "LCG", "LCG (m)", "X", "XCG"]
  static Weight_LIST=["WEIGHT", "Weight", "W", "Mass"]
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
    result = await result.replace('\nWEIGHT,LCG from A.P.,AFT END,FORE END', '\n,,WEIGHT,,LCG from A.P.,,AFT END,,FORE END,');
    result = await result.replace('\n,,,,Weight,Length,Aft end,Fore end,Y /CL', '\n,,Weight,,Length,Aft end,Fore end,Y /CL');
    result = await result.replace('\n,,,,Description,LCG (m),Z (/BL)', '\n,,Description,LCG (m),Z (/BL)');
    result = await result.replace('\n98,-2.1,58.500,6.450,55.31,61.76,0.000,61.600 ', '\n98,,-2.1,58.500,6.450,55.31,61.76,0.000,61.600 ');
    result = await result.replace('\n99,158.9,244.517,10.790,239.34,250.13,0.310,58.955 N', '\n99,,158.9,244.517,10.790,239.34,250.13,0.310,58.955 N');
    result = await result.replace('\nAFT END,FORE END,LENGTH,WEIGHT,L.C.G.,L-MOMENT', '\n,,,AFT END,,,FORE END,LENGTH,WEIGHT,L.C.G.,L-MOMENT');
    result = await result.replace('\nDISTRIBUTION RANGE,SECTION,SECTION,L.C.G,L-MOMENT', '\nDISTRIBUTION RANGE,SECTION,SECTION,,,,,L.C.G,L-MOMENT');
    result = await result.replace('\nAFT END,FORE END,LENGTH,WEIGHT,FROM L/2', '\n,,AFT END,,FORE END,LENGTH,WEIGHT,L.C.G');
    result = await result.replace('\nNAME,WEIGHT,X,START POINT,END POINT', '\nNAME,,WEIGHT,X,START POINT,END POINT');
    result = result.split('132.14 163+0.22').join('132.14,163+0.22');
    return result;
  }
  static async getLightWeightData(data) {
    let measureUnit = 'm';
    const cleanedData = await this.replaceWrongData(data);
    const gridData = [];
    const listIdx = {};
    let result = '';
    for (const row of cleanedData.split('\n')) {
        const arrData = [];
        const rowData = row.split(',');
        for(const idxItem in rowData) {
            if (rowData[idxItem] === 'mm') {
                measureUnit = 'mm';
            }
            arrData.push(rowData[idxItem]);
            if (listIdx.startAp && listIdx.endAp && listIdx.lcg && listIdx.weight) {
              continue;
            }
            if (!listIdx.startAp) {
                if (this.START_AP_LIST.includes(rowData[idxItem])) {
                  listIdx.startAp = idxItem;
                }
            }
            if (!listIdx.endAp) {
              if (this.END_AP_LIST.includes(rowData[idxItem])) {
                listIdx.endAp = idxItem;
              }
            }
            if (!listIdx.lcg) {
              if (this.LCG_LIST.includes(rowData[idxItem])) {
                listIdx.lcg = idxItem;
              }
            }
            if (!listIdx.weight) {
              if (this.Weight_LIST.includes(rowData[idxItem])) {
                listIdx.weight = idxItem;
              }
            }
        }
        gridData.push(arrData);
    }
    if (listIdx.startAp && listIdx.endAp && listIdx.lcg && listIdx.weight) {
        result = await this.getDataByIndex(gridData, listIdx);
    }
    if (result) {
        result = await this.convertToCVPFormat(result, measureUnit);
    }
    return result;
  }
}
