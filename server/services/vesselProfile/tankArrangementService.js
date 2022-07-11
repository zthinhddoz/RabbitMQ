import { log } from 'console';
import ConvertCsvService from './convertCsvService';
const axios = require('axios');
const _ = require('lodash');
const fs = require('fs');

// import model from '~/shared/models';

export default class TankArrangementService {
  // Normal case
  static WBT = ["Water Ballast","WATER BALLAST TANKS", "CAPACITY OF Ballast Water", "WATER BALLAST TANKS", "Ballast Water"]
  static FOT = ["Heavy Fuel Oil","FO OVERFLOW","HEAVY FUEL OIL TANKS","FUEL OIL TANKS", "CAPACITY OF Heavy Fuel Oil"]
  static DOT = ["Diesel Oil","DIESEL OIL TANKS","MARINE DIESEL OIL TANKS","CAPACITY OF Diesel Oil"]
  static LOT = ["Lubricating Oil","LUBRICATING OIL TANKS", "CAPACITY OF Lubricating Oil"]
  static FWT = ["Fresh Water","COOLING WATER","FRESH WATER TANKS", "CAPACITY OF Fresh Water"]
  static ETC = ["MISCELLANEOUS", "MISCELLANEOUS TANKS", "LUBRICATING OIL TANKS","MARINE GAS OIL TANKS","OTHER TANKS", "CAPACITY OF Miscellaneous", "L/S M.G.O. TANKS", "Miscellaneous"]
  static EXCEPT = ["Cargo"]
  static SG = ["FILL RATIO = ", "FILL RATIO =", "(RHO=", "S.G.=", "(S.G.:", "(S.G.: ", "(S.G =", "SG*FILL RATIO =", "(S.G=", "S.G.:", "(S.G. * (S.G. * FILL RATIO = "];

  static FRAME_DISTANCE = ["(FROM)", "(TO)", "FRMIN", "FRMAX"]
  static CASE_1 = "1"
  static CASE_2 = "2" 

  static TANKID = {"WBT": 100 , "FOT": 300, "DOT": 400, "LOT": 500, "FWT": 600, }

  static TANK_NAME = ["COMPARTMENT", "NAME", "TANK NAME", "COMP"]
  static CAPACITY_CASE1 = ["VOLUME", "VNET"]
  static CAPACITY_CASE234 = ["CAPACITY(㎥)", "CAPACITY", "VOLUME", "VOLM"]
  static START_FRAME = ["(FROM)", "FRMIN"]
  static END_FRAME = ["(TO)", "FRMAX"]
  static FRAME_NO = ["FR. NO.", "(FR. NO.)", "FRAME", "(FRAMES)", "(FR.NO.)"]

  static TCG = ["T.C.G.", "CGY", "T.C.G"]
  static MOMENT_CASE134 = ["INERTIA", "TMY", "MAX. MT", "MAX. INERTIA", "FRSmax"]
  static MOMENT_CASE2 = ["(m⁴)", "(M4)", "(M 4)", "MAX. MT"]
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
    result = await result.replace(/102.0 - 107.0/g, '102.0 -, 107.0');
    result = await result.replace(/92.0 - 102.0/g, '92.0 -, 102.0');
    result = await result.replace(/102.0 - 107.0/g, '102.0 -, 107.0');
    result = await result.replace(/97.0 - 102.5/g, '97.0 -, 102.5');
    result = await result.replace(/97.0 - 102.5/g, '97.0 -, 102.5');
    result = await result.replace('COMPARTMENT,(FR.NO.),VOLUME,WEIGHT,L.C.G.,V.C.G.,T.C.G.,INERTIA', 'COMPARTMENT,(FR.NO.),,VOLUME,WEIGHT,L.C.G.,V.C.G.,T.C.G.,INERTIA');
    result = await result.replace('COMPARTMENT,(FR.NO.),VOLUME,WEIGHT,L.C.G.,V.C.G.,T.C.G.,INERTIA', 'COMPARTMENT,(FR.NO.),,VOLUME,WEIGHT,L.C.G.,V.C.G.,T.C.G.,INERTIA');
    result = await result.replace('COMPARTMENT,(FR.NO.),VOLUME,WEIGHT,L.C.G.,V.C.G.,T.C.G.,INERTIA', 'COMPARTMENT,(FR.NO.),,VOLUME,WEIGHT,L.C.G.,V.C.G.,T.C.G.,INERTIA');
    result = await result.replace(/FILL RATIO =/g, '(S.G. * FILL RATIO = ,');
    result = await result.replace(/FRMIN FRMAX/g, 'FRMIN,FRMAX');
    result = await result.replace(/CAPACITY OF /g, 'CAPACITY OF ,');
    result = await result.replace(/RHO=/g, 'RHO=,');
    result = await result.replace(/S.G.: /g, 'S.G.: ,');
    result = await result.replace(/S.G=/g, 'S.G=,');
    result = await result.replace('COMPARTMENT,(FR.NO.),VOLUME,WEIGHT,L.C.G,V.C.G,OF', 'COMPARTMENT,,(FR.NO.),VOLUME,WEIGHT,L.C.G,V.C.G,OF');
    result = await result.replace('COMPARTMENT,(FR.NO.),VOLUME,WEIGHT,L.C.G,V.C.G,OF', 'COMPARTMENT,,(FR.NO.),VOLUME,WEIGHT,L.C.G,V.C.G,OF');
    result = await result.replace(/,,100.0%,100.0%,FROM,FROM,INERTIA/g, ',,,100.0%,100.0%,FROM,FROM,INERTIA');
    return result;
  }
  static async getDataByIndexCase (gridData, listIdx) {
    const objectData = {WBT:{}, FOT:{}, DOT:{}, LOT:{}, FWT:{}, ETC:{}};
    let sgVal = null;
    let currentGrp = null;
    let nameGroup = null;
    for (const row of gridData) {
      for (const idx in row) {
        if (this.SG.includes(row[idx])) {
          sgVal = row[parseInt(idx)+1].replace(')','').replace(' ','').split('*')[0];
        } else if (this.WBT.includes(row[idx])) {
          currentGrp = 'WBT';
          nameGroup = row[idx];
          objectData[currentGrp][nameGroup] = {};
          sgVal = '0';
        } else if (this.FOT.includes(row[idx])) {
          currentGrp = 'FOT';
          nameGroup = row[idx];
          objectData[currentGrp][nameGroup] = {};
          sgVal = '0';
        } else if (this.DOT.includes(row[idx])) {
          currentGrp = 'DOT';
          nameGroup = row[idx];
          objectData[currentGrp][nameGroup] = {};
          sgVal = '0';
        } else if (this.LOT.includes(row[idx])) {
          currentGrp = 'LOT';
          nameGroup = row[idx];
          objectData[currentGrp][nameGroup] = {};
          sgVal = '0';
        } else if (this.FWT.includes(row[idx])) {
          currentGrp = 'FWT';
          nameGroup = row[idx];
          objectData[currentGrp][nameGroup] = {};
          sgVal = '0';
        } else if (this.ETC.includes(row[idx])) {
          currentGrp = 'ETC';
          nameGroup = row[idx];
          objectData[currentGrp][nameGroup] = {};
          sgVal = '0';
        } else if (this.TANK_NAME.includes(row[idx])) {
          listIdx.tankNm = idx;
        } else if (this.START_FRAME.includes(row[idx])) {
          listIdx.startFrame = idx;
        } else if (this.END_FRAME.includes(row[idx])) {
          listIdx.endFrame = idx;
        } else if (this.CAPACITY_CASE1.includes(row[idx])) {
          listIdx.capacity = idx;
        } else if (this.TCG.includes(row[idx])) {
          listIdx.tcg = idx;
        } else if (this.MOMENT_CASE134.includes(row[idx])) {
          listIdx.moment = idx;
        } else if (this.FRAME_NO.includes(row[idx])) {
          listIdx.frame = idx;
        }
      }
      if ((sgVal === '0' || sgVal) && currentGrp) {
        if (listIdx.tankNm && listIdx.capacity && listIdx.moment && row.length >= listIdx.moment && this.isNumeric(row[listIdx.moment])){
          if (listIdx.startFrame && listIdx.endFrame) {
            const objTemp = {};
            objTemp.capacity = row[listIdx.capacity];
            objTemp.sg = sgVal;
            objTemp.startFrame = row[listIdx.startFrame].split(' ')[0];
            objTemp.endFrame = row[listIdx.endFrame];
            objTemp.tcg = row[listIdx.tcg];
            objTemp.moment = row[listIdx.moment];
            objectData[currentGrp][nameGroup][row[listIdx.tankNm]] = objTemp;
          } else if (listIdx.frame) {
            const objTemp = {};
            objTemp.capacity = row[listIdx.capacity];
            objTemp.sg = sgVal;
            const frameArr = row[listIdx.frame].split('-');
            objTemp.startFrame = frameArr[0];
            objTemp.endFrame = frameArr[1];
            objTemp.tcg = row[listIdx.tcg];
            objTemp.moment = row[listIdx.moment];
            objectData[currentGrp][nameGroup][row[listIdx.tankNm]] = objTemp;
          }
        }
      }
    }
    return objectData;
  }
  static async getTankData(data) {
    const cleanedData = await this.replaceWrongData(data);
    const gridData = [];
    const listIdx = {};
    let result = '';
    for (const row of cleanedData.split('\n')) {
        const rowData = row.split(',');
        gridData.push(rowData);
    }
    result = await this.getDataByIndexCase(gridData, listIdx);
    return result;
  }
}
