import { log } from 'console';
import ConvertCsvService from './convertCsvService';
const axios = require('axios');
const _ = require('lodash');
const fs = require('fs');

// import model from '~/shared/models';

export default class HydroSercive {
  // Normal case
  static EOL = '+';
  static SEPARATOR = '^';
  static HYDRO_LIST= "Hydrodata";
  static TK = ["Draft", "Draft(ext)", "TK", "T", "DRAFT", "(EXT)", "DRAFT EXT m", "DRAFT MEAN (EXT. m)"];
  static DISP = ["DISPL", "DISPL.", "DISP", "DISP.", "DISP.FULL", "DISP EXT", "DISP EXT t", "DISPLACEMENT (t)"];
  static TCP = ["TPC", "TCP", "T.P.C", "T.P.C.(t/cm)"];
  static MCT = ["MTC", "MCT", "M.T.C", "M.T.C.(tm)"];
  static LCB =  ["LCB", "L.C.B", "LCB m", "L.C.B.(m) from M/S"];
  static LCA = ["LCF", "LCA", "L.C.F", "L.C.F.(m) from M/S"];
  static KMT = ["KMT", "TKM", "K.M.T", "KMT m", "K.M.T.(m)"];
  static TRIM = ["Trim", "trim="];
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
    let result =`${this.HYDRO_LIST}=`;
    for(const trim in data) {
      let record = 'Key' + this.SEPARATOR + trim + this.SEPARATOR;
      for (const idxItem in data[trim]) {
        const dataByIdx = data[trim][idxItem];
        record += dataByIdx.TK;
        record += this.SEPARATOR + (parseFloat(dataByIdx.DISP) * 100).toFixed(0).toString();
        record += this.SEPARATOR + '0';
        record += this.SEPARATOR + (parseFloat(dataByIdx.TCP) * 100).toFixed(0).toString();
        record += this.SEPARATOR + (parseFloat(dataByIdx.MCT) * 10).toFixed(0).toString();
        record += this.SEPARATOR + (parseFloat(dataByIdx.LCB) * 100).toFixed(1).toString();
        record += this.SEPARATOR + (parseFloat(dataByIdx.LCA) * 100).toFixed(0).toString();
        record += this.SEPARATOR + '0';
        record += this.SEPARATOR + (parseFloat(dataByIdx.KMT) * 100).toFixed(1).toString() + this.SEPARATOR;
      }
      result += record;
    }
    result +=  this.EOL
    return result
  }
  static async replaceWrongData (data) {
    let result = data;  
    result = await result.replace('53+750', '54');
    result = await result.replace(/Trim /g, 'Trim,');
    result = await result.replace(/VOL. MLD,m3/g, 'VOL. MLD m3');
    result = await result.replace(/LCF,m/g, 'LCF m');
    result = await result.replace(/LCB,m/g, 'LCB m');
    result = await result.replace(/VCB,m/g, 'VCB m');
    result = await result.replace(/KMT,m/g, 'KMT m');
    result = await result.replace(/DISP EXT,t/g, 'DISP EXT t');
    let tempData = result.split('\n');
    for (const row in tempData) {
      const arrData = [];
      const rowData = tempData[row].split(',');
      let rowString = '';
      for(const idxItem in rowData) {
        let newItem = rowData[idxItem];
        if (this.isNumeric(parseFloat(rowData[idxItem]))) {
          newItem = rowData[idxItem].replace(/ /g,',');
        }
        rowString += newItem + ',';
      }
      tempData[row] = rowString;
    }
    let dataString = '';
    for (let i = 0; i < tempData.length - 1; i++) {
      dataString += tempData[i];
      dataString += '\n';
    }
    dataString = await dataString.replace(/M,5.0,M,4.0,M,3.0,M,2.5,M,2.0,M,1.5,M,1.0,M,0.5,M,0.0,M,-0.5,M,-1.0,M,-2.0,M,/g, 'M,5.0,4.0,3.0,2.5,2.0,1.5,1.0,0.5,0.0,-0.5,-1.0,-2.0,');   
    return dataString;
  }
  static async getDataByIndexCase1 (gridData) {
    let objectData = {};
    let listIdx = {};
    let currentTrim = null;
    for (let row of gridData) {
      if (((this.isNumeric(row[0]) || this.isNumeric(row[1])) && row.length > 8)) {
        if (currentTrim && listIdx.TK && listIdx.DISP && listIdx.TCP && listIdx.MCT && listIdx.LCB && listIdx.LCA && listIdx.KMT) {
          if (!objectData.hasOwnProperty(currentTrim)) objectData[currentTrim] = {};
          const dataObj = {};
          dataObj.TK = row[listIdx.TK];
          dataObj.DISP = row[listIdx.DISP];
          dataObj.TCP = row[listIdx.TCP];
          dataObj.MCT = row[listIdx.MCT];
          dataObj.LCB = row[listIdx.LCB];
          dataObj.LCA = row[listIdx.LCA];
          dataObj.KMT = row[listIdx.KMT];
          objectData[currentTrim][row[listIdx.TK]] = dataObj;
        }
      } else {
        for (let idx in row) {
          if (this.TK.includes(row[idx])) listIdx.TK = idx;
          if (this.DISP.includes(row[idx])) listIdx.DISP = idx;
          if (this.TCP.includes(row[idx])) listIdx.TCP = idx;
          if (this.MCT.includes(row[idx])) listIdx.MCT = idx;
          if (this.LCB.includes(row[idx])) listIdx.LCB = idx;
          if (this.LCA.includes(row[idx])) listIdx.LCA = idx;
          if (this.KMT.includes(row[idx])) listIdx.KMT = idx;
          if (this.TRIM.includes(row[idx])) {
            currentTrim = row[parseInt(idx)+1].replace('m', '');
          }
        }
      }
      
    }
    return objectData;
  }
  static async getDataByIndexCase2 (gridData) {
    let objectData = {};
    let draftArray = [];
    let startDis = false;
    let startTpc = false;
    let startMtc = false;
    let startLcb = false;
    let startLca = false;
    let startKmt = false;
    for (let row of gridData) {
      if (this.TK.includes(row[0])) {
        console.log("000");
        row.shift();
        draftArray = row;
        startDis = false;
        startTpc = false;
        startMtc = false;
        startLcb = false;
        startLca = false;
        startKmt = false;
      } else if (this.DISP.includes(row[1]) || this.DISP.includes(row[2])) {
        startDis = true;
        startTpc = false;
        startMtc = false;
        startLcb = false;
        startLca = false;
        startKmt = false;
      } else if (this.TCP.includes(row[1])) {
        startDis = false;
        startTpc = true;
        startMtc = false;
        startLcb = false;
        startLca = false;
        startKmt = false;
      } else if (this.MCT.includes(row[1])) {
        startDis = false;
        startTpc = false;
        startMtc = true;
        startLcb = false;
        startLca = false;
        startKmt = false;
      } else if (this.LCA.includes(row[1])) {
        startDis = false;
        startTpc = false;
        startMtc = false;
        startLcb = false;
        startLca = true;
        startKmt = false;
      } else if (this.KMT.includes(row[1])) {
        startDis = false;
        startTpc = false;
        startMtc = false;
        startLcb = false;
        startLca = false;
        startKmt = true;
      } else if (this.LCB.includes(row[1])) {
        startDis = false;
        startTpc = false;
        startMtc = false;
        startLcb = true;
        startLca = false;
        startKmt = false;
      }
      if (startDis && row.length > 5 && this.isNumeric(row[0])) {
        const currentTrim = row[0];
        if (!objectData.hasOwnProperty(currentTrim)) {
          objectData[currentTrim] = {};
        }
        row.shift();
        if (draftArray.length > 0) {
          for (let idx in draftArray) {
            if (draftArray[idx]) {
              objectData[currentTrim][draftArray[idx]] = {};
              objectData[currentTrim][draftArray[idx]].TK = draftArray[idx];
              objectData[currentTrim][draftArray[idx]].DISP = row[idx];
            }
          }
        }
      }
      if (startTpc && row.length > 5 && this.isNumeric(row[0])) {
        const currentTrim = row[0];
        row.shift();
        if (draftArray.length > 0) {
          for (let idx in draftArray) {
            if (draftArray[idx]) {
              objectData[currentTrim][draftArray[idx]].TPC = row[idx];
            }
          }
        }
      }
      if (startMtc && row.length > 5 && this.isNumeric(row[0])) {
        const currentTrim = row[0];
        row.shift();
        if (draftArray.length > 0) {
          for (let idx in draftArray) {
            if (draftArray[idx]) {
              objectData[currentTrim][draftArray[idx]].MTC = row[idx];
            }
          }
        }
      }
      if (startLca && row.length > 5 && this.isNumeric(row[0])) {
        const currentTrim = row[0];
        row.shift();
        if (draftArray.length > 0) {
          for (let idx in draftArray) {
            if (draftArray[idx]) {
              objectData[currentTrim][draftArray[idx]].LCF = row[idx];
            }
          }
        }
      }
      if (startKmt && row.length > 5 && this.isNumeric(row[0])) {
        const currentTrim = row[0];
        row.shift();
        if (draftArray.length > 0) {
          for (let idx in draftArray) {
            if (draftArray[idx]) {
              objectData[currentTrim][draftArray[idx]].KMT = row[idx];
            }
          }
        }
      }
      if (startLcb && row.length > 5 && this.isNumeric(row[0])) {
        const currentTrim = row[0];
        row.shift();
        if (draftArray.length > 0) {
          for (let idx in draftArray) {
            if (draftArray[idx]) {
              objectData[currentTrim][draftArray[idx]].LCB = row[idx];
            }
          }
        }
      }
    }
    return objectData;
  }
  static async getDataByIndexCase3 (gridData) {
    let objectData = {'0': {}};
    let listIdx = {};
    const STOP_FIRST_TRIM = ['HYDROSTATIC TABLE (TRIMMED)'];
    let draftArray = [];
    let disArray = [];
    let startDis = false;
    let startLcb = false;
    let startKmt = false;
    let flagFristTrim = true;
    for (let row of gridData) {
      if (flagFristTrim) {
        if (((this.isNumeric(row[0]) || this.isNumeric(row[1])) && row.length > 10)) {
          if (listIdx.TK && listIdx.DISP && listIdx.TCP && listIdx.MCT && listIdx.LCB && listIdx.LCA && listIdx.KMT) {
            const dataObj = {};
            dataObj.TK = row[listIdx.TK];
            dataObj.DISP = row[listIdx.DISP];
            dataObj.TCP = row[listIdx.TCP];
            dataObj.MCT = row[listIdx.MCT];
            dataObj.LCB = row[listIdx.LCB];
            dataObj.LCA = row[listIdx.LCA];
            dataObj.KMT = row[listIdx.KMT];
            objectData['0'][row[listIdx.TK]] = dataObj;
          }
        } else {
          for (let idx in row) {
            if (this.TK.includes(row[idx])) listIdx.TK = idx;
            if (this.DISP.includes(row[idx])) listIdx.DISP = idx;
            if (this.TCP.includes(row[idx])) listIdx.TCP = idx;
            if (this.MCT.includes(row[idx])) listIdx.MCT = idx;
            if (this.LCB.includes(row[idx])) listIdx.LCB = idx;
            if (this.LCA.includes(row[idx])) listIdx.LCA = idx;
            if (this.KMT.includes(row[idx])) listIdx.KMT = idx;
            if (STOP_FIRST_TRIM.includes(row[idx])) flagFristTrim = false;
          }
        }
      } else {
        if (this.TK.includes(row[0])) {
          row.shift();
          draftArray = row;
          startDis = false;
          startKmt = false;
          startLcb = false;
        } else if (this.DISP.includes(row[0]) && row[3] === '') {
          startDis = true;
          startKmt = false;
          startLcb = false;
        } else if (this.KMT.includes(row[0]) && row[3] === '') {
          startDis = false;
          startKmt = true;
          startLcb = false;
        } else if (this.LCB.includes(row[0]) && row[3] === '') {
          startDis = false;
          startKmt = false;
          startLcb = true;
        }
        if (startDis && row.length > 5 && this.isNumeric(row[0])) {
          const currentTrim = row[0];
          if (!objectData.hasOwnProperty(currentTrim)) {
            objectData[currentTrim] = JSON.parse(JSON.stringify(objectData['0']))
          }
          row.shift();
          disArray = row;
          if (draftArray.length > 0) {
            for (let idx in draftArray) {
              if (draftArray[idx]) {
                objectData[currentTrim][draftArray[idx]].DISP = disArray[idx];
              }
            }
          }
        }
        if (startKmt && row.length > 5 && this.isNumeric(row[0])) {
          const currentTrim = row[0];
          row.shift();
          disArray = row;
          if (draftArray.length > 0) {
            for (let idx in draftArray) {
              if (draftArray[idx]) {
                objectData[currentTrim][draftArray[idx]].KMT = disArray[idx];
              }
            }
          }
        }
        if (startLcb && row.length > 5 && this.isNumeric(row[0])) {
          const currentTrim = row[0];
          row.shift();
          disArray = row;
          if (draftArray.length > 0) {
            for (let idx in draftArray) {
              if (draftArray[idx]) {
                objectData[currentTrim][draftArray[idx]].LCB = disArray[idx];
              }
            }
          }
        }
      }
    }
    return objectData;
  }
  static getCase(cleanedData, gridData) {
    for (let row of gridData) {
      if (row.length >= 12) {
        return 3;
      }
    }
    if (cleanedData.includes('DRAFT MEAN (EXT. m)')) return 2;
    return 1;
  }
  static async getHydroData(data) {
    const cleanedData = await this.replaceWrongData(data);
    const gridData = [];
    let result = '';
    for (const row of cleanedData.split('\n')) {
      const rowData = row.split(',');
      gridData.push(rowData);
    }
    let checkCase = this.getCase(cleanedData, gridData);
    if (checkCase === 1) {
      // http://10.0.26.200:8081/vessel_profiles/1656816924904_Hydro_Case1_APTM.pdf
      result = await this.getDataByIndexCase1(gridData);
    } else if (checkCase === 2) {
      // http://10.0.26.200:8081/vessel_profiles/1656817827428_Hydro_Case3_CGNR.pdf
      result = await this.getDataByIndexCase2(gridData);
    } else if (checkCase === 3) {
      // http://10.0.26.200:8081/vessel_profiles/1656817827428_Hydro_Case3_CGNR.pdf
      result = await this.getDataByIndexCase3(gridData);
    }
    if (result) {
      result = await this.convertToCVPFormat(result);
    }
    return result;
  }
}
