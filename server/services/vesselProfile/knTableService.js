import { log } from 'console';
import ConvertCsvService from './convertCsvService';
const axios = require('axios');
const _ = require('lodash');
const fs = require('fs');

// import model from '~/shared/models';

export default class KnTableService {
  // Normal case
  static DRAFT = ["DFT MLD", "DRAFT", "draught", 'Draft', 'draught keel'];
  static TRIM = ["THE TABLE APPLIES FOR TRIM =", "THE TABLE APPLIES FOR TRIM =", "trim", "INITIAL TRIM =", "2 Trim =", "3 Trim =", "Table applies for TRIM =", "TRIM =", "Initial trim "];
  static KN = ["KN"];
  static KN_CURVE = "KN Curve";
  static SEPARATOR = "^";
  static KEY = "Key";  
  static EOL = '+';
  static SEPARATOR = '^';
  static DATA_KEYS = ['draft', '5', '10', '20', '30', '40', '50', '60', '70'];
  static LIST_KN = ['5', '10', '20', '30', '40', '50', '60', '70', '5.0',	'10.0',	'20.0',	'30.0',	'40.0',	'50.0',	'60.0',	'70.0', '5.00',	'10.00',	'20.00',	'30.00',	'40.00',	'50.00',	'60.00',	'70.00'];
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
  static async getDataByIndex (gridData, listIdx) {
    const listData = {};
    let currentTrim = null;
    let knNum = [[],[]];
    for (let row of gridData) {
      let flag = knNum[0].length > 0;
      if ((row[0] && row[0] !== '' && !this.isNumeric(row[0].replace(' ', ''))) || ( row[1] && row[1] !== '' && !this.isNumeric(row[1].replace(' ', ''))) || ( row[2] && row[2] !== '' && !this.isNumeric(row[2].replace(' ', '')))) {
        for (let idx in row) {
          if (this.DRAFT.includes(row[idx])) {
            listIdx.draft = idx;
          };
          if (this.LIST_KN.includes(row[idx])) {
            if (flag) {
              knNum = [[], []];
              flag = false;
            }
            knNum[0].push(idx);
            knNum[1].push(row[idx]);
          }
          if (this.TRIM.includes(row[idx])) {
            currentTrim = row[parseInt(idx)+1].split('m')[0] || row[parseInt(idx)+2].split('m')[0];
            if (!listData.hasOwnProperty(parseFloat(currentTrim).toFixed(0))) {
              listData[parseFloat(currentTrim).toString()] = {'draft': []};
            }
          }
        }
      }
      else {
        if (currentTrim && /\d/.test(row[listIdx.draft]) && knNum[0].length >= 2 && /\d/.test(row[knNum[0][1]])) {
          for (let idx in knNum[0]) {
            if (!listData[parseFloat(currentTrim).toString()].hasOwnProperty(parseFloat(knNum[1][idx]).toFixed(0))) {
              listData[parseFloat(currentTrim).toString()][parseFloat(knNum[1][idx]).toFixed(0)] = [];
            }
            listData[parseFloat(currentTrim).toString()][parseFloat(knNum[1][idx]).toFixed(0)].push(row[knNum[0][idx]]);
          }
          if (!listData[parseFloat(currentTrim).toString()].draft.includes(row[listIdx.draft])) {
            listData[parseFloat(currentTrim).toString()].draft.push(row[listIdx.draft]);
          }
        }
      }
    }
    return listData;
  }
static async convertToCVPFormat (data) {
    try {
      let result = `${this.KN_CURVE}=`;
      let dataIdx = 0;
      const keyTrim = Object.keys(data);
      keyTrim.sort(function(a, b){return a-b});
      keyTrim.forEach(trim => {
        const listKey = Object.keys(data[trim]).sort();
        listKey.pop();
        listKey.sort(function(a, b){return a-b});
        listKey.unshift('draft');
        result += `${this.KEY}${this.SEPARATOR}${parseFloat(trim).toFixed(1)}${this.SEPARATOR}`;
        const lengthOfDraft = data[trim].draft.length;
        dataIdx = 0;
        while (dataIdx < lengthOfDraft) {
          this.DATA_KEYS.forEach(key => {
            if (key === 'draft') {
              result += `${parseFloat(data[trim][key][dataIdx]).toFixed(2)}${this.SEPARATOR}0${this.SEPARATOR}`;
            } else {
              result += `${data[trim][key][dataIdx].replace('.', '')}${this.SEPARATOR}`
            }
          })
          result += `0${this.SEPARATOR}`;
          dataIdx += 1;
        }
        result += "\n"
      })
      result = result.slice(0, -1);
      result += this.EOL;
      return result
    } catch (error) {
      console.log(error);
    }
  }
  static async replaceWrongData (data) {
    let result = data;  
    result = result.split(',T,DISP,KN').join('T,DISP,KN');
    result = result.replace(/THE TABLE APPLIES FOR TRIM = /g, 'THE TABLE APPLIES FOR TRIM =,');
    result = result.replace(/ M IN UPRIGHT CONDITION/g, ', M IN UPRIGHT CONDITION');
    result = result.replace(/M IN UP RIGHT CONDITION/g, ',M IN UP RIGHT CONDITION');
    result = result.replace(/Table applies for TRIM =/g, 'Table applies for TRIM =,');
    result = result.replace(/INITIAL TRIM = /g, 'INITIAL TRIM =,');
    result = result.replace(/ m [(]FORE[)]/g, ', m (FORE)');
    result = result.replace(/m [(]AFTER[)]/g, ', m (AFTER)');
    result = result.replace(/ m [(]LEVEL[)]/g, ',m (LEVEL)'); 
    result = result.replace(/2 Trim = /g, 'TRIM =,');
    result = result.replace(/3 Trim = /g, 'TRIM =,');
    result = result.replace(/ M/g, ', M');
    result = result.replace(/m in Upright condition/g, ',m in Upright condition');
    result = result.replace(/Initial trim /g, 'TRIM =,');
    result = result.replace(/ m [(]aft[)]/g, ', m (aft)n');
    result = result.replace(/ m [(]aft[)]/g, ', m (aft)n');
    result = result.replace(/DRAFT AT C.F.,5.00,10.00,15.00,20.00,25.00,30.00,35.00,40.00,50.00,60.00,70.00,80.00/g, 'DRAFT, AT C.F.,5.00,10.00,15.00,20.00,25.00,30.00,35.00,40.00,50.00,60.00,70.00,80.00');
    result = result.replace(/\n,5,10,15,20/g, '\nDRAFT,5,10,15,20');
    return result;
  }
  static async getKnData(data) {
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
            if (!listIdx.draft && this.DRAFT.includes(rowData[idxItem])) {
              listIdx.draft = idxItem;
            };

        }
        gridData.push(rowData);
    }
    if (listIdx.draft) {
      // normal case
      result = await this.getDataByIndex(gridData, listIdx);
    }
    if (result) {
      result = await this.convertToCVPFormat(result, measureUnit);
    }
    return result;
  }
}
