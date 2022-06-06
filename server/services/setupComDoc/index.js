/* eslint-disable no-nested-ternary */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-shadow */
/* eslint-disable camelcase */
/* eslint-disable array-callback-return */
/* eslint-disable no-unused-vars */
import { Router } from 'express';
import { Op } from 'sequelize';
import model from '~/shared/models';
import logger from '~/shared/logger';
import { customRes, createBulkData } from '~/utils/commonFuncs';
import SetUpComDocService from './SetUpComDocService';
import generateNewId from '~/utils/generateNewId';
import keycloak from '../shared/middleWare/checkSSO';

const router = Router();

router.get('/document', keycloak.protect(), async (req, res, next) => {
  try {
    const doc = await model.AdmDoc.findAll({
      where: { delt_flg: 'N' },
      order: [['doc_tp_id', 'asc']],
    }).catch((error) => {
      res.status(500).json({ errorCode: 200 });
      logger.error(error);
    });

    if (doc == null) {
      res.status(500).json({ errorCode: 200 });
    } else {
      customRes(req, res, next, doc);
    }
  } catch (error) {
    res.status(500).json({ errorCode: 200 });
    logger.error(error);
  }
});

router.get('/company-documents/all-document-fields', keycloak.protect(), async (req, res, next) => {
  try {
    const { locId, docTpId } = req.query;

    const dataAllDocFld = await model.AdmDocFld.findAll({
      include: [
        {
          model: model.AdmCoDocFld,
          as: 'com_doc_field',
          where: {
            loc_id: locId,
          },
          required: false,
        },
      ],
      attributes: {
        include: [
          [model.sequelize.literal("CASE WHEN (com_doc_field.delt_flg = 'N') THEN 'N' ELSE 'Y' END"), 'deleteFlag'],
          [
            model.sequelize.literal(
              'CASE WHEN (com_doc_field.ord_no IS NOT NULL AND com_doc_field.ord_no <> adm_doc_fld.ord_no) THEN com_doc_field.ord_no ELSE adm_doc_fld.ord_no END',
            ),
            'orderNumber',
          ],
          [
            model.sequelize.literal(
              'CASE WHEN (com_doc_field.fld_cd IS NOT NULL AND com_doc_field.fld_cd <> adm_doc_fld.fld_cd) THEN com_doc_field.fld_cd ELSE adm_doc_fld.fld_cd END',
            ),
            'fieldCode',
          ],
        ],
      },
      where: { doc_tp_id: docTpId, delt_flg: 'N' },
    }).catch((error) => {
      res.status(500).json({ errorCode: 201 });
      logger.error(error);
    });

    if (dataAllDocFld != null) customRes(req, res, next, dataAllDocFld);
    else res.status(500).json({ errorCode: 201 });
  } catch (error) {
    res.status(500).json({ errorCode: 201 });
    logger.error(error);
  }
});

router.get('/company-document/get-data-com-doc', keycloak.protect(), async (req, res, next) => {
  try {
    const conditionQuery = {
      [Op.and]: [
        req.query && req.query.companyCode && req.query.companyCode !== 'All' ? { co_cd: req.query.companyCode } : '',
        req.query && req.query.documentIDs && req.query.documentIDs.length !== 0
          ? { doc_tp_id: { [Op.in]: req.query.documentIDs } }
          : req.query.documentName.length !== 0
            ? { doc_tp_id: '' }
            : '',
        { delt_flg: req.query && req.query.deleteFlag === 'true' ? 'Y' : 'N' },
      ],
    };

    const dataDocument = await model.DexLoc.findAll({
      include: ['documents'],
      where: conditionQuery,
      order: [['loc_id', 'ASC']],
    }).catch((error) => {
      res.status(500).json({ errorCode: 203 });
      logger.error(error);
    });
    customRes(req, res, next, dataDocument);
  } catch (error) {
    res.status(500).json({ errorCode: 203 });
    logger.error(error);
  }
});

router.get('/company-document/init-company-document', keycloak.protect(), async (req, res, next) => {
  try {
    const dataInitDocument = await model.DexLoc.findAll({
      where: {
        delt_flg: 'N',
      },
      include: ['documents'],
      order: [['loc_id', 'ASC']],
    }).catch((error) => {
      res.status(500).json({ errorCode: 203 });
      logger.error(error);
    });
    customRes(req, res, next, dataInitDocument);
  } catch (error) {
    res.status(500).json({ errorCode: 203 });
    logger.error(error);
  }
});

router.put('/save-field-detail', keycloak.protect(), async (req, res, next) => {
  const {
 locId, documentId, fieldList, userId 
} = req.body;
  try {
    const PREFIX_ID_COM_DOC_FLD = 'COMDOCFLD';
    let lastedComFieldId = await SetUpComDocService.getLatestId();
    const allComDoc = await model.AdmCoDocFld.findAll({ raw: true });
    const listUpdate = [];
    const listNew = [];
    const listNewDataComDocFld = [];
    fieldList.forEach((element) => {
      let checkExists = false;
      for (const item of allComDoc) {
        if (item.loc_id === locId && item.doc_fld_id === element.doc_fld_id) {
          checkExists = true;
          break;
        }
      }
      if (checkExists) {
        listUpdate.push(element);
      } else {
        listNew.push(element);
      }
    });
    // Update
    if (listUpdate) {
      for (const element of listUpdate) {
        const dataUpdate = {
          locId,
          documentId,
          userId,
          fieldId: element.doc_fld_id,
          active: element.deleteFlag,
          orderNumber: element.orderNumber,
          fieldCode: element.fieldCode,
        };
        await SetUpComDocService.updateFieldDetail(dataUpdate);
      }
    }
    // Insert
    if (listNew) {
      for (const element of listNew) {
        listNewDataComDocFld.push({
          adm_co_doc_fld_id: lastedComFieldId,
          loc_id: locId,
          doc_fld_id: element.doc_fld_id,
          ord_no: element.orderNumber,
          fld_cd: element.fieldCode,
          cre_usr_id: userId,
          upd_usr_id: userId,
          delt_flg: element.deleteFlag,
        });
        lastedComFieldId = generateNewId(lastedComFieldId, PREFIX_ID_COM_DOC_FLD);
      }
      await createBulkData(model.AdmCoDocFld, listNewDataComDocFld);
    }
    res.status(200).json({
      message: 'Update field detail information successfully!',
    });
  } catch (error) {
    res.status(500).json({ errorCode: 205 });
    logger.error(error);
  }
});

export default router;
