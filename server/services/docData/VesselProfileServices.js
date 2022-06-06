/* eslint-disable camelcase */
/* eslint-disable indent */
/* eslint-disable prettier/prettier */
import model from '~/shared/models';
import { BadRequestError } from '../utils/errors';
import DocFieldServices from '../docField/DocFieldServices';
import LocationServices from '../locations/LocationServices';
import DocTmpltServices from '../docTmplt/DocTmpltServices';
import AppConstants from '../utils/constants';
import processRawExtractedData from './processRawExtractedData';
import TransactionServices from '../transaction/TransactionServices';
import logger from '~/shared/logger';
const lodashClonedeep = require('lodash.clonedeep');
const Sequelize = require('sequelize');

export default class VesselProfileServices {
  constructor() {
    this.dataRes = null;
  }

    static getListAutogenPage(fieldData) {
        try {
            const arrIdx = [];
            const listIdx = {};
            fieldData.sentence.forEach((element) => {
                const antIdx = element.ant_idx;
                if (!arrIdx.includes(antIdx)) {
                    arrIdx.push(antIdx);
                    listIdx[antIdx] = element.x1;
                }
            });
            const listAutogenPage = {};
            for (const key in listIdx) {
                const tempIdx = key.split('_');
                const autogenPage = `${tempIdx[1]}_${tempIdx[2]}`;
                if (!listAutogenPage.hasOwnProperty(autogenPage)) {
                    listAutogenPage[autogenPage] = [[], []];
                }
                const item = {};
                item[listIdx[key]] = key;
                listAutogenPage[autogenPage][0].push(item);
                listAutogenPage[autogenPage][1].push(key);
            }
            return listAutogenPage;
        } catch (error) {
            console.log(error);
            throw new BadRequestError('Arrange field data failed!!!');
        }
    }

    static getNewSentence(antIdxObject) {
        try {
            const listNewAutogenPage = {};
            for (const key in antIdxObject) {
                const tempIdx = key.split('_');
                const autogenPage = `${tempIdx[1]}_${tempIdx[2]}`;
                if (!listNewAutogenPage.hasOwnProperty(autogenPage)) {
                    listNewAutogenPage[autogenPage] = {};
                }
                listNewAutogenPage[autogenPage][tempIdx[0]] = {};
                listNewAutogenPage[autogenPage][tempIdx[0]][key] = antIdxObject[key];
            }
            let newSentence = [];
            for (const autogenPage in listNewAutogenPage) {
                for (const index in Object.keys(listNewAutogenPage[autogenPage])) {
                    newSentence = newSentence.concat(Object.values(listNewAutogenPage[autogenPage][index])[0]);
                }
            }
            return newSentence;
        } catch (error) {
            console.log(error);
            throw new BadRequestError('Arrange field data failed!!!');
        }
    }

    static arrangeBoxByCorX(fieldListData) {
        try {
            const cloneData = lodashClonedeep(fieldListData);
            for (const field in cloneData) {
                const listAutogenPage = this.getListAutogenPage(cloneData[field]);
                const antIdxObject = {};
                for (const key in listAutogenPage) {
                    const sortArray = [];
                    for (const i in listAutogenPage[key][0]) {
                        sortArray.push(Object.keys(listAutogenPage[key][0][i])[0]);
                    }
                    sortArray.sort((a, b) => a - b);
                    for (let i = 0; i < cloneData[field].sentence.length; i++) {
                        if(field === 'DOCFLD0001279') {
                        }
                        if (!cloneData[field].sentence[i].arrange_x) {
                            const antIdx = cloneData[field].sentence[i].ant_idx;
                            const tempIdx = antIdx.split('_');
                            const autogenPage = `${tempIdx[1]}_${tempIdx[2]}`;
                            if (listAutogenPage[autogenPage][1].length > 1) {
                                const index = listAutogenPage[autogenPage][1].indexOf(antIdx);
                                const coorX = Object.keys(listAutogenPage[autogenPage][0][index])[0];
                                const findNewIndex = sortArray.indexOf(coorX);
                                if (findNewIndex !== -1) {
                                    const newAntIdx = `${findNewIndex}_${tempIdx[1]}_${tempIdx[2]}`;
                                    cloneData[field].sentence[i].ant_idx = newAntIdx;
                                    cloneData[field].sentence[i].arrange_x = true;
                                    if (!antIdxObject.hasOwnProperty(newAntIdx)) {
                                        antIdxObject[newAntIdx] = [];
                                    }
                                    antIdxObject[newAntIdx].push(cloneData[field].sentence[i]);
                                }
                            }
                        }
                    }
                }
                const page = [];
                const pageObject = {};
                const newAntIdxObject = {};
                for (let antIdx in antIdxObject) {
                    const splitIdx = antIdx.split('_');
                    if (!page.includes(splitIdx[2])) {
                        page.push(splitIdx[2]);
                        pageObject[splitIdx[2]] = [];
                    }
                    pageObject[splitIdx[2]].push(antIdx);
                }
                page.sort();
                for(let idx of page) {
                    pageObject[idx].forEach(antIdx => {
                        newAntIdxObject[antIdx] = antIdxObject[antIdx];
                    })
                }
                if (Object.keys(newAntIdxObject).length) {
                    const newSentence = this.getNewSentence(newAntIdxObject);
                    cloneData[field].sentence = newSentence;
                }
                
                // Arrange sentence
                const listSentence = {};
                cloneData[field].sentence.forEach((element) => {
                    if (!listSentence.hasOwnProperty(element.ant_idx)) {
                        listSentence[element.ant_idx] = {};
                    }
                    const listCoorValid = [element.y1 - 2, element.y1 - 1, element.y1, element.y1 + 1, element.y1 + 2];
                    let checkFlag = false;
                    let keyValid = element.y1;
                    for (const coorY of listCoorValid) {
                        if (listSentence[element.ant_idx].hasOwnProperty(coorY)) {
                            checkFlag = true;
                            keyValid = coorY;
                        }
                    }
                    if (!checkFlag) {
                        listSentence[element.ant_idx][element.y1] = [];
                    }
                    listSentence[element.ant_idx][keyValid].push(element);
                });
                const sentenceAfterSort = [];
                Object.keys(listSentence).forEach((key) => {
                    Object.keys(listSentence[key]).forEach((coorY) => {
                        listSentence[key][coorY].sort((a, b) => (a.x1 > b.x1) ? 1 : -1);
                        listSentence[key][coorY].forEach((item) => {
                            sentenceAfterSort.push(item);
                        });
                    });
                });
                cloneData[field].sentence = sentenceAfterSort;
            }
            return cloneData;
        } catch (error) {
            return fieldListData;
        }
    }

    static checkFormatData(fieldListData) {
        let formatData = 0;
        const listIdx = {};
        let checkFlag = true;
        const arrLength = [];
        const listData = {};
        try {
            if (Object.keys(fieldListData).length === 3 && fieldListData[Object.keys(fieldListData)[0]].dp_tp === AppConstants.DISPLAY_TYPE.TABLE) {
                const listAutogen = [];
                for (const field in fieldListData) {
                    listIdx[field] = {};
                    fieldListData[field].sentence.forEach((item) => {
                        const arrAntIdx = item.ant_idx.split('_');
                        if (!listAutogen.includes(arrAntIdx[1])) listAutogen.push(arrAntIdx[1]);
                        if (!listIdx[field].hasOwnProperty(arrAntIdx[1])) {
                            listIdx[field][arrAntIdx[1]] = [];
                        }
                        if (!listIdx[field][arrAntIdx[1]].includes(item.ant_idx)) {
                            listIdx[field][arrAntIdx[1]].push(item.ant_idx);
                        }
                    });
                }
                /*
                {
                DOCFLD0001286: { '0': [ '1_0_0' ], '1': [ '1_1_1' ] },
                DOCFLD0001287: {
                    '0': [ '2_0_0', '3_0_0', '4_0_0', '5_0_0' ],
                    '1': [ '2_1_1', '3_1_1', '4_1_1', '5_1_1' ]
                },
                DOCFLD0001285: {
                    '0': [ '7_0_0', '0_0_0', '8_0_0', '6_0_0' ],
                    '1': [ '7_1_1', '0_1_1', '8_1_1', '6_1_1' ]
                }
                }
                */
                const verifyListIdx = [];
                for (const field in listIdx) {
                    if (checkFlag && Object.keys(listIdx[field]).length === listAutogen.length) {
                        for (const index in listAutogen) {
                            if (!verifyListIdx.includes(listIdx[field][index].length)) verifyListIdx.push(listIdx[field][index].length);
                        }
                    } else {
                        checkFlag = false;
                    }
                }
                if (checkFlag && verifyListIdx.length === 2) formatData = 1;
            } else if (Object.keys(fieldListData).length > 3 && fieldListData[Object.keys(fieldListData)[0]].dp_tp === AppConstants.DISPLAY_TYPE.TABLE) {
                for (const field in fieldListData) {
                    // Split sentence item (' ') to many sentences
                    const newSentence = [];
                    fieldListData[field].sentence.forEach((item) => {
                        // const splitSentence = [];
                        const arrItem = item.content.split(' ');
                        if (arrItem.length > 1) {
                            for (let i = 0; i < 2; i ++) {
                                for (let i=0; i<arrItem.length-1 ; i++) {
                                    if ((arrItem[i].length < 4 || arrItem[i+1].length < 4) && !(arrItem[i].includes('-') && arrItem[i+1].includes('-'))) {
                                        arrItem[i] = `${arrItem[i]}${arrItem[i + 1]}`;
                                        arrItem.splice(i + 1, 1);
                                    }
                                }
                            }
                            arrItem.forEach(value => {
                                const dataNew = {...item};
                                dataNew.content = value;
                                newSentence.push(dataNew);
                            })
                        } else {
                            newSentence.push(item);
                        }
                    });
                    fieldListData[field].sentence = newSentence
                    listIdx[field] = {};
                    fieldListData[field].sentence.forEach((item) => {
                        if (!listIdx[field].hasOwnProperty(item.ant_idx)) {
                            listIdx[field][item.ant_idx] = [];
                        }
                        listIdx[field][item.ant_idx].push(item);
                    });
                    const firstKey = Object.keys(listIdx[field])[0];
                    if (listIdx[field][firstKey].length < 10 || !arrLength.includes(listIdx[field][firstKey].length)) {
                        arrLength.push(listIdx[field][firstKey].length);
                    }
                }
                arrLength.sort((a, b) => a - b);
                if (arrLength.length === 3 && arrLength[0] * arrLength[1] === arrLength[2]) {
                    formatData = 2;
                }
                if (formatData === 0) {
                    const checkFormat = [];
                    for (const field in fieldListData) {
                        if (!checkFormat.includes(fieldListData[field].sentence.length)) {
                            checkFormat.push(fieldListData[field].sentence.length);
                        }
                        listData[field] = {};
                        fieldListData[field].sentence.forEach(item => {
                            const newKey = `${item.ant_idx.split('_')[1]}_${item.ant_idx.split('_')[2]}`;
                            // console.log(newKey);
                            if (!listData[field].hasOwnProperty(newKey)) {
                                listData[field][newKey] = [];
                            }
                            listData[field][newKey].push(item);
                        })
                    }
                    if (checkFormat.length === 2) {
                        formatData = 3;
                    }
                }
            }
            return [formatData, listIdx, arrLength, listData];
        } catch (error) {
            console.log(error);
            return formatData;
        }
    }

    static async saveFormatDataBonjean(fieldListData, listAntIdx) {
        try {
            const result = {};
            const lenghtSentence = {};
            for (const field in fieldListData) {
                if (!result.hasOwnProperty(field)) {
                    result[field] = { data: [], conftt: [] };
                }
                if (!lenghtSentence.hasOwnProperty(field)) {
                    lenghtSentence[field] = {};
                }
                /*
                DOCFLD0001286: { '1_0_0': 42, '1_1_1': 42 },
                DOCFLD0001287: {
                    '2_0_0': 42,
                    '2_1_1': 42,
                },
                 DOCFLD0001285: {
                '7_0_0': 1,
                '7_1_1': 1,
                }
                */
               Object.keys(listAntIdx[field]).forEach((key) => {
                listAntIdx[field][key].forEach((item) => {
                    lenghtSentence[field][item] = 0;
                });
               });
                fieldListData[field].sentence.forEach((element) => {
                    lenghtSentence[field][element.ant_idx] = ++lenghtSentence[field][element.ant_idx];
                });
            }
            let fieldStandard = Object.keys(lenghtSentence)[0];
            const formatDataOutput = {};
            // Get field with the most sentence
            for (const field in lenghtSentence) {
                const fieldData = lenghtSentence[field];
                const fieldStandardData = lenghtSentence[fieldStandard];
                if (Object.keys(fieldData).length > Object.keys(fieldStandardData).length
                || fieldData[Object.keys(fieldData)[0]] > fieldStandardData[Object.keys(fieldStandardData)[0]]) {
                    fieldStandard = field;
                }
            }
            for (const field in listAntIdx) {
                const arrayKeyFieldNormal = Object.keys(lenghtSentence[field]);
                const fieldSentence = fieldListData[field].sentence;
                formatDataOutput[field] = {};
                for (const idxautogen in listAntIdx[field]) {
                    listAntIdx[field][idxautogen].forEach((item) => {
                        formatDataOutput[field][item] = [];
                    });
                }
                if (field === fieldStandard) {
                    fieldSentence.forEach((element) => {
                        formatDataOutput[field][element.ant_idx].push(element.content);
                    });
                } else if (Object.keys(lenghtSentence[field]).length === Object.keys(lenghtSentence[fieldStandard]).length) {
                        fieldSentence.forEach((element) => {
                            const index = arrayKeyFieldNormal.indexOf(element.ant_idx);
                            const fieldStandardSentence = lenghtSentence[fieldStandard];
                            for (let idx = 0; idx < fieldStandardSentence[Object.keys(fieldStandardSentence)[index]]; idx++) {
                                formatDataOutput[field][element.ant_idx].push(element.content);
                            }
                        });
                    } else {
                        fieldSentence.forEach((element) => {
                            formatDataOutput[field][element.ant_idx].push(element.content);
                        });
                        const listKeyAntIdx = Object.keys(formatDataOutput[field]);
                        listKeyAntIdx.forEach((index) => {
                            const keyAutogen = index.split('_')[1];
                            const lengthCluster = listAntIdx[fieldStandard][keyAutogen].length;
                            let newData = [];
                            for (let i = 0; i < lengthCluster; i++) {
                                newData = newData.concat(formatDataOutput[field][index]);
                            }
                            formatDataOutput[field][index] = newData;
                        });
                    }
                arrayKeyFieldNormal.forEach((key) => {
                    formatDataOutput[field][key].forEach((item) => {
                        result[field].data.push(item);
                    });
                });
            }
            return result;
        } catch (error) {
            console.log(error);
            throw new BadRequestError('Format data for vessel profile failed!!!');
        }
    }

    static async getListDocumentVP() {
        try {
            let listFieldVP = [];
            const fieldVP = await model.AdmDoc.findOne({ where: { doc_nm: AppConstants.VESSEL_PROFILE, delt_flg: 'N' }, raw: true });
            if (fieldVP) {
                await model.AdmDoc.findAll({ where: { grp_doc_id: fieldVP.doc_tp_id, delt_flg: 'N' }, attributes: ['doc_tp_id'], raw: true }).then((result) => {
                    listFieldVP = result ? result.map((data) => data.doc_tp_id) : null;
                });
             }
            return listFieldVP;
        } catch (error) {
            logger.error(error);
            return [];
        }
    }

    static async saveFormatDataHydro(data, arrLength) {
        try {
            const result = {};
            for (const field in data) {
                result[field] = { data: [] };
                const fieldData = data[field];
                for (const antIdx in fieldData) {
                    const idxSentence = fieldData[antIdx];
                    let checkTrim = false;
                    if (idxSentence.length < 20) {
                        for (item of idxSentence) {
                            if(item.content.includes('-')) {
                                checkTrim = true;
                                break;
                            }
                        }
                    }
                    if (checkTrim) {
                        idxSentence.forEach((item) => {
                            for (let i = 0; i < arrLength[1]; i++) {
                                result[field].data.push(item.content);
                            }
                        });
                    } else if (!checkTrim && idxSentence.length < 20) {
                        for (let i = 0; i < arrLength[0]; i++) {
                            idxSentence.forEach((item) => {
                                result[field].data.push(item.content);
                            });
                        }
                    } else {
                        idxSentence.forEach((item) => {
                            result[field].data.push(item.content);
                        });
                    }
                }
            }
            return result;
        } catch (error) {
            throw new BadRequestError('Format data for vessel profile failed!!!');
        }
    }

    static async saveFormatDataKN(data) {
        try {
            const result = {};
            const objectLength = {};
            Object.keys(data).forEach(field => {
                Object.keys(data[field]).forEach(key => {
                    if (!objectLength.hasOwnProperty(key) && data[field][key].length > 1) {
                        objectLength[key] = data[field][key].length;
                    }
                });
            });
            Object.keys(data).forEach(field => {
                result[field] = { data: [] };
                Object.keys(data[field]).forEach(key => {
                    if (data[field][key].length > 1) {
                        data[field][key].forEach(item => {
                            result[field].data.push(item.content);
                        });
                    } else if (data[field][key].length === 1) {
                        for (let i = 0; i < objectLength[key]; i++) {
                            result[field].data.push(data[field][key][0].content);
                        }
                    }
                });
            });
            return result;
        } catch (error) {
            throw new BadRequestError('Format data for vessel profile failed!!!');
        }
    }

    static hasNumber(myString) {
        return /\d/.test(myString);
    }

    static async saveDataFrameTable(data) {
        try {
            const result = {};
            let isEqual = false;
            let lengthSentence = 0;
            for (const fldId in data) {
                result[fldId] = { data: [] };
                data[fldId].sentence.forEach(item => {
                    if (this.hasNumber(item.content)) {
                        result[fldId].data.push(item.content);
                    } else {
                        console.log(item.content);
                    }
                })
                if (lengthSentence === 0) {
                    lengthSentence = result[fldId].data.length;
                } else {
                    if (result[fldId].data.length === lengthSentence) {
                        isEqual = true;
                    }
                }
            }
            const listIndexReplace = [];
            if (isEqual) {
                for (const fldId in result) {
                    for (const index in result[fldId].data) {
                        const value = result[fldId].data[index];
                        if ((value.includes('(') || value.includes(')') || value.includes('*')) && !listIndexReplace.includes(index)) {
                            listIndexReplace.push(index);
                        }
                    }
                }
            }
            for (const fldId in result) {
                const newData = [...result[fldId].data];
                let count = 0;
                for (const index of listIndexReplace) {
                    newData.splice((index - count), 1);
                    count++;
                }
                result[fldId].data = newData;
            }
            return result;
        } catch (error) {
            throw new BadRequestError('Format data for vessel profile failed!!!');
        }
    }
}
