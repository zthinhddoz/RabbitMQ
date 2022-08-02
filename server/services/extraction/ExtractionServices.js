/* eslint-disable no-restricted-syntax */
import DocDataServices from '../docData/DocDataServices.js';
import TemplateServices from '../template/TemplateServices.js';
import AppConstants from '../utils/constants';
import { processRunBizRuleByDoc } from '../bizRule/index';
import { uploadDocMethod } from '../document/uploadDocMethod';
import { processRunExtrRuleByDoc } from '../extractionRule/index.js';
import CoreAdapterServices from '../coreAdapter/CoreAdapter';
import ManageApiServices from '../manageApi/manageApiServices.js';
import { getFullPathForAllFileTypes } from '../utils/commonFuncs';
import { getCodeFromClient, getCodeFromClientWithAuthen, callReturnCodeProc } from '../manageApi/manageApiFunctions';
import logger from '~/shared/logger';
import { isArray } from 'lodash';

const axios = require('axios');

export default class ExtractionServices {
  constructor() {
    this.dataRes = null;
  }

  static async updateMatchingForTmplt(matchingData, docTypeId, usrId) {
    let tmpId = matchingData.tmp_id;
    let tmpType = matchingData.tmp_type;
    try {
      if (tmpId) {
        // Update matching data for template ID
        await TemplateServices.updateTemplateMatching(tmpId, matchingData, usrId);
      } else {
        // Find template or create
        const templateInfo = await TemplateServices.getTmpltAfterGenerateNew(matchingData, docTypeId, usrId);
        tmpId = templateInfo.tmpltId;
        tmpType = templateInfo.tmpltType;
      }
    } catch (err) {
      logger.error(err);
      throw err;
    }
    return [tmpType, tmpId];
  }

  static async updateTemplateVersionForDoc(docId, tmpId, usrId) {
    try {
      const tmpltVersion = await TemplateServices.getTemplateVersion(tmpId);
      await DocDataServices.updateTemplateForDoc(docId, tmpId, tmpltVersion, usrId);
    } catch (err) {
      logger.error(err);
      throw err;
    }
    return true;
  }

  static async updateDocData(reExtract, docId, tmpId, status, usrId) {
    try {
      await DocDataServices.updateTemplateAndDocStatus(docId, tmpId, status, usrId);
      if (reExtract && (status === AppConstants.DOC_STATUS.EXTRACTED || status === AppConstants.DOC_STATUS.VERIFY)) {
        await this.updateTemplateVersionForDoc(docId, tmpId, usrId);
      }
    } catch (err) {
      logger.error(err);
      throw err;
    }
    return true;
  }

  /**
   * INPUT: fileData : {
   *  docId
   *  coCd
   *  locCd
   *  docTpId
   *  fileUrl || fileLoc
   * }
   * @param {*} fileData
   * @returns
   */
   static async extractDocument(docData, reExtract = false, updateTmplt = false) {
    const { doc_id } = docData;
    let fileData = { ...docData };
    if (!fileData && !doc_id) throw new Error('Extract File Info wrong!!!');
    let tmpType = '';
    let tmpId = '';
    let status = AppConstants.DOC_STATUS.IN_PROCESSING;
    fileData = await getFullPathForAllFileTypes(fileData);
    let fileUrl = fileData.file_url ? fileData.file_url : `${process.env.REACT_APP_DOC_LOC}${fileData.fileLoc}`;
    let coreErrMsg = '';
    let extractJson = null;
    const usrId = fileData.usr_id || 'no-user';
    try {
      const reqCoreMatching = {
        doc_id: doc_id,
        file_url: fileUrl,
        co_cd: fileData.co_cd,
        lo_cd: fileData.loc_cd,
        doc_tp_id: fileData.doc_tp_id,
        grp_val: fileData.grp_val || '',
        xlsx_url: fileData.xlsx_url || '',
        xls_url: fileData.xls_url || '',
      };
      const matchingData = await CoreAdapterServices.runMatching(reqCoreMatching, fileData.doc_tp_id).catch(err => {
        coreErrMsg = err;
        throw new Error('Could not matching!');
      });
      /**
       * If matching failed => update status N for docId
       * If matching return file is not annotated, tmp_id is empty, update status N for docId
       * If matching return file is not annotated, tmp_id is have, update status A for docId
       *
       * If extraction done:
       * - In case of extraction ok => update status E for docId
       * - In case of extraction failed => update status F for docId
       */
      coreErrMsg = matchingData.msg;
      tmpId = matchingData.tmp_id;
      tmpType = matchingData.tmp_type;
      if (matchingData.is_annotated) {
        const reqCoreExtract = {
          file_url: fileUrl,
          doc_id: doc_id,
          tmp_type: tmpType,
          tmp_id: tmpId,
          doc_tp_id: fileData.doc_tp_id,
          xls_url: fileData.xls_url || '',
        };
        const extractedData = await CoreAdapterServices.runExtract(reqCoreExtract, fileData.doc_tp_id).catch(err => {
          coreErrMsg = err;
          status = AppConstants.DOC_STATUS.FAILED;
          throw err;
        });

        // APPLY API MANAGE DATA INTO EXTRACTED DATA
        // Call API data configuration
        const reqAPIConfig = {
          co_cd: fileData.co_cd,
          loc_cd: fileData.loc_cd,
          doc_tp_id: fileData.doc_tp_id,
          delt_flg: 'N',
          cre_usr_id: usrId,
        };
        const docAPIList = await ManageApiServices.getApiConfig(reqAPIConfig, null, null).catch(err => next(err));
        // Apply API Manage config into Re-extraction.
        const updatedAPIData = [];
        const fieldList = extractedData.data ? extractedData.data.field_list : {};
        if (docAPIList.length > 0 && extractedData && extractedData.data) {
          for (let apiIdx = 0; apiIdx < docAPIList.length; apiIdx++) {
            const api = docAPIList[apiIdx];
            const apiInfo = JSON.parse(api.api_info_ctnt);
            const parameters = apiInfo && apiInfo.parameters ? JSON.parse(apiInfo.parameters) : [];
            const resKey = apiInfo && apiInfo.response_key ? apiInfo.response_key : '';
            const datCd = apiInfo && apiInfo.dat_cd ? apiInfo.dat_cd : '';
            let isDataFromDB = false;
            if (parameters.length > 0 && resKey && Object.keys(fieldList)) {
              const paramValues = {};
              for (let paramIdx = 0; paramIdx < parameters.length; paramIdx++) {
                const param = parameters[paramIdx];
                // get fields and extracted values for query
                const fld = Object.keys(fieldList).find(fieldId => fieldId === param.value.doc_fld_id);
                if (param.key && fld) {
                  paramValues[[param.key]] = fieldList[fld].text || '';
                }
              }
              if (resKey && Object.keys(paramValues).length > 0) {
                let hasData = false;
                const content = apiInfo && apiInfo.content ? JSON.parse(apiInfo.content) : {};
                let isURLValid = true;
                let path = null;
                try {
                  path = apiInfo.api_url ? new URL(apiInfo.api_url) : null;
                } catch (err) {
                  isURLValid = false;
                }
                // By default: Using API from Client
                let responseAPIData = null;
                if (isURLValid && path) {
                  if (apiInfo.authType === 'No Auth') {
                    try {
                      responseAPIData = await getCodeFromClient(path.origin).get(path.pathname, {
                        params: paramValues,
                      });
                    } catch (error) {
                      logger.error(error);
                    }
                  } else {
                    const { usrNm, pwd, token } = content;
                    if (path) {
                      try {
                        responseAPIData = await getCodeFromClientWithAuthen(
                          path.origin,
                          { usrNm, pwd, token },
                          apiInfo.authType,
                        ).get(path.pathname, { params: paramValues });
                      } catch (error) {
                        console.log('error: ', error);
                        logger.error(error);
                      }
                    }
                  }
                  if (responseAPIData && responseAPIData.data.length > 0) {
                    hasData = true;
                  }
                }
                /**
                 * Call data from DB when:
                 * If no data response from API Client and 'Is Only Using API' unchecked
                 * dat_cd is available
                 */
                if (!hasData && datCd && !apiInfo.flag) {
                  const reqDataCode = {
                    dat_cd: datCd,
                    res_key: resKey,
                    params: paramValues,
                  };
                  responseAPIData = await axios.get(
                    process.env.SERVER_URL + AppConstants.THIRD_PARTY_DATA.GET_CODE_FROM_DB,
                    { params: reqDataCode },
                  );
                  isDataFromDB = true;
                }
                // Add new data, prepare for saving and update into extractionData
                if (responseAPIData && responseAPIData.data) {
                  updatedAPIData.push({
                    api_id: api.api_id,
                    doc_fld_id: api.doc_fld_id,
                    codes: responseAPIData.data,
                    res_key: resKey,
                    from_db: isDataFromDB,
                  });
                }
              }
            }
          }
        }
        // Update return code back into API config
        if (updatedAPIData.length > 0) {
          for (let apiIdx = 0; apiIdx < updatedAPIData.length; apiIdx++) {
            const apiData = updatedAPIData[apiIdx];
            const updateFldVal = fieldList[apiData.doc_fld_id] || {};
            if (apiData.from_db) {
              updateFldVal.text = callReturnCodeProc(apiData.codes[0].result, apiData.res_key);
            } else {
              updateFldVal.text = callReturnCodeProc(apiData.codes[0], apiData.res_key);
            }
            fieldList[apiData.doc_fld_id] = {...updateFldVal, chars: [], sentence: [], coor_box: []};
          }
          extractedData.data.field_data = fieldList;
        }

        const saveExtractRes = await DocDataServices.saveExtractionData(
          extractedData.data,
          fileData.doc_tp_id,
          doc_id,
        ).catch(err => {
          coreErrMsg = 'Save Extraction Data Failed!';
          status = AppConstants.DOC_STATUS.FAILED;
          throw err;
        });
        if (saveExtractRes) {
          status = AppConstants.DOC_STATUS.EXTRACTED;
          await DocDataServices.updateTemplateIdForDoc(doc_id, tmpId, usrId).catch(err => next(err));
          const extractRuleRes = await processRunExtrRuleByDoc(doc_id);
          await DocDataServices.updateDocExtracData(doc_id, null, extractRuleRes, null);
          const bizRes = await processRunBizRuleByDoc(doc_id);
          await DocDataServices.updateBizData(doc_id, bizRes);
          if (fileData.smartLink) {
            const renderableData = await DocDataServices.getRenderableData(doc_id);
            extractJson = renderableData.extractedData.aft_biz_ctnt;
          }
        }
      } else if (updateTmplt) {
        matchingData.co_cd = fileData.co_cd;
        [tmpType, tmpId] = await this.updateMatchingForTmplt(matchingData, fileData.doc_tp_id, usrId);
      }
      await this.updateDocData(reExtract, doc_id, tmpId, status, usrId);
    } catch (error) {
      logger.error(error);
    }
    
    if (status === AppConstants.DOC_STATUS.IN_PROCESSING) {
      status = AppConstants.DOC_STATUS.NEED_MATCHING;
      await this.updateDocData(reExtract, doc_id, tmpId, status, usrId);
    }

    const annotateUrl = tmpId ? `${process.env.CLIENT_URL + AppConstants.CLIENT_URL.ANNOTATE}/${tmpType}/${tmpId}` : '';
    const viewExtUrl = process.env.CLIENT_URL + AppConstants.CLIENT_URL.VIEW_EXT;
    this.dataRes = {
      sts_cd: 200,
      extract_url: `${viewExtUrl}/${doc_id}`,
      annotate_url: annotateUrl,
      status,
      file_url: fileUrl,
      reason: coreErrMsg, // TODO: Define if need
      tmplt_id: tmpId,
      tmplt_type: tmpType,
      doc_id: doc_id,
      extract_json: extractJson,
    };
    return this.dataRes;
  }

  static async extractDocList(docList, usrId) {
    const extractTask = [];
    for (const docInfo of docList) {
      docInfo.usrId = usrId;
      extractTask.push(this.extractDocument(docInfo));
    }
    const resultTask = await Promise.all(extractTask);
    return resultTask;
  }

  static async makeExtractDocData(saveDocInfo, usrId, isSmartLink = false) {
    const docExtractData = {
      doc_id: saveDocInfo.doc_id,
      file_url: saveDocInfo.file_url,
      co_cd: saveDocInfo.co_cd,
      loc_cd: saveDocInfo.loc_cd,
      doc_tp_id: saveDocInfo.doc_type,
      grp_val: saveDocInfo.grp_val || '',
      usr_id: usrId,
      xlsx_url: saveDocInfo.xlsx_url || '',
      xls_url: saveDocInfo.xls_url || '',
    };
    if (isSmartLink) docExtractData.smartLink = true;
    return docExtractData;
  }

  static async saveExtractDocument(docData, originalFileName) {
    let extractedData = {};
    try {
      const saveDocData = await uploadDocMethod(docData, originalFileName);
      const usrId = docData.cre_usr_id;
      const docExtractData = await this.makeExtractDocData(saveDocData, usrId, true);
      // Calling matching -> extraction
      extractedData = await this.extractDocument(docExtractData, false, true);
    } catch (err) {
      logger.error(err);
      throw err;
    }
    return extractedData;
  }
}
