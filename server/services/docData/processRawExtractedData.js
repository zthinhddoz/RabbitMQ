import model from '~/shared/models';
import { BadRequestError } from '../utils/errors';
import ExtractionLogicServices from './ExtractionLogicServices';
import DocDataServices from '../docData/DocDataServices';
import AppConstants from '../utils/constants';
import CommonDataServices from '../common-data/CommonDataServices';
import VesselProfileServices from './VesselProfileServices';
import logger from '~/shared/logger';
const lodashClonedeep = require('lodash.clonedeep');
export default class processRawExtractedData {

    //THRESHOLD unit: fixel
    static THRESHOLD_FOR_ONE_LINE = 10;
    static THRESHOLD_FOR_ADD_ROW = 5;

    constructor() {
        this.dataRes = null;
    };

    //1. Add display type
    /*  
        input format
            {
                field_name: '',
                field_id: '',
                field_value: { sentence: [Array], text: '', coor_box: [Object] },
            }
        output format
            {
                field_name: '',
                field_id: '',
                field_value: { sentence: [Array], text: '', coor_box: [Object] },
                dp_tp: 'T'
            }
    */
    static async getPreProcessData(data, docTypeId) {
        try {
            let listFld = {};
            const groupFieldData = { text: { isWrapText: false, data: {} }, empty: { isWrapText: false, data: {} } };
            await model.AdmDocFld.findAll({where : {doc_tp_id: docTypeId, delt_flg: 'N'}}).then(result => {
                listFld = result ? result.map(data => data.dataValues) : null;
            })
            for (let fldId in data) {
                const found = listFld.find(element => element.doc_fld_id === fldId);
                if (found) {
                    data[fldId].dp_tp = found.dp_tp_cd;
                    data[fldId].fld_grp_id = found.fld_grp_id;
                    if (found.dp_tp_cd === AppConstants.DISPLAY_TYPE.TABLE) {
                        if (found.fld_grp_id) {
                            if (!groupFieldData.hasOwnProperty(found.fld_grp_id)) {
                                groupFieldData[found.fld_grp_id] = { isWrapText: false, data: {} };
                            }
                            groupFieldData[found.fld_grp_id].data[fldId] = data[fldId];
                            if (found.attr_ctnt && JSON.parse(found.attr_ctnt).WrapText === "true") {
                                groupFieldData[found.fld_grp_id].isWrapText = true;
                            }
                        } else {
                            groupFieldData.empty.data[fldId] = data[fldId];
                            if (found.attr_ctnt && JSON.parse(found.attr_ctnt).WrapText === "true") {
                                groupFieldData.empty.data[fldId].isWrapText = true;
                            }
                        }
                    } else {
                        groupFieldData.text.data[fldId] = data[fldId];
                    }
                }
            }
            return groupFieldData;
        } catch (error) {
            logger.error(error);
            return [];
        }
    };

    //2. check Range table data
        /*  
        Check field have dp_tp: T. Add in_table = 0 or 1
        0: if out of table
        1: if in table
            input format
            {
                field_name: '',
                field_id: '',
                field_value: { sentence: [Array], text: '', coor_box: [Object] },
                dp_tp: 'T',
            }
            output format
            {
                field_name: '',
                field_id: '',
                field_value: { sentence: [Array], text: '', coor_box: [Object] },
                dp_tp: 'T',
                in_table: 1
            }
        */
    static addAttributeTable(data) {
        try {
            let rowDataRange = [];
            for (let fldId in data) {
                if (data[fldId].dp_tp === AppConstants.DISPLAY_TYPE.TABLE) {
                    if (!Object.keys(rowDataRange).length) {
                        rowDataRange.push([data[fldId].coor_box[0].y1,data[fldId].coor_box[0].y2,[fldId]]);
                    } else {
                        let checkFlg = false;
                        for (let j in rowDataRange) {
                            if (Math.abs(data[fldId].coor_box[0].y1 - rowDataRange[j][0]) < this.THRESHOLD_FOR_ADD_ROW || Math.abs(data[fldId].coor_box[0].y2 - rowDataRange[j][1]) < this.THRESHOLD_FOR_ADD_ROW) {
                                rowDataRange[j][2].push(fldId);
                                checkFlg = true;
                            }
                        }
                        if (!checkFlg) rowDataRange.push([data[fldId].coor_box[0].y1,data[fldId].coor_box[0].y2,[fldId]]);
                    }
                }
            }
                /*Range contain
                    Ex:
                    [
                        [ 92.23727272727272, 121.32454545454546, [ '1' ] ],
                        [ 158.06636363636363, 842, [ '2', '3', '4' ] ]
                    ]
                */
            let maxColumn = 0;
            for (let idx in rowDataRange) {
                if (rowDataRange[idx][2].length > maxColumn) {
                    maxColumn = rowDataRange[idx][2].length;
                }
            }
            for (let idx in rowDataRange) {
                if (rowDataRange[idx][2].length === maxColumn) {
                    for (let fldIdx of rowDataRange[idx][2]) {
                        data[fldIdx].in_table = 1;
                    }
                }
                else data[rowDataRange[idx][2][0]].in_table = 0;
            }
            return data
        } catch (error) {
            throw new BadRequestError("Get range table failed!");
        }
    };
    //3. Clustering by ant_idx
    static formatCharsBySentence(fieldData){
        try {
            const cloneFieldData = {...fieldData};
            const chars = [];
            let idx = 0;
            for (let itemSentence in cloneFieldData.sentence) {
                const lengthItem =  cloneFieldData.sentence[itemSentence].content.replace(/\s/g, '').length;
                const charsEachSentence = [];
                for (let i = idx; i < idx+lengthItem ; i++) {
                    if (cloneFieldData.chars[i]) {
                        charsEachSentence.push({text: cloneFieldData.chars[i].text, confdt: cloneFieldData.chars[i].confdt});
                    }
                }
                chars.push(charsEachSentence)
                idx = idx + lengthItem;
            }
            return chars;
        } catch (error) {
            logger.error(error);
            throw new BadRequestError(error);
        }
    }

    static clusteringSentence(data) {
        try {
            /* ClusteringSentence if dp_tp is T base ant_idx
                Each array in Sentence is an page autogen
                Input format:
                "sentence": [
                    {
                        "x1": "x top-left",
                        "y1": "y top-left",
                        "x2": "x bottom-right",
                        "y2": "y bottom right",
                        "content": "No.2 HOLD",
                        "ant_idx": ""
                    },...
                ]
                Output format:
                "sentence": [
                    [
                        {
                            "x1": "x top-left",
                            "y1": "y top-left",
                            "x2": "x bottom-right",
                            "y2": "y bottom right",
                            "content": "No.2 HOLD",
                            "ant_idx": ""
                        },...
                    ],...
                ]
            */
            let arrCoor = [];
            for (let fldId in data) {
                if (data[fldId].dp_tp === AppConstants.DISPLAY_TYPE.TABLE) {
                    data[fldId].chars = this.formatCharsBySentence(data[fldId]);
                    let newSentence = [];
                    let newChars = [];
                    let newCoor = [];
                    for (let index in data[fldId].sentence) {
                        const elementStce = data[fldId].sentence[index];
                        const clusterIndex = elementStce.ant_idx.split('_')[2];
                        if (newSentence.length === clusterIndex) {
                            newSentence.push([]);
                            newChars.push([]);
                            newCoor.push([]);
                        } else {
                            //Miss sentence in page
                            const sentenceMissData = (clusterIndex - newSentence.length + 1);
                            for(let j = 0; j < sentenceMissData; j++){
                                newSentence.push([]);
                                newChars.push([]);
                                newCoor.push([]);
                            }
                        }
                        newSentence[clusterIndex].push(elementStce);
                        newChars[clusterIndex].push(data[fldId].chars[index])
                        newCoor[clusterIndex].push({y1: elementStce.y1, y2: elementStce.y2, ant_idx: elementStce.ant_idx})
                    }
                    data[fldId].sentence = newSentence;
                    data[fldId].chars = newChars;
                    if (data[fldId].in_table === 1 && newCoor.length > 0) {
                        arrCoor.push(newCoor);
                    }
                }
            }
            return data, arrCoor;
        } catch (error) {
            logger.error(error);
            throw new BadRequestError("Clustering field is table failed!");
        }
    };

    //4. Add empty or merge row 
    /*
        Check isWraptext
        Make length of Array in sentence is equal for each Field.in_table = 1 base arrRootAutoGen
        [Field_id].sentence: [ [Array], [Array] ]
    */   

    static formatArrCoor(arrCoor, isWrapText){
        try {
            let data = [];
            for (let i in arrCoor) {
                for (let j in arrCoor[i]) {
                    const corOfSentence = arrCoor[i][j];
                    if (i == 0) {
                        data.push(corOfSentence);
                    } else {
                        if (corOfSentence && data[j]) {
                            if (isWrapText && corOfSentence.length < data[j].length) {
                                data[j] = corOfSentence;
                            }
                            else if (!isWrapText && corOfSentence.length > data[j].length) {
                                data[j] = corOfSentence;
                            }
                        }
                    }
                }
            }
            return data;
        } catch (error) {
            throw new BadRequestError(error);
        }
    }

    static addEmptyValueIntoTable(sentence, chars, arrCoorAutoGen, page){
        try {
            for (let index in arrCoorAutoGen[page]) {
                if ((sentence[page][index] && 
                    (Math.abs(arrCoorAutoGen[page][index].y1 - sentence[page][index].y1) > this.THRESHOLD_FOR_ADD_ROW && Math.abs(arrCoorAutoGen[page][index].y2 - sentence[page][index].y2) > this.THRESHOLD_FOR_ADD_ROW))
                    || !sentence[page][index]) {
                        let valTemp = {};
                        valTemp.content = '';
                        sentence[page].splice(index,0,valTemp);
                        chars[page].splice(index,0,[]);
                    }
            }
            return sentence, chars;
        } catch (error) {
            throw new BadRequestError(error);
        }
    }

    static mergeCellValueOfTable(sentence, chars, arrCoorAutoGen, page){
        try {
            //Find min and max space
            let minDistance = 0;
            let maxDistance = 5;
            let itemBefore = null;
            sentence[page].forEach(element => {
                if (itemBefore) {
                    const rangeNextSentence = Math.abs(element.y1 - itemBefore.y2);
                    if (rangeNextSentence > maxDistance){
                        maxDistance = rangeNextSentence;
                    }
                    else if (rangeNextSentence < maxDistance - this.THRESHOLD_FOR_ADD_ROW && rangeNextSentence > minDistance && rangeNextSentence < 20) {
                        minDistance = rangeNextSentence;
                    }
                }
                itemBefore = element;
            })
            // console.log(sentence);
            const newSentence = [];
            const newChars = [];
            for (let index in sentence[page]) {
                if (newSentence.length === 0) {
                    newSentence.push(sentence[page][index]);
                    newChars.push(chars[page][index]);
                }
                else {
                    const idxLastSentence = newSentence.length - 1;
                    if (sentence[page][index].y1 - newSentence[idxLastSentence].y2 <= minDistance) {
                        newSentence[idxLastSentence].content = `${newSentence[idxLastSentence].content}\n${sentence[page][index].content}`;
                        newSentence[idxLastSentence].y2 = sentence[page][index].y2;
                        newChars[idxLastSentence] = newChars[idxLastSentence].concat([...chars[page][index]]);
                    }
                    else {
                        newSentence.push(sentence[page][index]);
                        newChars.push(chars[page][index]);
                    }
                    // if (sentence[page][index].y1 - newSentence[idxLastSentence].y2 > maxDistance - this.THRESHOLD_FOR_ADD_ROW) {
                    //     newSentence.push(sentence[page][index]);
                    //     newChars.push(chars[page][index]);
                    // }
                }
            }
            const result = {
                sentence: newSentence,
                chars: newChars,
            };
            return result;
        } catch (error) {
            throw new BadRequestError(error);
        }
    }
    static addEmptyOrMergeRow(data, arrCoor, isWrapText) {
        try {
            let arrRootAutoGen = null;
            arrRootAutoGen = this.formatArrCoor(arrCoor, isWrapText);
            for (let fldId in data) {
                if (data[fldId].in_table === 1) {
                    let sentence = data[fldId].sentence;
                    let chars = data[fldId].chars;
                    for (let page in sentence) {
                        if (isWrapText) {
                            const result = this.mergeCellValueOfTable(sentence, chars, arrRootAutoGen, page);
                            data[fldId].sentence[page] = result.sentence;
                            data[fldId].chars[page] = result.chars;
                        } else {
                            if (arrRootAutoGen[page] && sentence[page].length < arrRootAutoGen[page].length) {
                                data[fldId].sentence, data[fldId].chars = this.addEmptyValueIntoTable(sentence, chars, arrRootAutoGen, page);
                            }
                        }
                    }
                }
            }
            return data;
        } catch (error) {
            logger.error(error);
            throw new BadRequestError("Add Empty or Merge row failed!");
        }
    };
    //5. Map data and tranforms to format db
    /*
        Convert to format extr_ctnt(dex_doc)
        Input format: 
        DOCFLD0000746: {
            sentence: [ [Object], [Object] ],
            text: '98/434\n99/434',
            coor_box: [ [Object], [Object] ],
            fields_map: [ 'DOCFLD0000746' ],
            dp_tp: 'R'
        },
        Output format:
        "DOCFLD0000746": {
            "data": "98/434\n99/434"
        },
    */
    static convertToFormatDB(data, isWrapText){
        try {
            let finalData = {};
            let listDataAutoGen = {};
            const lengthArr = [];
            for (let fldId in data) {
                if (data[fldId].dp_tp === AppConstants.DISPLAY_TYPE.ROW) {
                    finalData[fldId] = {data: data[fldId].text};
                }
                else {
                    listDataAutoGen[fldId] = data[fldId].sentence;
                    if (lengthArr.length === 0) {
                        if (data[fldId].in_table === 1) {
                            const sentenceTmp = data[fldId].sentence;
                            for (let i in sentenceTmp) {
                                if (Array.isArray(sentenceTmp[i])) {
                                    lengthArr.push(sentenceTmp[i].length);
                                }
                            }
                        }
                    }
                }
            }
            if (listDataAutoGen) {
                for (let fldId in listDataAutoGen) {
                    // Add empty value into array when array value < array sample
                    if (listDataAutoGen[fldId].length < lengthArr.length) {
                        const addEmpty = [...listDataAutoGen[fldId]] 
                        for (let index = lengthArr.length-1; index >= listDataAutoGen[fldId].length; index--) {
                            addEmpty.push([]);
                        }
                        listDataAutoGen[fldId] = addEmpty;
                    }
                    finalData[fldId] = {};
                    finalData[fldId].data = [];
                    finalData[fldId].confdt = [];
                    let tempPage = {};
                    for (let page in listDataAutoGen[fldId]) {
                        if (listDataAutoGen[fldId][page][0] && listDataAutoGen[fldId][page][0].ant_idx) {
                            const pageAutogen = listDataAutoGen[fldId][page][0].ant_idx.split('_')[2];
                            tempPage[pageAutogen] = listDataAutoGen[fldId][page];
                        }
                        if (listDataAutoGen[fldId][page].length === lengthArr[page]) {
                            for (let word in listDataAutoGen[fldId][page]) {
                                finalData[fldId].data.push(listDataAutoGen[fldId][page][word].content);
                                finalData[fldId].confdt.push(data[fldId].chars[page][word]);
                            }
                        } else if (listDataAutoGen[fldId][page].length < lengthArr[page]) {
                            const confdtArr = [];
                            const listKeyPageValid = Object.keys(tempPage);
                            if ( !listKeyPageValid.includes(page)) {
                                for (let key = listKeyPageValid.length -1; key >= 0; key--) {
                                    if (page > key) {
                                        tempPage[page] = tempPage[key];
                                        break;
                                    }
                                }
                            }
                            listDataAutoGen[fldId][page] = tempPage[page];
                            for (let i=0; i < lengthArr[page] ; i++) {
                                let dataFld = "";
                                for (let k in listDataAutoGen[fldId][page]) {
                                    dataFld += " " + listDataAutoGen[fldId][page][k].content;
                                }
                                dataFld = dataFld.substring(1);
                                finalData[fldId].data.push(dataFld);
                            }
                            finalData[fldId].confdt = confdtArr;
                        } else {
                            throw ("Format invalid");
                        }
                    }
                }
            }
            return finalData;
        } catch (error) {
            logger.error(error);
            throw new BadRequestError("Convert to format db failed!");
        }
    }

    static addConfdtDisplayRow(result, data){
        try {
            for (let fldId in result) {
                if (data[fldId].dp_tp === AppConstants.DISPLAY_TYPE.ROW) {
                    const charsList = data[fldId].chars;
                    const arrConfdt = [];
                    for (let i in charsList) {
                        arrConfdt.push({ "text": charsList[i].text, "confdt": charsList[i].confdt})
                    }
                    result[fldId].confdt = arrConfdt
                }
            }
            return result;
        } catch (error) {
            logger.error(error);
            throw new BadRequestError("Add confdt failed!");
        }
    }

    static mergeSentenceByCorY(data){
        try {
            const cloneData = lodashClonedeep(data);
            const result = [];
            for (let fldId in cloneData) {
                const dataFld = data[fldId];
                if (dataFld.dp_tp === AppConstants.DISPLAY_TYPE.TABLE && dataFld.sentence.length > 1) {
                    let listSentence = [...dataFld.sentence];
                    for (let idx = 0; idx < listSentence.length-1 ; idx++) {
                        const listIndexSplice = [];
                        for (let idxCheck = idx+1 ; idxCheck < listSentence.length; idxCheck++) {
                            if(listSentence[idx].ant_idx === listSentence[idxCheck].ant_idx){
                                if (Math.abs(listSentence[idxCheck].y1 - listSentence[idx].y1) < this.THRESHOLD_FOR_ADD_ROW && Math.abs(listSentence[idxCheck].y2 - listSentence[idx].y2) < this.THRESHOLD_FOR_ADD_ROW) {
                                    listSentence[idx].content = `${listSentence[idx].content} ${listSentence[idxCheck].content}`;
                                    listSentence[idx].x2 = listSentence[idxCheck].x2;
                                    listIndexSplice.push(idxCheck);
                                }
                            }
                        }
                        if (listIndexSplice.length > 0) {
                            for (var i = listIndexSplice.length -1; i >= 0; i--) {
                                listSentence.splice(listIndexSplice[i],1);
                            }
                        }
                    }
                    cloneData[fldId].sentence = listSentence;
                }
            }
            return cloneData;
        } catch (error) {
            logger.error(error);
            throw new BadRequestError(error);
        }
    }

    static processBeforeTransferFormat(data, docTypeId){
        try {
            if (docTypeId === 'DOCTP0000028') {
                // Apply field: Container Gross Weight, Container Measure, Container Measure Unit, Container Package
                const listFldMergeRow = ['DOCFLD0000589', 'DOCFLD0000587', 'DOCFLD0000588', 'DOCFLD0000585'];
                data = ExtractionLogicServices.mergeRowForWeightMeasurement(data, listFldMergeRow);
            }
            return data;
        } catch (error) {
            logger.error(error);
            return data;
        }
    }

    static processAfterTransferFormat(data, docTypeId){
        try {
            if (docTypeId === 'DOCTP0000028') {
                data = ExtractionLogicServices.getContainerNo(data, 'DOCFLD0000582');
            }
            return data;
        } catch (error) {
            return data;
        }
    }
    static async updateDocData(docId, data, finalData, totalPage, issueList) {
        try {
            const replaceOldIssue = true;
            await DocDataServices.updateDocExtracData(docId, data, finalData, totalPage);
            await DocDataServices.updateIssueStatusDoc(docId, AppConstants.DOC_STATUS.EXTRACTED, issueList, replaceOldIssue);
        } catch (error) {
            throw new BadRequestError('Save extracted data faield!!!');
        }
    }

    static replaceChar(data, specialChar,replaceChar) {
        let result = [];
        const regexString =  new RegExp(`${specialChar}`, 'g');
        if (replaceChar.toLowerCase() === 'null') replaceChar = '';
        if (!Array.isArray(data)) {
            result = data.replace(regexString, replaceChar);
        } else {
            data.forEach(item => {
                result.push(item.replace(regexString, replaceChar))
            })
        }
        return result;
    }

    static async clearSpecialChar(data) {
        try {
            const whereClause = {com_dat_cd: 'SPECIAL_CHAR'};
            const attrArr = ['com_dat_val'];
            const commonData = await CommonDataServices.getCommonData(whereClause, attrArr).catch(err => next(err));
            if (commonData.length > 0) {
                const listCharReplace = JSON.parse(commonData[0].dataValues.com_dat_val).data;
                const listField = Object.keys(data);
                listField.forEach(fldId => {
                    listCharReplace.forEach(element => {
                        data[fldId].data = this.replaceChar(data[fldId].data, element.char, element.replace);
                    });
                }); 
            }
            return data;
        } catch (error) {
            logger.error(error);
            return data;
        }
    }

    static async sortSentenceWithIndexPage(data) {
        try {
            const result = {...data};
            for (let fldId in data) {
                const objectPageData = {};
                const arrPage = [];
                const newSentence = [];
                result[fldId].sentence.forEach(item => {
                    const pageIdx = item.ant_idx.split('_')[2];
                    if (!objectPageData.hasOwnProperty(pageIdx)) {
                        objectPageData[pageIdx] = [];
                        arrPage.push(pageIdx);
                    }
                    objectPageData[pageIdx].push(item);
                })
                arrPage.sort();
                arrPage.forEach(idxPage => {
                    objectPageData[idxPage].forEach(item => {
                        newSentence.push(item);
                    })
                })
                result[fldId].sentence = [...newSentence];
            }
            return result;
        } catch (error) {
            logger.error(error);
            return data;
        }
    }

    static async processExtractedData(
        fieldListData,
        isWrapText,
        docTypeId,){
        try {
            let arrCoor = [];
            let result = {};
            let runFlowVessel = false;
            // Sort data with index page
            const preProcessData = await this.sortSentenceWithIndexPage(fieldListData);
            // Check doc type belong to vessel profile
            const listFldVP = await VesselProfileServices.getListDocumentVP();
            // Check document type is belong vessel profile
            if (listFldVP.includes(docTypeId)) {
                const formatRawData = VesselProfileServices.arrangeBoxByCorX(preProcessData);
                const checkFormatVessel = VesselProfileServices.checkFormatData(formatRawData);
                if (checkFormatVessel[0] === 1) {
                    // https://tinyurl.com/4recb8ub
                    runFlowVessel = true;
                    result = await VesselProfileServices.saveFormatDataBonjean(formatRawData, checkFormatVessel[1]);
                } else if (checkFormatVessel[0] === 2) {
                    // https://tinyurl.com/2p9558kf 
                    // H4, H5, H6, H7
                    runFlowVessel = true;
                    result = await VesselProfileServices.saveFormatDataHydro(checkFormatVessel[1], checkFormatVessel[2]);
                } else if (checkFormatVessel[0] === 3) {
                    // https://tinyurl.com/bdda7axt 
                    // K2, K10
                    runFlowVessel = true;
                    result = await VesselProfileServices.saveFormatDataKN(checkFormatVessel[3]);
                } else if (Object.keys(preProcessData).length === 2) {
                    // F1,2,3,4,5,6,7,8,9,10,11,12,13,14
                    //https://docs.google.com/spreadsheets/d/1GR3i1TtNZkj85nQQIu77SyiRQel9oLE-JgKaYIke2A0/edit#gid=2082014611
                    runFlowVessel = true;
                    result = await VesselProfileServices.saveDataFrameTable(formatRawData);
                }
            }
            if (!runFlowVessel) {
                // Normal
                result = this.mergeSentenceByCorY(preProcessData);
                
                result = this.addAttributeTable(result);    
                //Process before save format DB
                result = this.processBeforeTransferFormat(result, docTypeId);
        
                result, arrCoor = this.clusteringSentence(result);
        
                result = this.addEmptyOrMergeRow(result, arrCoor, isWrapText);
        
                result = this.convertToFormatDB(result);
                
                result = this.addConfdtDisplayRow(result, preProcessData);
    
                //Process after save format DB
                result = this.processAfterTransferFormat(result, docTypeId);
            }
            this.dataRes = await this.clearSpecialChar(result);

            return this.dataRes;
        } catch (error) {
            throw new BadRequestError(error);
        }
    }

}
