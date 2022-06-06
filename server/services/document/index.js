import { Router } from 'express';
import model from '~/shared/models';
import genareteNewId from "../utils/generateNewId";
import AdmDocServices from './AdmDocServices';
import ExtractionServices from '../extraction/ExtractionServices';
import { saveExtractDoc, uploadDocMethod } from './uploadDocMethod';
import { moveFileDownloadFromMiddleWareToInput } from '~/utils/commonFuncs';
import logger from '~/shared/logger';
import keycloak from '../shared/middleWare/checkSSO';
const uploadDoc = require('../shared/middleWare/uploadDoc');
import ExtractionRuleServices from '../extractionRule/ExtractionRuleServices';
import generateNewId from '~/utils/generateNewId';
import { PREFIX_ID_LOC, getLatestId } from '~/locations/index';
import { createBulkData } from '../utils/commonFuncs';

import { formatAttr } from '../utils/commonFuncs';
const { Op } = require("sequelize");
var sequelize = require('sequelize');
const router = Router();
const FIELD_PREFIX = "DOCFLD";

async function actionVesselProfile(isBelongToGrp, docInput) {
  const docTpId = docInput.doc_tp_id;
  const dexLocGrps = await model.DexLoc.findAll({
    raw: true,
    where: { doc_tp_id: docInput.grp_doc_id, delt_flg: 'N'}
  });
  const dexLocChildsGrps = await model.DexLoc.findAll({
    raw: true,
    where: { doc_tp_id: docTpId}
  });
  if (!isBelongToGrp && docInput.grp_doc_id !== '') {
    // Existing is not group change to group
    let lstUpdate = [];
    let lstCreateNew = [];
    let { newLocId } = await getLatestId();
    for (let i = 0; i < dexLocGrps.length; i++) {
      const dexLocGrp = dexLocGrps[i];
      let dexLocChild = null;
      for (let j = 0; j < dexLocChildsGrps.length; j++) {
        const child = dexLocChildsGrps[j];
        if (
          dexLocGrp.loc_cd === child.loc_cd &&
          dexLocGrp.co_cd === child.co_cd &&
          dexLocGrp.fol_loc_url === child.fol_loc_url
        ) {
          dexLocChild = child;
        }
      }
      if (!dexLocChild) {
        lstCreateNew.push({
          loc_id: newLocId,
          loc_cd: dexLocGrp.loc_cd,
          co_cd: dexLocGrp.co_cd,
          loc_nm: dexLocGrp.loc_nm,
          loc_tp_cd: dexLocGrp.loc_tp_cd,
          doc_tp_id: docTpId,
          fol_loc_url: dexLocGrp.fol_loc_url,
          cre_usr_id: docInput.userId,
          upd_usr_id: docInput.userId,
          prnt_loc_id: dexLocGrp.loc_id,
        })
        newLocId = generateNewId(newLocId, PREFIX_ID_LOC);
      } else if (dexLocChild && dexLocChild.delt_flg === 'Y') {
        lstUpdate.push(dexLocChild.loc_id)
      }
    }
    // Update delt_flg for DexLoc exits.
    if (lstUpdate.length > 0) {
      await model.DexLoc.update(
        {
          delt_flg: 'N',
          upd_usr_id: docInput.userId,
        },
        {
          where: { loc_id: lstUpdate },
        },
      ).catch(error => {
        logger.error(error);
        throw error;
      })
    }
    // Create new if DexLoc not exits
    if (lstCreateNew.length > 0) {
      await createBulkData(model.DexLoc, lstCreateNew);
    }
  } else if (isBelongToGrp && docInput.grp_doc_id === '') {
    // Existing is group change to not group.
    const locIds = dexLocChildsGrps.map(item => item.loc_id);
    await model.DexLoc.update(
      {
        delt_flg: 'Y',
        upd_usr_id: docInput.userId,
      },
      {
        where: { loc_id: locIds },
      },
    ).catch(error => {
      logger.error(error);
      throw error;
    })
  }
}

router.get('/', keycloak.protect(), async (req, res, next) => {
  try {
    let {docNm} = req.query;
    const deltFlg = req.query.deltFlg==="true" ? "Y" : "N";
    let whereClause = {};
    if(docNm != undefined) {
      docNm = docNm.toLowerCase();
      whereClause = {
        [Op.and]: [
          {
            doc_nm: sequelize.where(sequelize.fn('LOWER', sequelize.col('adm_doc.doc_nm')), 'LIKE', `%${docNm}%`),
          },
        ],
      };
    }
    whereClause.delt_flg = deltFlg;
    const doc = await model.AdmDoc.findAll({ include: ["tmplt_ftr","doc_parent"], where: whereClause}).then(result => {
      if (result == null) {
        res.status(500).json({ errorCode: 100 });
      } else {
        res.status(200).json({ result, message: 'Find documents suceesfully' });
      }
    })
  } catch (error) {
    next(error);
  }
});

router.put('/update/', keycloak.protect(), async (req, res, next) => {
  const { doc } = req.body;
  const docTpId = doc.doc_tp_id;
  let isBelongToGrp = false;
  let isGroupChange = false;
  try {
    const whereClause = { doc_tp_id: docTpId}
    await model.AdmDoc.findOne({ where: whereClause }).then(result => {
      if (result == null) {
        res.status(500).json({ errorCode: 100 });
      } else {
        if (result.grp_doc_id != '') isBelongToGrp = true;
        if (result.grp_doc_id != doc.grp_doc_id) isGroupChange = true;
        model.AdmDoc.update({
          doc_nm: doc.doc_nm ? doc.doc_nm : "",
          delt_flg: doc.delt_flg ? "Y" : "N",
          tmplt_ftr_id: doc.tmplt_ftr_id ? doc.tmplt_ftr_id : null,
          mtch_tp_cd: doc.mtch_tp_cd ? doc.mtch_tp_cd : "T",
          upd_usr_id: doc.userId ? doc.userId : "",
          grp_doc_id: doc.grp_doc_id ? doc.grp_doc_id : "",
          grp_flg: doc.grp_flg ? "Y" : "N",
          dyn_tp_val: doc.dyn_tp_val,
          core_sys_nm: doc.core_sys_nm,
        }, { where: whereClause }).then(rowUpdated => {
          if (rowUpdated == null) {
            res.status(500).json({ errorCode: 101 });
          }
        });
      }
    });
    if (isGroupChange) actionVesselProfile(isBelongToGrp, doc)
    res.status(200).json({ docTpId, message: 'Update document successful' });
  } catch (error) {
    next(error);
  }
});

router.put('/remove/', keycloak.protect(), async (req, res, next) => {
  const docRm = req.body.removeInfo;
  try {
    const whereClause = { doc_tp_id: docRm.doc_tp_id}
    model.AdmDoc.findOne({ where: whereClause }).then(result => {
      if (result == null) {
        res.status(500).json({ errorCode: 100 });
      } else {
        searchUsedDoc(docRm.doc_tp_id).then(usedDoc => {
          if(usedDoc.length>0){
            res.status(500).json({ errorCode: 100 });
          }else {
            model.AdmDoc.update({
              delt_flg: "Y",
              upd_usr_id: docRm.upd_usr_id,
            }, { where: whereClause }).then(rowUpdated => {
              if (rowUpdated == null) {
                res.status(500).json({ errorCode: 102 });
              }
            });
            model.DexLoc.update({
              delt_flg: "Y",
              upd_usr_id: docRm.upd_usr_id,
            }, { where: whereClause }).then(rowUpdated => {
              if (rowUpdated == null) {
                res.status(500).json({ errorCode: 102 });
              }
            });
            res.status(200).json({ message: 'Remove document successful' });
          }
        })
      }
    })
  } catch (error) {
    next(error);
  }
});

router.post('/add/', keycloak.protect(), async (req, res, next) => {
  try {
    const {doc} = req.body;
    const checkDocName = await model.AdmDoc.findOne({
      where: {doc_cd : doc.doc_cd },
    });
    if (checkDocName){
      if (checkDocName.delt_flg == 'Y') {
        model.AdmDoc.update(
          {
            doc_nm: doc.doc_nm,
            delt_flg: 'N',
            grp_doc_id: doc.grp_doc_id,
            upd_usr_id: doc.userId ? doc.userId : "",
          },
          {
            where: {
              doc_cd: doc.doc_cd,
            },
          },
        ).then(rowUpdate => {
          res.status(200).json({ message: 'Add Doc successful' });
        });
      } else {
        res.status(500).json({ errorCode: 107 });
      }
    }else{
      model.AdmDoc.findAll({
        limit: 1,
        order: [ [ 'cre_dt', 'DESC' ]]
      }).then(function(lastDoc){
        const prefix = "DOCTP";
        const lastId = lastDoc.length > 0 ? lastDoc[0].doc_tp_id : "";
        const docTpId = genareteNewId(lastId, prefix);
        model.AdmDoc.create({
          doc_tp_id: docTpId,
          doc_nm: doc.doc_nm ? doc.doc_nm : "",
          doc_cd: doc.doc_cd ? doc.doc_cd : "",
          tmplt_ftr_id: doc.tmplt_ftr_id ? doc.tmplt_ftr_id : null,
          mtch_tp_cd: doc.mtch_tp_cd ? doc.mtch_tp_cd : "T",
          cre_usr_id: doc.userId ? doc.userId : "",
          upd_usr_id: "",
          grp_flg: doc.grp_flg ? "Y" : "N",
          grp_doc_id: doc.grp_doc_id ? doc.grp_doc_id: "",
          dyn_tp_val: doc.dyn_tp_val,
          core_sys_nm: doc.core_sys_nm || 'main',
        }).then(rowUpdated => {
          if (rowUpdated == null) {
            res.status(500).json({ errorCode: 103 });
          } else {
            res.status(200).json({ docTpId, message: 'Insert document successful' });
          }
        }).catch((err => {
          logger.error(err);
          res.status(500).json({ errorCode: 103 });
        }));
      });
    }
  } catch (error) {
    next(error);
  }
});


router.get('/:docTpId/fields', keycloak.protect(), async (req, res, next) => {
  const { docTpId } = req.params;
  try {
    const whereClause = { doc_tp_id: docTpId };
    await model.AdmDocFld.findAll({
      include: ['doc'],
      where: whereClause,
      order: [['tmplt_flg', 'DESC'], ['ord_no', 'ASC']],
    }).then(result =>{
      if(result == null){
        res.status(500).json({ errorCode: 100 });
      }
      else{
        res.status(200).json({ result, message: 'Find documents fields suceesfully' });
      }
    })

  } catch (error) {
    next(error);
  }
});

router.post('/field/add/', keycloak.protect(), async (req, res, next) => {
  try {
    const {field} = req.body;
    let attrNew = null;
    if(req.body.attributes){
      
      attrNew = await formatAttr(req.body.attributes);
      attrNew = JSON.stringify(attrNew);
    }
    const docTpId = field.doc_tp_id ? field.doc_tp_id : "";

    const checkFieldCode = await model.AdmDocFld.findOne({
      where: {fld_cd : field.fld_cd , doc_tp_id : field.doc_tp_id },
    });
    if (checkFieldCode){
      if (checkFieldCode.delt_flg === 'Y') {
        model.AdmDocFld.update(
          {
            fld_nm: field.fld_nm,
            delt_flg: 'N',
            upd_usr_id: field.userId ? field.userId : "",
            attr_ctnt: attrNew,
          },
          {
            where: {
              doc_fld_id: checkFieldCode.doc_fld_id,
            },
          },
        ).then(rowUpdate => {
          res.status(200).json({ message: 'Add Field successful' });
        });
      } else {
        res.status(500).json({ errorCode: 107 });
      }
    }else{
      model.AdmDocFld.findAll({
        limit: 1,
        order: [ [ 'cre_dt', 'DESC' ]]
      }).then(function(lastField){
        searchLastFieldByOrdNo(field.doc_tp_id).then(lastItem => {
          const lastId = lastField.length > 0 ? lastField[0].doc_fld_id : "";
          model.AdmDocFld.create({
            doc_fld_id: genareteNewId(lastId, FIELD_PREFIX),
            doc_tp_id: docTpId,
            fld_nm: field.fld_nm ? field.fld_nm : "",
            fld_cd: field.fld_cd ? field.fld_cd : "",
            ord_no: lastItem.length > 0 ? Number(lastItem[0].ord_no) + 1 : "1",
            tmplt_flg: field.tmplt_flg ? "Y" : "N",
            com_dat_id: field.com_dat_id !== "0" ? field.com_dat_id : null,
            cre_usr_id: field.userId ? field.userId : "",
            dp_tp_cd: field.dp_tp_cd ? field.dp_tp_cd : "T",
            attr_ctnt: attrNew,
            extr_tp_cd: field.extr_tp_cd ? field.extr_tp_cd : "EMPTY",
            fld_grp_flg: field.fld_grp_flg,
            fld_grp_id: field.fld_grp_id,
          }).then(rowUpdated => {
            if (rowUpdated == null) {
              res.status(500).json({ errorCode: 103 });
            } else {
              res.status(200).json({ docTpId, message: 'Insert document field successful' });
            }
          }).catch((err => {
            logger.error(err);
            res.status(500).json({ errorCode: 102 });
          }));
        })
      })
    }
  } catch (error) {
    next(error);
  }
});


router.put('/field/update/', keycloak.protect(), async (req, res, next) => {
  const { field } = req.body;
  let attrNew = null;
  if (req.body.attributes) {
    attrNew = await formatAttr(req.body.attributes);
    attrNew = JSON.stringify(attrNew);
  }
  const docFldId = field.doc_fld_id;
  const docTpId = field.doc_tp_id;
  const whereClause = { doc_fld_id: docFldId, doc_tp_id: docTpId };
  await model.AdmDocFld.findOne({ where: whereClause }).then(async result => {
    if (result == null) {
      res.status(500).json({ errorCode: 100 });
    } else {
        // If change from group to normal field, remove all fld_grp_id of childs field
        if (result.fld_grp_flg === 'Y' && field.fld_grp_flg === 'N') {
          await model.AdmDocFld.update({ fld_grp_id: null},
            { where: { fld_grp_id: field.doc_fld_id } },
          );
          await model.DexExtrRule.destroy({ where: { doc_fld_id: field.doc_fld_id } });
        }

        /*
          If change parent field to another field and the new parent field don't has
          extraction rule -> create rule for new parent field
        */
        if (field.fld_grp_id && result.fld_grp_id !== field.fld_grp_id) {
          await ExtractionRuleServices.getExtractionRule({}, ['doc_fld_id']).then(result => {
            const documentFieldExtractionRule = result.map(item => item.doc_fld_id);
            const parentHadExtractionRule = documentFieldExtractionRule.includes(field.fld_grp_id);
            const currentHadExtractionRule = documentFieldExtractionRule.includes(field.doc_fld_id);
            if (currentHadExtractionRule && !parentHadExtractionRule) {
              ExtractionRuleServices.createExtrRule({
                doc_fld_id: field.fld_grp_id,
                extr_rule_data: '',
                cre_usr_id: field.userId,
                upd_usr_id: field.userId,
              });
            }
          });
        }

        await model.AdmDocFld.update({
        fld_nm: field.fld_nm ? field.fld_nm : "",
        fld_cd: field.fld_cd ? field.fld_cd : "",
        ord_no: field.ord_no ? field.ord_no : 0,
        delt_flg: field.delt_flg ? field.delt_flg : "N",
        tmplt_flg: field.tmplt_flg ? "Y" : "N",
        com_dat_id: field.com_dat_id !== "0" ? field.com_dat_id : null,
        upd_usr_id: field.userId ? field.userId : "",
        dp_tp_cd: field.dp_tp_cd ? field.dp_tp_cd : "R",
        attr_ctnt: attrNew,
        extr_tp_cd: field.extr_tp_cd ? field.extr_tp_cd : "EMPTY",
        fld_grp_flg: field.fld_grp_flg,
        fld_grp_id: field.fld_grp_id,
      }, { where: whereClause }).then(rowUpdated => {
        if (rowUpdated == null) {
          res.status(500).json({ errorCode: 101 });
        } else {
          res.status(200).json({ docFldId, message: 'Update document field successful' });
        }
      });
    }
  }).catch(err => next(err))
});

router.put('/field/remove/', keycloak.protect(), async (req, res, next) => {
  try {
    const whereClause = { doc_fld_id: req.body.docFldId }
    model.AdmDocFld.findOne({ where: whereClause }).then(result => {
      if (result == null) {
        res.status(500).json({ errorCode: 100 });
      } else {
        searchDocUsedField(req.body.docFldId).then(docUsed => {
          if(docUsed.length>0){
            res.status(500).json({ errorCode: 104 });
          }else {
            searchComUsedField(req.body.docFldId).then(async comUsed => {
              if(comUsed.length>0){
                res.status(500).json({ errorCode: 105 });
              }else{
                await model.AdmDocFld.update({ fld_grp_id: null},
                  { where: { fld_grp_id: req.body.docFldId } },
                );
                await model.DexExtrRule.destroy({ where: { doc_fld_id: req.body.docFldId } });
                await model.AdmDocFld.update({
                  delt_flg: "Y",
                  upd_usr_id: req.body.userId ? req.body.userId : "",
                }, { where: whereClause }).then(rowUpdated => {
                  if (rowUpdated == null) {
                    res.status(500).json({ errorCode: 102 });
                  } else {
                    res.status(200).json({ message: 'Remove document field successful' });
                  }
                });
              }
            })
          }
        })
      }
    })
  } catch (error) {
    next(error);
  }
});


router.get('/get-all-doc-tp', keycloak.protect(), async (req, res) => {
  const {allFlg} = req.query;
  const whereClause = {};
  if (!allFlg) whereClause.delt_flg = 'N';
  const includeClause = [];
  const result = await AdmDocServices.getAdmDocs(includeClause, whereClause);
  if (result) return res.status(200).json({ result, message: 'Find documents fields suceesfully' });
  return res.status(500).json({ errorCode: 100 });
});

router.get('/get-all-group', keycloak.protect(), async (req, res) => {
  const whereClause = {grp_flg: 'Y', delt_flg: 'N'};
  const includeClause = ["dex_loc"];
  const result = await AdmDocServices.getAdmDocs(includeClause, whereClause);
  if (result) return res.status(200).json(result);
  return res.status(500).json({ errorCode: 100 });
});

function searchUsedDoc (docTpId) {
  const whereClause = {doc_tp_id: docTpId, delt_flg: 'N'};
  return model.AdmCoDoc.findAll({ where: whereClause })
    .then(result => {
      return result;
    });
}

function searchComUsedField (docFldId) {
  const whereClauseForCom = {doc_fld_id: docFldId, delt_flg: 'N'};
  return model.AdmCoDocFld.findAll({ where: whereClauseForCom })
    .then(admCoDocFld => {
        return admCoDocFld;
    });
}
function searchDocUsedField (docFldId) {
  const whereClauseForDoc = {tmplt_ftr_id: docFldId, delt_flg: 'N'};
  return model.AdmDoc.findAll({ where: whereClauseForDoc }).then(admDoc => {
    return admDoc;
  });
}

function searchLastFieldByOrdNo (docTpId) {
  const whereClause = {doc_tp_id : docTpId};
  return model.AdmDocFld.findAll({
    limit: 1,
    where: whereClause,
    order: [[ 'ord_no', 'DESC' ]]
  }).then(function(lastItem){
    return lastItem;
  });
}

router.post('/upload-file', keycloak.protect(), uploadDoc, async (req, res) => {
  try {
    const docInfo = req.body;
    const originalFileName = req.file.originalname;
    await moveFileDownloadFromMiddleWareToInput(originalFileName, docInfo.urlFolder.replace('Output', 'Input'));
    const resObj = await uploadDocMethod(docInfo, originalFileName);

    // For Label upload result
    if (resObj.child_form_info) {
      const userId = resObj.child_form_info[0]?.usr_id;
      const extractReqData = resObj.child_form_info.map(item => ({
        docId: item.doc_id,
        coCd: item.co_cd,
        locCd: item.loc_cd,
        docTpId: item.doc_type,
        fileUrl: item.file_url,
      }));
      const resData = await ExtractionServices.extractDocList(extractReqData, userId);
    return res.status(200).json(resData);
    }

    return res.status(200).json(resObj);
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ errorCode: 108 });
  }
});

/**
 * This services allow user to store multiple uint8array data as pdf
 * These pdf will be save in DexDoc
 * Then extract
 */
/**
 * coCd: "DOU"
 * fileName: "CI Sample Doc 03.pdf"
 * locCd: "VN"
 * usrId: 'ABC',
 * splitInfos: [
 * {
 * docTpId: "DOCTP0000028"
 * fileData: "[37,80,68,70,45,49,46,55,10,37,129,129,129,129,10...
 * fileSz: "499.3"
 * folderLoc: "/DOU/VN/BL/Output"
 * locId: "LOC0000135"
 * pages: ["1"]
 * }
 * ]
 */
router.post('/save-extract-multi-doc', keycloak.protect(), async (req, res, next) => {
  try {
    const { splitInfos, fileName, coCd, locCd, prnt_doc_id, usrId,  } = req.body;
    const resultData = await saveExtractDoc(splitInfos, fileName, coCd, locCd, prnt_doc_id, usrId);
    const resData = await ExtractionServices.extractDocList(resultData, usrId);
    return res.status(200).json(resData);
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ errorCode: 108 });
  }
});

router.get('/get-all-group-dex-doc', keycloak.protect(), async (req, res) => {
  const whereClause = {grp_flg: 'Y'};
  const includeClause = ["dex_doc"];
  const result = await AdmDocServices.getAdmDocs(includeClause, whereClause);
  if (result) return res.status(200).json(result);
  return res.status(500).json({ errorCode: 100 });
});

router.get('/:docTpId/doc', keycloak.protect(), async (req, res) => {
  const {docTpId} = req.params;
  const whereClause = { grp_doc_id: docTpId, delt_flg: 'N'}
  const includeClause = [];
  const result = await AdmDocServices.getAdmDocs(includeClause, whereClause);
  if (result) res.status(200).json({ result, message: 'Find documents fields suceesfully' });
  return res.status(500).json({ errorCode: 100 });
});

export default router;
