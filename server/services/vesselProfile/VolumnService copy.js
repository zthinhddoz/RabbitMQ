import { group, log } from 'console';
import { merge } from 'lodash';
import ConvertCsvService from './convertCsvService';
const axios = require('axios');
const _ = require('lodash');
const fs = require('fs');

// import model from '~/shared/models';

export default class VolumnSercive {
  // Normal case
  static LEVEL_COL = ["BOTTOM", "HEIGHT", "From B/L", "H", "LEVEL"];
  static VOL_COL = ["VOLUME", "volume", "VNET", "VOL"];
  static LCG_COL = ["MID", "M/S", "LPP", "LCG", "CENTER GRAVITY", "LPP / 2", "CGX"];
  static VCG_COL = ["B.L.", "VCG", "BL", "CGZ"];
  static TCG_COL = ["C.L.", "TCG", "CL", "CGY"];
  static FSM_COL = ["MOMENT", "FRS.MOM", "Mom.", "IY", "FRS.RED"];
  static RATE = ["tm"];
  static TANK_NAME = ["TANK NAME :", "Compartment ident:", "COMPARTMENT :", "COMP", "COMPARTMENT", "COMPARTMENT:", "Compartment descr :"];
  static SEPARATOR = "^";
  static EOL = "+";
  static TANKID = {"WBT": 100 , "FOT": 300, "DOT": 400, "LOT": 500, "FWT": 600}
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

  static async replaceWrongData (data) {
    let result = data;  
    result = await result.replace(/LEVEL,FROM,VOLUME,CENTER OF GRAVITY FROM,INERTIA/g, 'LEVEL,FROM,VOLUME,CENTER OF, GRAVITY, FROM,INERTIA');
    result = await result.replace(/TANK NAME : /g, 'TANK NAME : ,');
    result = await result.replace(/AWP FRS/g, 'AWP,FRS');
    result = await result.replace(/ -/g, ',-');
    return result;
  }

  static async getDataByIndex (gridData, listName) {
    const objectData = {rate: 'm'};
    let tankName = null;
    const listIdx = {};
    for (const row of gridData) {
      if (!(this.isNumeric(row[0]))) {
        for (let idxItem in row) {
          if (listName.includes(row[idxItem])) {
            tankName = row[idxItem];
          }
          if (this.LEVEL_COL.includes(row[idxItem])) listIdx.level = idxItem;
          if (this.VOL_COL.includes(row[idxItem])) listIdx.vol = idxItem;
          if (this.LCG_COL.includes(row[idxItem])) listIdx.lcg = idxItem;
          if (this.VCG_COL.includes(row[idxItem])) listIdx.vcg = idxItem;
          if (this.TCG_COL.includes(row[idxItem])) listIdx.tcg = idxItem;
          if (this.FSM_COL.includes(row[idxItem])) listIdx.fsm = idxItem;
          if (this.RATE.includes(row[idxItem])) objectData.rate = 'tm';
        }
      } else if (row[listIdx.level] && row[listIdx.vol] && row[listIdx.lcg] && row[listIdx.vcg] && row[listIdx.tcg]){
        if (tankName) {
          if (!objectData[tankName]) objectData[tankName] = {level: [], volumn: [], lcg: [], vcg: [], tcg: [], fsm: []};
          objectData[tankName].level.push(row[listIdx.level]);
          objectData[tankName].volumn.push(row[listIdx.vol]);
          objectData[tankName].lcg.push(row[listIdx.lcg]);
          objectData[tankName].vcg.push(row[listIdx.vcg]);
          objectData[tankName].tcg.push(row[listIdx.tcg]);
          let momentFsm = row[listIdx.fsm] ? row[listIdx.fsm] :'0';
          objectData[tankName].fsm.push(momentFsm);
        }
      }
    }
    return objectData;
  }

  static async mergeTankVolumn(volumnData, tankData) {
    let mergeData = {...tankData};
    mergeData.rate = volumnData.rate;
    Object.keys(tankData).forEach(groupAcronym => {
      Object.keys(tankData[groupAcronym]).forEach(groupName => {
        Object.keys(tankData[groupAcronym][groupName]).forEach(tankName => {
          if (volumnData.hasOwnProperty(tankName)) {
            mergeData[groupAcronym][groupName][tankName].volumnData = volumnData[tankName];
          }
        })
      })
    })
    return mergeData
  }
  static multiply = (num1, num2) => {
    return num1 * num2;
  };
  static async convertToCVPFormat(data) {
    let result = 'Tank=';
    let count = 0;
    Object.keys(data).forEach(groupAcronym => {
      let tankId = this.TANKID[groupAcronym];
      if (tankId) {
        Object.keys(data[groupAcronym]).forEach(groupName => {
          Object.keys(data[groupAcronym][groupName]).forEach(tankName => {
            if (data[groupAcronym][groupName][tankName].volumnData) {
              const tankValue = data[groupAcronym][groupName][tankName];
              count += 1;
              // Tank name
              result += tankName + this.SEPARATOR + 'null' + this.SEPARATOR;
              // Capacity-volumn
              result += (parseFloat(tankValue.capacity)*100).toFixed(0).toString() + this.SEPARATOR;
              // SG
              result += (parseFloat(tankValue.sg)*1000).toFixed(0).toString() + this.SEPARATOR;
              // Start frame
              const checkStartFrame = this.isNumeric(tankValue.startFrame);
              if (checkStartFrame) {
                result += (parseFloat(tankValue.startFrame)*100).toFixed(0).toString() + this.SEPARATOR;
              } else {
                result += '0' + this.SEPARATOR;
              }
              // End frame
              const checkEndFrame = this.isNumeric(tankValue.endFrame);
              if (checkEndFrame) {
                result += (parseFloat(tankValue.endFrame)*100).toFixed(0).toString() + this.SEPARATOR + '0' + this.SEPARATOR + '0' + this.SEPARATOR;
              } else {
                result += '0' + this.SEPARATOR + '0' + this.SEPARATOR + '0' + this.SEPARATOR
              }
              if (tankValue.tcg) {
                const tcgNumber = tankValue.tcg;
                if (tankName.endsWith("(S)") || tankName.endsWith("S")) {
                  result += '-' + (Math.abs(parseFloat(tcgNumber).toFixed(1)*100)).toString() + this.SEPARATOR;
                } else {
                  result += (parseFloat(tankValue.tcg)*100).toFixed(1).toString() + this.SEPARATOR;
                }
              } else {
                const tcgArray = tankValue.volumnData.tcg;
                const tcgNumber = tcgArray[tcgArray.length - 1];
                if (tankName.endsWith('(P)') || tankName.endsWith('P')) {
                  result += (Math.abs(parseFloat(tcgNumber).toFixed(1)*100)).toString() + this.SEPARATOR;
                } else if (tankName.endsWith("(S)") || tankName.endsWith("S")) {
                  result += '-' + (Math.abs(parseFloat(tcgNumber).toFixed(1)*100)).toString() + this.SEPARATOR;
                } else {
                  result += (parseFloat(tcgNumber)*100).toFixed(1).toString() + this.SEPARATOR;
                }
              }
              // Tank id
              result += tankId.toString() + this.SEPARATOR;
              tankId += 1;
              // Moment
              result += tankValue.moment.toString() + this.SEPARATOR + '0' + this.SEPARATOR;
              // Number of tank
              result += (tankValue.volumnData.level.length).toString() + this.SEPARATOR + '0' + this.SEPARATOR + '0' + this.SEPARATOR + '0' + this.SEPARATOR + '0' + this.SEPARATOR;
              for (let item of tankValue.volumnData.level) {
                if (item) {
                  result += (parseFloat(item)*100).toFixed(1).toString() + this.SEPARATOR;
                } else {
                  result += '0' + this.SEPARATOR;
                }
              }
              for (let item of tankValue.volumnData.volumn) {
                if (item) {
                  result += (parseFloat(item)*100).toFixed(0).toString() + this.SEPARATOR;
                } else {
                  result += '0' + this.SEPARATOR;
                }
              }
              for (let item of tankValue.volumnData.lcg) {
                if (item) {
                  result += (parseFloat(item)*100).toFixed(1).toString() + this.SEPARATOR;
                } else {
                  result += '0' + this.SEPARATOR;
                }
              }
              for (let item of tankValue.volumnData.vcg) {
                if (item) {
                  result += (parseFloat(item)*100).toFixed(1).toString() + this.SEPARATOR;
                } else {
                  result += '0' + this.SEPARATOR;
                }
              }
              for (let item of tankValue.volumnData.tcg) {
                if (item) {
                  result += (parseFloat(item)*100).toFixed(1).toString() + this.SEPARATOR;
                } else {
                  result += '0' + this.SEPARATOR;
                }
              }
              for (let item of tankValue.volumnData.fsm) {
                if (item) {
                  if (data.rate === 'm') {
                    result += item.toString() + this.SEPARATOR;
                  } else {
                    result += item.toString() + this.SEPARATOR;
                  }
                } else {
                  result += '0' + this.SEPARATOR;
                }
              }
            }
          })
        })
      }
    })
    result += this.EOL;
    return [result, count];
  }

  static async getVolumnData(data, tankData) {
    const cleanedData = await this.replaceWrongData(data);
    const gridData = [];
    let volumnData = '';
    let result = '';
    const listName = [];
    let checkCase = 1;
    for (const row of cleanedData.split('\n')) {
        const rowData = row.split(',');
        gridData.push(rowData);
    }
    Object.keys(tankData).forEach(key1 => {
      Object.keys(tankData[key1]).forEach(key2 => {
        Object.keys(tankData[key1][key2]).forEach(key3 => {
          listName.push(key3);
        })
      })
    })
    volumnData = await this.getDataByIndex(gridData, listName);
    result = await this.mergeTankVolumn(volumnData, tankData);
    const [finalData, countTankName] = await this.convertToCVPFormat(result);
    return [finalData, countTankName];
  }
}
