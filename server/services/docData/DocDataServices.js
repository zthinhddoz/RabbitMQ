/* eslint-disable camelcase */
/* eslint-disable indent */
/* eslint-disable prettier/prettier */
import model from '~/shared/models';
import { BadRequestError } from '../utils/errors';
import DocFieldServices from '../docField/DocFieldServices';
import LocationServices from '../locations/LocationServices';
import DocTmpltServices from '../docTmplt/DocTmpltServices';
import AppConstants from '../utils/constants';
import processRawExtractedData from '../docData/processRawExtractedData';
import TransactionServices from '../transaction/TransactionServices';
import logger from '~/shared/logger';
const Sequelize = require('sequelize');

export default class DocDataServices {
  constructor() {
    this.dataRes = null;
  }

    static async getDocDataInfo(docId) {
        await model.DexDoc.findOne({ where: { doc_id: docId }, include: ["adm_doc_tp", "dex_tmplt"] })
        .then(result => {
            this.dataRes = result ? result.dataValues : null;
        }).catch(err => {
            logger.error(err);
            throw new BadRequestError("Getting Doc-Data failed!");
        });
        return this.dataRes;
    };

    static async getDocList(condition) {
        const { size, co_cd, loc_cd, doc_tp_id } = condition;
        await model.DexDoc.findAll({
            where: { co_cd, loc_cd, doc_tp_id, extr_ctnt: { [Sequelize.Op.not]: null } },
            attributes: ['doc_id', 'extr_ctnt'],
            limit: size,
            order: [['cre_dt', 'DESC']],
        })
        .then(result => {
            this.dataRes = result ? result.map(item => item.dataValues) : null;
        }).catch(err => {
            logger.error(err);
            throw new BadRequestError('[Biz-Test] Getting document list failed!');
        });
        return this.dataRes;
    }

    static async getDocDetails(doc_id) {
        try {
            let whereClause = { doc_id }
            await model.DexDoc.findOne({
                attributes: ["doc_tp_id", "doc_nm"],
                where: whereClause,
                include:
                    [
                        {
                            model: model.DexTmplt,
                            as: "dex_tmplt",
                            attributes: ["grp_id"],
                            include:
                                [{
                                    model: model.DexGrp,
                                    as: "dex_grp",
                                    attributes: ["grp_nm"],
                                }],
                        },
                        {
                            model: model.AdmDoc,
                            as: "adm_doc_tp",
                            attributes: ["doc_cd", "mtch_tp_cd", "tmplt_ftr_id"],
                            where: { delt_flg: 'N' },
                            include:
                                [{
                                    model: model.AdmDocFld,
                                    as: "doc_fields",
                                    attributes: ["doc_fld_id", "fld_nm", "tmplt_flg", "attr_ctnt", "extr_tp_cd"],
                                    where: { delt_flg: 'N' },
                                }],
                        }
                    ],
            }).then(result => {
                this.dataRes = result ? result.dataValues : null;
            });
            return this.dataRes;
        } catch (error) {
            logger.error(error);
            this.dataRes = false;
            return this.dataRes;
        }
    };

    static async getAllDocDataOfGroup(docGroupId) {
        await model.DexDoc.findAll({ where: { prnt_doc_id: docGroupId }, include: ["adm_doc_tp", "dex_tmplt"] })
        .then(result => {
            this.dataRes = result ? result.map(data => data.dataValues) : null;
        }).catch(err => {
            logger.error(err);
            throw new BadRequestError("Getting Doc-Data failed!");
        });
        return this.dataRes;
    };

    static async getDocDataInfoByDocName(docName) {
        await model.DexDoc.findOne({ where: { doc_nm: docName }, include: ["adm_doc_tp", "dex_tmplt"] })
        .then(result => {
            this.dataRes = result ? result.dataValues : null;
        }).catch(err => {
            logger.error(err);
            throw new BadRequestError("Getting Doc-Data failed!");
        });
        return this.dataRes;
    };

    
    static async getDocDataSameParent(prntFileNm) {
        await model.DexDoc.findAll({
            where: { prnt_file_nm: prntFileNm },
            attributes: ['doc_id', 'root_nm', 'doc_nm', 'doc_tp_id', 'prnt_file_nm'],
            order: [[ 'doc_id', 'ASC' ]]
        })
        .then(result => {
            this.dataRes = result;
        })
        .catch(err => {
            logger.error(err);
            throw new BadRequestError('Getting Doc-Data failed!');
        });
        return this.dataRes;
    }

    // TODO: This func need to update userID to DB
    static async updateBizData(docId, bizData) {
        const { docData, issueList } = bizData;
        const newMergeIssue = await this.processNewDocIssue(docId, issueList, true);

        await model.DexDoc.update({ aft_biz_ctnt: JSON.stringify(docData), doc_iss_cd: JSON.stringify(newMergeIssue) }, { where: { doc_id: docId } })
        .then(result => {
            this.dataRes = result ? result.length : 0;
        }).catch(err => {
            logger.error(err);
            throw new BadRequestError("Updating Biz Data failed!");
        });
        return this.dataRes;
    }

    static async updateDocExtracData(docId, orgContent, extrContent, totalPage) {
        const updateField = {};
        if (orgContent) {
            orgContent.cre_dt = new Date();
            updateField.org_ctnt = JSON.stringify(orgContent);
        }
        if (extrContent) updateField.extr_ctnt = JSON.stringify(extrContent);
        if (totalPage) updateField.pg_val = totalPage;
        await model.DexDoc.update({ ...updateField }, { where: { doc_id: docId } })
        .then(result => {
            this.dataRes = result ? result.length : 0;
        }).catch(err => {
            logger.error(err);
            throw new BadRequestError("Updating Doc-Data failed!");
        });
        return this.dataRes;
    }

    static async getRenderableData(docId, latestTransaction) {
        const extractedData = await this.getDocDataInfo(docId);
        let lastestTransactionData = null;
        if (latestTransaction) {
            lastestTransactionData = await TransactionServices.getLatestTransactionHistory(docId);
        }
        if (extractedData) {
            if (extractedData.file_sz && extractedData.extr_ctnt) {
                this.dataRes = await this.createDataRenderer(extractedData, extractedData.doc_tp_id, lastestTransactionData);
            } else {
                // Is Doc Group
                this.dataRes = await this.createGroupDocData(docId, extractedData, extractedData.doc_tp_id);
            }
        }
        return this.dataRes;
    }

    static getListField(templateData){
        const result = [];
        templateData.forEach(boxValue => {
            boxValue.fields.forEach(fldId => {
                const fieldData = {
                    doc_fld_id: fldId,
                    extr_tp_cd: boxValue.extr_type
                };
                result.push(fieldData);
            });
        });
        return result;
    }
    static mapExtrType(fieldList, templateField){
        const result = [...fieldList];
        for(let index in fieldList){
            for(let idxTmplt in templateField){
                if(fieldList[index].doc_fld_id === templateField[idxTmplt].doc_fld_id){
                    result[index].extr_tp_cd = templateField[idxTmplt].extr_tp_cd;
                    break;
                }
            }
        }
        return result;
    }

    static async createDataRenderer(extractedData, docType, lastestTransactionData) {
        // Calling DB of field to get fieldName info
        let fieldList = await DocFieldServices.getFieldByComDoc(extractedData.doc_id, docType);
        // const fieldList = await DocFieldServices.getDocTypeFieldList(docType);
        let templateData = await DocTmpltServices.getDocTmpltById(extractedData.dex_tmplt_id);
        if(templateData && templateData.length > 0){
            let templateField = JSON.parse(templateData[0].cordi_val_ctnt);
            templateField = this.getListField(templateField);
            fieldList = this.mapExtrType(fieldList, templateField);
        }

        const modifiedfieldListData = {};
        fieldList && fieldList.forEach(field => {
            if(field.extr_tp_cd != AppConstants.EXTRACTION_TYPE.HEADER_FOOTER_REMOVAL){
                modifiedfieldListData[`${field.doc_fld_id}`] = field;
            }
        });
        // Calling DB of group field to get groupName info
        const docFieldGroup = await DocFieldServices.getDocFieldGroup(docType);
        const modifiedfieldGroupData = {};
        docFieldGroup && docFieldGroup.forEach(fieldGrp => {
            modifiedfieldGroupData[`${fieldGrp.doc_fld_id}`] = fieldGrp.fld_nm;
        });
        let newModifiedData = null;
        if (lastestTransactionData) {
            newModifiedData = JSON.parse(lastestTransactionData.tj_ctnt).data;
        } else {
            if (!extractedData.aft_biz_ctnt) return null;
            newModifiedData = JSON.parse(extractedData.aft_biz_ctnt);
        }

        let allFieldRenderData = {};

        //Process for return all field of doctype with data for render
        for (const field of Object.keys(modifiedfieldListData)) {
            // Get field name, field group id, dp_tp_cd, ord_no
            const modifiedField = modifiedfieldListData[field];
            allFieldRenderData[field] = {}
            if (modifiedField) {
                allFieldRenderData[field].fld_nm = modifiedField.fld_nm;
                allFieldRenderData[field].fld_grp_flg = modifiedField.fld_grp_flg;
                allFieldRenderData[field].dp_tp_cd = modifiedField.dp_tp_cd;
                const fieldGroupId = modifiedField.fld_grp_id;
                allFieldRenderData[field].fld_grp_id = fieldGroupId;
                if (fieldGroupId && fieldGroupId !== "0" && modifiedfieldGroupData[`${fieldGroupId}`]) {
                    allFieldRenderData[field].fld_grp_nm = modifiedfieldGroupData[`${fieldGroupId}`];
                    allFieldRenderData[field].dp_tp_cd = 'T'; // TODO: this is hard code for type table, have R row and T table only
                }
                allFieldRenderData[field].ord_no = modifiedField.ord_no;
            }
        }
        // Process for return all field of extractedData with data for render
        const mapModifiedField = {};
        for (const [fieldCode, dataField] of Object.entries(newModifiedData)) {
            // Find and get field name, field group id, dp_tp_cd, ord_no
            const field = fieldList.find(element => element.doc_fld_id === fieldCode);
            const modifiedField = modifiedfieldListData[`${fieldCode}`];
            if (modifiedField) {
                mapModifiedField[fieldCode] = {
                    data: dataField.data,
                    fld_nm: modifiedField.fld_nm,
                    fld_grp_flg: modifiedField.fld_grp_flg,
                    dp_tp_cd: modifiedField.dp_tp_cd,
                    fld_grp_id: modifiedField.fld_grp_id,
                    ord_no: modifiedField.ord_no,
                    confdt: dataField.confdt,
                    fld_grp_id: null,
                    fld_cd: field.fld_cd,
                }
                const fieldGroupId = modifiedField.fld_grp_id;
                if (fieldGroupId && fieldGroupId !== "0" && modifiedfieldGroupData[`${fieldGroupId}`]) {
                    mapModifiedField[fieldCode].fld_grp_nm = modifiedfieldGroupData[`${fieldGroupId}`];
                    mapModifiedField[fieldCode].dp_tp_cd = 'T'; // TODO: this is hard code for type table, have R row and T table only
                }
            }
        }
        extractedData.aft_biz_ctnt = JSON.stringify(mapModifiedField);
        extractedData.isDocGroup = false;
        return { extractedData, allFieldRenderData };
    };

    static async createGroupDocData(docId, extractedData, docType) {
        // Getting all group
        const allDocGroup = await this.getAllDocGroup();
        const existDocGrp = allDocGroup.some(docGrp => docType === docGrp.doc_tp_id);
        if (existDocGrp) {
            // Get all Doc List => get docId of docIdGroup
            extractedData.allDocData = await this.getAllDocDataOfGroup(docId);
            extractedData.isDocGroup = true;
        } else {
            extractedData.isDocGroup = false;
        }
        return extractedData;
    };

    /***
     * This func is used to get latest doc data by template id
     * Can get doc_nm (file name) by this func
     */
    static async getLatestDocByTmplId(templateId) {
        await model.DexDoc.findOne(
            { where: { dex_tmplt_id: templateId },
            order: [ [ 'upd_dt', 'DESC' ]] })
        .then(result => {
            this.dataRes = result ? result.dataValues : { doc_id: "none" };
            })
        .catch(_error => {
            logger.error(_error);
            throw new BadRequestError({ errorCode: 1113 });
        });
        return this.dataRes;
    };
    static async getLocIdByDocId(docId) {
        await model.DexDoc.findOne({ where: { doc_id: docId }, attributes: ['loc_id'] })
            .then(result => {
                this.dataRes = result ? result.dataValues.loc_id : null;
            })
            .catch(_error => {
                logger.error(_error);
                throw new BadRequestError({ errorCode: 1113 });
            });
        return this.dataRes;
    };

    static async updateTemplateIdForDoc(docId, templateId, usrId) {
        await model.DexDoc.update({ dex_tmplt_id: templateId, upd_usr_id: usrId }, { where: { doc_id: docId } })
        .then(result => {
                this.dataRes = result ? result : null;
            })
        .catch(_error => {
            logger.error(_error);
            throw new BadRequestError({ errorCode: 1113 });
        });
        return this.dataRes;
    }

    static async updateTemplateAndDocStatus(docId, templateId, status, usrId) {
        const tmpltId = templateId || null; // tmpId could not be empty
        await model.DexDoc.update({ dex_tmplt_id: tmpltId, sts_cd: status, upd_usr_id: usrId }, { where: { doc_id: docId } })
        .then(result => {
                this.dataRes = result ? result : null;
            })
        .catch(_error => {
            logger.error(_error);
            throw new BadRequestError({ errorCode: 1113 });
        });
        return this.dataRes;
    }

    static async getExtractedDocList(params) {
        console.log(params);
        let whereClauseDexLoc = {};
      
        if (params.co_cd && params.co_cd !== "All")
          whereClauseDexLoc = { ...whereClauseDexLoc, co_cd: params.co_cd };
        if (params.loc_nm && params.loc_nm !== "All")
          whereClauseDexLoc = { ...whereClauseDexLoc, loc_nm: params.loc_nm };
        if (params.doc_tp_id && params.doc_tp_id !== "All")
          whereClauseDexLoc = { ...whereClauseDexLoc, doc_tp_id: params.doc_tp_id };
      
        let whereClauseDexDoc = {
          prnt_doc_id: null,
          cre_dt: {
            [Sequelize.Op.between]: [
              params.from_date,
              `${params.to_date.split("T")[0]} 23:59:59`,
            ],
          },
        };
      
        if (params.sts_cd && params.sts_cd !== "All")
          whereClauseDexDoc = {
            ...whereClauseDexDoc,
            sts_cd:
              params.sts_cd === AppConstants.DOC_STATUS.NEED_ANNOTATE
                ? {
                    [Sequelize.Op.or]: [
                      AppConstants.DOC_STATUS.NEED_ANNOTATE,
                      AppConstants.DOC_STATUS.NEED_MATCHING,
                    ],
                  }
                : params.sts_cd,
          };
      
        if (params?.extend_search?.trim()?.length) {
          const moreSearch = params.extend_search.replace("'", '"');
          const patternSearch =
            params?.match_exactly === "true"
              ? moreSearch
              : "%" + moreSearch.toLowerCase().trim() + "%";
          whereClauseDexDoc = {
            ...whereClauseDexDoc,
            [Sequelize.Op.or]: [
              Sequelize.where(
                Sequelize.fn("LOWER", Sequelize.col("dex_doc.upd_usr_id")),
                "LIKE",
                patternSearch
              ),
              Sequelize.where(
                Sequelize.fn("LOWER", Sequelize.col("dex_doc.doc_id")),
                "LIKE",
                patternSearch
              ),
              Sequelize.where(
                Sequelize.fn("LOWER", Sequelize.col("dex_doc.root_nm")),
                "LIKE",
                patternSearch
              ),
            ],
          };
        }
      
        let orderClause = [["upd_dt", "DESC"]];
      
        if (params.sort_column_id && params.sort_direction) {
          const splitToColumn = params.sort_column_id.split(".");
          if (splitToColumn.length === 1)
            orderClause = [[splitToColumn[0], params.sort_direction.toUpperCase()]];
          else if (splitToColumn[0] === "adm_doc_tp")
            orderClause = [
              [
                { model: model.AdmDoc, as: "adm_doc_tp" },
                splitToColumn[1],
                params.sort_direction.toUpperCase(),
              ],
            ];
          else if (splitToColumn[0] === "dex_loc")
            orderClause = [
              [
                { model: model.DexLoc, as: "dex_loc" },
                splitToColumn[1],
                params.sort_direction.toUpperCase(),
              ],
            ];
        }
      
        await model.DexDoc.findAndCountAll({
          where: whereClauseDexDoc,
          include: [
            {
              model: model.AdmDoc,
              as: "adm_doc_tp",
            },
            {
              model: model.DexLoc,
              as: "dex_loc",
              attributes: ["loc_nm"],
              where: whereClauseDexLoc,
            },
          ],
          order: orderClause,
          attributes: [
            "doc_id",
            "dex_tmplt_id",
            "doc_nm",
            "file_sz",
            "cre_dt",
            "upd_dt",
            "co_cd",
            "loc_cd",
            "doc_tp_id",
            "root_nm",
            "sts_cd",
            "loc_id",
            "upd_usr_id",
            "doc_iss_cd",
          ],
          limit: params.row_per_page,
          offset: params.row_per_page * params.page_number,
        }).then((result) => (this.dataRes = result));
      
        return this.dataRes;
      }
      

    static async getDocName(docName,companyCode,locationCode,parrentId) {
        this.dataRes = await model.DexDoc.findOne({
            where: {doc_nm : docName, co_cd: companyCode, loc_cd: locationCode, prnt_doc_id: parrentId },
          });
        return this.dataRes;
    };

    static async addDexdoc(doc) {
        await model.DexDoc.create({
            doc_id: doc.doc_id,
            doc_nm: doc.doc_nm ? doc.doc_nm : null,
            root_nm: doc.root_nm ? doc.root_nm : null,
            cre_usr_id: doc.cre_usr_id ? doc.cre_usr_id : null,
            upd_usr_id: doc.cre_usr_id ? doc.cre_usr_id : null,
            co_cd: doc.co_cd ? doc.co_cd : null,
            loc_cd: doc.loc_cd ? doc.loc_cd : null,
            loc_id: doc.loc_id ? doc.loc_id : null,
            doc_tp_id: doc.doc_tp_id ? doc.doc_tp_id : null,
            file_sz: doc.file_sz ? doc.file_sz : null,
            prnt_doc_id: doc.prnt_doc_id ? doc.prnt_doc_id : null,
            sts_cd: doc.sts_cd ? doc.sts_cd : "N",
            pg_val: doc.pg_val ? doc.pg_val : 0,
            prnt_file_nm: doc.prnt_file_nm ? doc.prnt_file_nm : null,
        }).then(result => {
            return result ? result.dataValues : null;
        })
        .catch((err => {
            throw err;
        }));
    };

    // TODO: This func need to add userID update to DB
    static async updateDocStatus(docId, status, userId) {
        await model.DexDoc.update({ sts_cd: status, upd_usr_id: userId }, { where: { doc_id: docId } })
        .then(result => {
            this.dataRes = result ? result.length : 0;
        }).catch(err => {
            logger.error(err);
            throw new BadRequestError("Updating status failed!");
        });
        return this.dataRes;
    }

    static async getAllDocGroup() {
        await model.AdmDoc.findAll({where: { grp_flg: 'Y', delt_flg: 'N' }}).then(result => {
            this.dataRes = result ? result.map(AdmDoc => AdmDoc.dataValues) : null;
        }).catch(err => {
            logger.error(err);
            throw new BadRequestError('Get all doc group failed');
        });
        return this.dataRes;
    };

    static async getDocInfo(docId) {
        await model.DexDoc.findOne({ where: { doc_id: docId }, include: "dex_prnt"})
        .then(result => {
            this.dataRes = result ? result.dataValues : null;
        }).catch(err => {
            logger.error(err);
            return null;
        });
        return this.dataRes;
    };

    static async getUrlFolderById(docId) {
        const docInfo = await this.getDocInfo(docId);
        if(docInfo){
            let docUrl = null;
            if(docInfo.dex_prnt){
                // Have prnt_doc_id
                const docPrntInfo = docInfo.dex_prnt.dataValues;
                docUrl = await LocationServices.getFolLocUrl(docPrntInfo.co_cd, docPrntInfo.loc_cd, docPrntInfo.doc_tp_id);
            }else{
                // No prnt_doc_id
                docUrl = await LocationServices.getFolLocUrl(docInfo.co_cd, docInfo.loc_cd, docInfo.doc_tp_id);
            }
            if(docUrl){
                this.dataRes = [docInfo.doc_nm, docUrl.fol_loc_url];
                return this.dataRes;
            }
        }
        return null;
    };

    static async getLatestDexDoc() {
        const latestDoc = await model.DexDoc.findOne({
            order: [ [ 'cre_dt', 'DESC' ]]
            })
        .catch(err => {
            logger.error(err);
            return null;
        });
        return latestDoc;
    }

    /**
     * Save original info
     * Convert and save to extr_cnt
     * Update doc status
     * */
    // TODO: This function need to modify to add userID into update DB
    static async saveExtractionData(data, docTypeId, docId) {
        try {
            const totalPage = data && data.page_info ? data.page_info.length : 0;
            const groupFieldData = await processRawExtractedData.getPreProcessData(data.field_list, docTypeId);
            if (Object.keys(groupFieldData).length === 0) {
                // Some related DB problems
                const replaceOldIssue = true;
                await DocDataServices.updateIssueStatusDoc(docId, AppConstants.DOC_STATUS.FAILED, [AppConstants.DOC_ISSUES_CODE.DB], replaceOldIssue);
                return { sts_cd: 500, msg: 'Some DB not matched' };
            }
            let message = 'Save transform data successfully';
            const finalData = {};
            let issueList = [];
            for (let group in groupFieldData) {
                let dataRes = null;
                try {
                    dataRes = await processRawExtractedData.processExtractedData(groupFieldData[group].data, groupFieldData[group].isWrapText, docTypeId);
                } catch (err) {
                    issueList = [AppConstants.DOC_ISSUES_CODE.PE];
                    await this.savePartialExtract(groupFieldData[group].data)
                    .then(res => {
                        dataRes = res;
                    })
                    .catch(err => {
                        message = 'Save Partial Extract Failed';
                    });
                }
                if (dataRes) {
                    Object.keys(dataRes).forEach(fieldId => {
                        finalData[fieldId] = dataRes[fieldId];
                    });
                }
            }
            await processRawExtractedData.updateDocData(docId, data, finalData, totalPage, issueList);
            return { sts_cd: 200, msg: message };
        } catch (error) {
            logger.error(error);
            const replaceOldIssue = true;
            await DocDataServices.updateIssueStatusDoc(docId, AppConstants.DOC_STATUS.FAILED, [AppConstants.DOC_ISSUES_CODE.SYS], replaceOldIssue);
            throw new BadRequestError('Transform data failed');
        }
    }

    static async savePartialExtract(fieldListData){
        try {
            const result = processRawExtractedData.mergeSentenceByCorY(fieldListData);
            let finalData = {};
            const lengthArr = [];
            for (const fldId in result) {
                if (result[fldId].dp_tp === AppConstants.DISPLAY_TYPE.ROW) {
                    finalData[fldId] = {data: result[fldId].text};
                } else {
                    finalData[fldId] = {data: []};
                    result[fldId].sentence.forEach(item => {
                        finalData[fldId].data.push(item.content);
                    });
                }
            }
            finalData = processRawExtractedData.addConfdtDisplayRow(finalData, result);
            finalData = await processRawExtractedData.clearSpecialChar(finalData);
            return finalData;
        } catch (error) {
            logger.error(error);
            return null;
        }
    }

    static async deleteDexDoc(docId) {
        await model.DexDoc.destroy({ where: { doc_id: docId }})
        .then(result => {
            this.dataRes = result;
        }).catch(err => {
            logger.error(err);
            return null;
        });
        return this.dataRes;
    };

  static async updateTemplateForDoc(docId, templateId, templateVersion, usrId) {
    try {
      const currentDocInfo = await model.DexDoc.findOne({ where: { doc_id: docId } });
      const currentOrgContent = currentDocInfo.org_ctnt ? JSON.parse(currentDocInfo.org_ctnt) : {};
      currentOrgContent.tmplt_ver_val = templateVersion;
      const updateData = { org_ctnt: JSON.stringify(currentOrgContent), dex_tmplt_id: templateId };
      await model.DexDoc.update(updateData, { where: { doc_id: docId, upd_usr_id: usrId } })
        .then((result) => {
        this.dataRes = result || null;
      });
    } catch (err) {
      throw err;
    }
    return this.dataRes;
  }

  static async updateIssueStatusDoc(docId, status, issueList, replaceOldIssue, isBiz = false) {
    try {
      if (docId && status && issueList && typeof issueList === 'object') {
        // Get current issue
        let newMergeIssue = issueList;
        if (!replaceOldIssue) {
            newMergeIssue = await this.processNewDocIssue(docId, issueList, isBiz);
        }
        // Update with new
        await model.DexDoc.update(
          { sts_cd: status, doc_iss_cd: JSON.stringify(newMergeIssue) },
          { where: { doc_id: docId } },
        ).then(result => {
          this.dataRes = result ? result.length : 0;
        });
      } else {
        throw new Error('Invalid params !');
      }
    } catch (err) {
      console.log('Err update issue status doc', err);
      throw err;
    }
    return this.dataRes;
  }

  
  // This function is used for finding doc issue, when using this function for case update biz issue, all previous biz issue will be removed
  static async processNewDocIssue(docId, issueList, isBiz) {
    try {
        const currentDocIssue = await model.DexDoc.findOne({ where: { doc_id: docId }, attributes: ['doc_iss_cd'] });
        const currentIssueObj = currentDocIssue.doc_iss_cd ? JSON.parse(currentDocIssue.doc_iss_cd) : [];
        if (isBiz) {
            const bizIssueArray = [AppConstants.DOC_ISSUES_CODE.BF, AppConstants.DOC_ISSUES_CODE.PB];
            currentIssueObj.forEach(item => {
                if (bizIssueArray.includes(item)) {
                    const indexOfItem = currentIssueObj.indexOf(item);
                    currentIssueObj.splice(indexOfItem, 1);
                }
            });
        }
        const newMergeIssue = [...new Set(currentIssueObj.concat(issueList))];
        this.dataRes = newMergeIssue;
    } catch (err) {
      logger.error(err);
      throw err;
    }
    return this.dataRes;
  }
}
