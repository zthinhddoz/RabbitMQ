import { log } from 'console';
import ConvertCsvService from './convertCsvService';
const axios = require('axios');
const _ = require('lodash');
const fs = require('fs');

// import model from '~/shared/models';

export default class BonjeanSercive {
  // Normal case
  static DRAFT = ["T", "DRAFT", "DRAFT (EXT.)"]
  static AREA = ["AREA", "WIND AREA"]
  static POSITION = ["MOM BL", "The table applies for trim = "]
  static POSITION_CASE2 = ["The table applies for trim = "];
  static EOL = '+\r';
  static SEPARATOR = '^';
  static LIGHT_SHIP = "Light Ship"
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
      let result =``;
      let count = 0;
      const listPosition = Object.keys(data).sort(function(a, b){return a - b});
      for (let item of listPosition) {
        let bonjean = `Bonjean=${parseFloat(item).toFixed(3)}`;
        for (let idx in data[item]) {
          for (let draft in data[item][idx]) {
            bonjean += `${this.SEPARATOR}${draft}${this.SEPARATOR}${data[item][idx][draft]}`
          }
        }
        count += 1;
        if (count < Object.keys(data).length) {
          result += `${bonjean}\r\n`;
        } else {
          result += bonjean;
        }
      }
      result += this.EOL;
      return result
  }
  static async replaceWrongData (data) {
    let result = data;  
    result = await result.replace(/The table applies for trim = /g, 'The table applies for trim = ,');
    result = await result.replace(/ m in upright condition/g, ', m in upright condition');
    result = await result.replace(/x=-4.6m x=-4m/g, 'x=-4.6m,x=-4m');
    result = await result.replace(/x=95m x=100m x=105m x=110m x=115m/g, 'x=95m,x=100m,x=105m,x=110m,x=115m');
    result = await result.replace(/x=120m x=125m x=130m x=135m x=140m x=145m x=150m x=155m x=160m x=165m x=170m x=175m x=180m x=185m x=190m/g, 'x=120m,x=125m,x=130m,x=135m,x=140m,x=145m,x=150m,x=155m,x=160m,x=165m,x=170m,x=175m,x=180m,x=185m,x=190m');
    result = await result.replace(/x=195m x=200m x=205m x=210m x=215m x=220m x=225m x=230m x=232m x=234m x=236m x=238m x=240m x=242m x=244m/g, 'x=195m,x=200m,x=205m,x=210m,x=215m,x=220m,x=225m,x=230m,x=232m,x=234m,x=236m,x=238m,x=240m,x=242m,x=244m');
    result = await result.replace(/x=246m x=248m x=250m x=252m x=254m x=256m x=258m x=260m x=262m x=264m x=266m x=268m x=270m x=272m x=274m/g, 'x=246m,x=248m,x=250m,x=252m,x=254m,x=256m,x=258m,x=260m,x=262m,x=264m,x=266m,x=268m,x=270m,x=272m,x=274m');
    result = await result.replace(/x=276m x=278m x=290m x=292m x=294m/g, 'x=276m,x=278m,x=290m,x=292m,x=294m');
    result = await result.replace(/.�/g, '');
    result = await result.replace(/m2/g, '');
    result = await result.replace(/m3/g, '');
    return result;
  }
  static async getDataByIndexCase1 (gridData, listIdx) {
    const objectData = {};
    let positionVal = [];
    for (const row of gridData) {
      if (row.length > 3) {
        if (!(this.isNumeric(row[0]))) {
          const item1 = row[parseInt(2)].replace('x=','').replace('m','');
          const item2 = row[parseInt(3)].replace('x=','').replace('m','');
          if (this.isNumeric(item1) || this.isNumeric(item2)) {
            positionVal = [];
          }
          for (let idxItem in row) {
            const item = row[idxItem].replace('x=','').replace('m','');
            if (this.isNumeric(item)) {
              positionVal.push(item);
            }
          }
        } else {
          if (positionVal.length > 0) {
            for (const idxKey in positionVal) {
              if (positionVal[idxKey]) {
                if (row[idxKey] && positionVal[idxKey] && !objectData.hasOwnProperty(positionVal[idxKey])) objectData[positionVal[idxKey]] = [];
                const idxDraft = listIdx.draft[0];
                const objTemp = {};
                objTemp[row[idxDraft]]= row[listIdx.area[idxKey]];
                if (objTemp)  objectData[positionVal[idxKey]].push(objTemp);
              }
            }
          }
        }
      }
      }
    return objectData;
  }
  static async getDataByIndexCase2 (gridData, listIdx) {
    const objectData = {};
    let positionVal = null;
    for (const row of gridData) {
      if (!(this.isNumeric(row[0]))) {
        for (const idxItem in row) {
          if (this.POSITION_CASE2.includes(row[idxItem])) {
            positionVal = row[parseInt(idxItem+1)] || row[parseInt(idxItem+2)];
            break;
          }
        }
      } 
      else {
        if (positionVal) {
          if (row[listIdx.area[0]] && positionVal && !objectData.hasOwnProperty(positionVal)) objectData[positionVal] = [];
          let objTemp = {};
          objTemp[row[listIdx.draft[0]]]= row[listIdx.area[0]];
          if (objTemp)  objectData[positionVal].push(objTemp);
        }
      }
    }
    return objectData;
  }
  static async getBonjeanData(data) {
    const cleanedData = await this.replaceWrongData(data);
    const gridData = [];
    const listIdx = {};
    let result = '';
    let checkCase = 1;
    for (const row of cleanedData.split('\n')) {
        const rowData = row.split(',');
        for(const idxItem in rowData) {
            if (this.POSITION_CASE2.includes(rowData[idxItem])) {
              checkCase = 2;
            }
            if (!listIdx.draft) {
              if (this.DRAFT.includes(rowData[idxItem])) listIdx.draft = idxItem;
            }
            if (!listIdx.area) {
              listIdx.area = [];
            }
            if (this.AREA.includes(rowData[idxItem]) && !listIdx.area.includes(idxItem)) listIdx.area.push(idxItem);
        }
        gridData.push(rowData);
    }
    if (listIdx.draft && listIdx.area) {
      if (checkCase === 1) {
        // http://10.0.26.200:8081/vessel_profiles/1654073316372_Bonjean_Case1_SCNO.pdf
        result = await this.getDataByIndexCase1(gridData, listIdx);
      } else if (checkCase === 2) {
        // http://10.0.26.200:8081/vessel_profiles/1655897265912_Bonjean_Case2_KNB.pdf
        result = await this.getDataByIndexCase2(gridData, listIdx);
      }
    }
    if (result) {
      result = await this.convertToCVPFormat(result);
    }
    return result;
  }
}
