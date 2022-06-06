import { log } from 'console';
const axios = require('axios');
const _ = require('lodash');
const fs = require('fs');

// import model from '~/shared/models';

export default class FrameTableSercive {
  static KEY_FRAME_NO = ['NO.', 'FR.NO.', 'FR.NO', 'Frame', 'No.', 'Framing'];
  static KEY_AP = ['A.P.', 'x-coord.', 'FROM AP', '(m) AP', 'AP', 'From A.P. (m)'];
  static EOL = '+';
  static SEPARATOR = '^';
  static FRAME_LIST = "Frame List";
  constructor() {
    this.status = 400;
    this.dataRes = null;
  }
  static sortNumber(a,b){
    return a - b;
  }
  static async getDataByIndex (gridData, idxFrameNo, idxAp, measureUnit) {
    const objectData = {};
    for (const row of gridData) {
        if ((/\d/.test(row [0]) || (/\d/.test(row [1]) || ((/\d/.test(row [2])) && (/\d/.test(row [3]))))) && row.length > idxFrameNo.length + idxAp.length) {
            for (const idx in idxFrameNo) {
                if (row[idxFrameNo[idx]] && !isNaN(row[idxFrameNo[idx]]) && row[idxAp[idx]]) {
                    const distanceAp = measureUnit === 'mm' ? row[idxAp[idx]]/1000 : row[idxAp[idx]];
                    objectData[row[idxFrameNo[idx]]] = distanceAp;
                }
            }
        }
    }
    return objectData;
  }
  static async convertToCVPFormat (data) {
      // Frame List = frame_no(0.000)^ap(0.00)^...+
      let result =`${this.FRAME_LIST}=`;
      const listKeySorted = Object.keys(data).sort(this.sortNumber);
      result+= `${parseInt(listKeySorted[0]).toFixed(3)}${this.SEPARATOR}${parseFloat(data[listKeySorted[0]]).toFixed(2)}`;
      for (let idx=1; idx < listKeySorted.length; idx++) {
        result+= `${this.SEPARATOR}${parseFloat(listKeySorted[idx]).toFixed(3)}${this.SEPARATOR}${parseFloat(data[listKeySorted[idx]]).toFixed(2)}`;
      }
      result += this.EOL;
      return result
  }
  static async replaceWrongData (data) {
    let result = data;  
    result = await result.replace(/FR.NO. F.S./g, 'FR.NO.,F.S.');
    result = await result.replace(/FROM MS FROM AP/g, 'FROM MS,FROM AP');
    result = await result.replace('\n,0,66.500', '\n0,66.500');
    result = await result.replace('\n,1,65.900', '\n1,65.900');
    result = await result.replace('\n,-1,67.100', '\n-1,67.100');
    result = await result.replace('\n,-2,67.700', '\n-2,67.700');
    result = await result.replace('\n,-3,68.300', '\n-3,68.300');
    result = result.split('. ***').join('.,***');
    result = result.split('*,B,,').join('*B');
    result = result.split('*,A,,').join('*A');
    result = await result.replace('*B,33,44.700,21.800,77,14.300,52.200 68.900,-2.400', '*B,68.900,-2.400,33,44.700,21.800,77,14.300,52.200');
    result = await result.replace('*A,36,42.600,23.900,79,12.900,53.600 67.700,-1.200', '*A,67.700,-1.200,36,42.600,23.900,79,12.900,53.600');
    result = await result.replace(',,(m),,,,,(m) AP,Midship,,,,AP,Midship FP,,,,,FP,', ',,,(m) AP,Midship,,,,AP,Midship FP,,,,,FP,');
    result = await result.replace('\n,Framing,From A.P. (m),,,Framing,From A.P. (m),', '\nFraming,,From A.P. (m),,,Framing,,From A.P. (m),');
    result = await result.replace('86.01,179.270', '86.01,,179.270');
    result = await result.replace('86.02,181.170', '86.02,,181.170');
    result = await result.replace('86.03,185.380', '86.03,,185.380');
    result = await result.replace('86.04,189.590', '86.04,,189.590');
    result = await result.replace('86.05,193.800', '86.05,,193.800');
    result = await result.replace('86.06,195.700', '86.06,,195.700');
    result = await result.replace('86.07,199.910', '86.07,,199.910');
    result = await result.replace('86.08,204.120', '86.08,,204.120');
    result = await result.replace(',87,208.330,,', ',87,,208.330,,');
    result = await result.replace(',88,210.230,,', ',88,,210.230,,');
    result = await result.replace(',89,214.440,,', ',89,,214.440,,');
    result = await result.replace(',90,218.650,,', ',90,,218.650,,');
    result = await result.replace(',91,222.860,,', ',91,,222.860,,');
    result = await result.replace(',92,224.760,,', ',92,,224.760,,');
    result = await result.replace(',93,228.970,,', ',93,,228.970,,');
    result = await result.replace(',94,233.180,,', ',94,,233.180,,');
    result = await result.replace(',95,237.390,,', ',95,,237.390,,');
    result = await result.replace(',96,239.340,,', ',96,,239.340,,');
    result = await result.replace(',97,240.170,,', ',97,,240.170,,');
    result = await result.replace(',98,241.000,,', ',98,,241.000,,');
    result = await result.replace(',99,241.830,,', ',99,,241.830,,');
    result = await result.replace(',100,242.660,,', ',100,,242.660,,');
    result = await result.replace(',101,243.490,,', ',101,,243.490,,');
    result = await result.replace('FRAME,,FRAME SPACE,,SPACE A.P,MIDSHIP,F.P,,A.P,MIDSHIP,F.P', 'NO.,FRAME SPACE,A.P.,MIDSHIP,,NO.,FRAME,A.P.,MIDSHIP,F.P');
    return result;
  }
  static async getFrameTableData(data) {
    let measureUnit = 'm';
    const cleanedData = await this.replaceWrongData(data);
    const gridData = [];
    let idxFrameNo = [];
    let idxAp = [];
    let result = '';
    for (const row of cleanedData.split('\n')) {
        const checkIdxFrameNo = idxFrameNo.length > 0 ? false : true;
        const checkIdxAp = idxAp.length > 0 ? false : true;
        const arrData = [];
        const rowData = row.split(',');
        for(const idxItem in rowData) {
            if (rowData[idxItem] === 'mm') {
                measureUnit = 'mm';
            }
            arrData.push(rowData[idxItem]);
            if (checkIdxFrameNo) {
                if (this.KEY_FRAME_NO.includes(rowData[idxItem])) {
                    idxFrameNo.push(idxItem);
                }
            }
            if (checkIdxAp) {
                if (this.KEY_AP.includes(rowData[idxItem])) {
                    idxAp.push(idxItem);
                }
            }
        }
        if (idxFrameNo.length < 2) idxFrameNo = [];
        if (idxAp.length < 2) idxAp = [];
        gridData.push(arrData);
    }
    idxFrameNo.sort(function(a, b){return a - b});
    idxAp.sort(function(a, b){return a - b});
    if (idxFrameNo.length && idxAp.length && idxFrameNo.length === idxAp.length) {
        result = await this.getDataByIndex(gridData, idxFrameNo, idxAp, measureUnit);
    }
    if (result) {
        result = await this.convertToCVPFormat(result, measureUnit);
    }
    return result;
  }
}
