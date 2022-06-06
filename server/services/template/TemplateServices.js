import model from '~/shared/models';
import { BadRequestError } from '../utils/errors';
import { removeIPandPort, getCurrentTimeString } from '~/utils/commonFuncs';
import CoreAdapterServices from '../coreAdapter/CoreAdapter';
import AppConstants from '~/utils/constants';
import DexGroupServices from '../dexGrp/DexGroupsServices';
import logger from '~/shared/logger';
const { Op } = require('sequelize');
const Sequelize = require('sequelize');

const axios = require('axios');

const getStringCoord = data => (typeof data !== 'string' ? JSON.stringify(data) : data);

export default class TemplateServices {
  constructor() {
    this.dataRes = null;
  }

  static async createNewTemplate(data, usrId) {
    try {
      const lastestTmpl = await model.DexTmplt.findOne({
        limit: 1,
        order: [['cre_dt', 'DESC']],
      });
      const lastestId = lastestTmpl ? parseInt(lastestTmpl.dataValues.tmplt_id) + 1 : 1;
      let grpId = AppConstants.TEMPLATE.GROUP.DEFAULT;
      if (!data.grp_id && data.grp_val) {
        // Check data.grp_val, if dont have => Create, else get grp_id
        const allGroups = await DexGroupServices.getAllDexGroup();
        const foundGroupVal = allGroups.filter(group => group.grp_nm === data.grp_val)[0];
        grpId = foundGroupVal.grp_id;
      }
      const createdTemplate = await model.DexTmplt.create({
        tmplt_id: lastestId,
        co_cd: data.co_cd,
        grp_id: grpId,
        tmplt_nm: lastestId,
        tp_val: data.tmp_type,
        sts_flg: AppConstants.TEMPLATE.STATUS.NEW,
        cordi_calc_ctnt: getStringCoord(data.coord_cal),
        cordi_val_ctnt: getStringCoord(data.coord_value) || '[]',
        cordi_key_ctnt: getStringCoord(data.coord_key) || '[]',
        shr_flg: AppConstants.TEMPLATE.SHARE_FLG.YES,
        img_url: data.img_url || '',
        root_url: data.root_url || '',
        img_nm: data.img_nm || data.img_url || '',
        cre_usr_id: usrId,
        upd_usr_id: usrId,
        doc_tp_id: data.doc_tp_id,
        tmplt_ver_val: getCurrentTimeString(),
      });
      this.dataRes = createdTemplate ? createdTemplate.dataValues : null;
    } catch (error) {
      logger.error(error);
      throw new BadRequestError('Could not create new template!!!');
    }
    return this.dataRes;
  }

  static async updateTemplateById(templateId, data) {
    const updateData = {
      grp_id: data.grp_id || AppConstants.TEMPLATE.GROUP.DEFAULT,
      tmplt_nm: data.tmplt_nm,
      tp_val: data.tp_val,
      sts_flg: data.sts_flg,
      cordi_calc_ctnt: getStringCoord(data.cordi_calc_ctnt),
      cordi_val_ctnt: getStringCoord(data.cordi_val_ctnt) || '[]',
      cordi_key_ctnt: getStringCoord(data.cordi_key_ctnt) || '[]',
      shr_flg: data.shr_flg,
      upd_usr_id: data.usrId,
      rule_id_val: getStringCoord(data.rule_id_val) || '',
      co_cd: data.co_cd,
      doc_tp_id: data.doc_tp_id,
    };
    // For case key_seq change, save this into DB
    if (data.tmplt_ver_val) {
      updateData.tmplt_ver_val = data.tmplt_ver_val;
    }
    if (data.root_url && data.img_url) {
      // Update if pass another file to annotation, update both url
      updateData.root_url = data.root_url;
      updateData.img_url = data.img_url;
    }
    await model.DexTmplt.update(updateData, {
      where: {
        tmplt_id: templateId,
      },
    })
      .then(result => {
        this.dataRes = result;
      })
      .catch(_err => {
        logger.error(_err);
        throw new BadRequestError({ errorCode: 1112 });
      });
    return this.dataRes;
  }

  static async updateTemplateStatus(templateId, status, usrId) {
    const currentDate = new Date().getTime();
    const updateData = {
      sts_flg: status,
      proc_dt: currentDate,
      upd_usr_id: usrId,
    };
    if (status === AppConstants.TEMPLATE.STATUS.ANNOTATING) {
      updateData.proc_usr_id = usrId;
    } else if (status === AppConstants.TEMPLATE.STATUS.ANNOTATED) {
      updateData.proc_usr_id = null;
      updateData.proc_dt = null;
    }

    /**
     The condition below is used to check the status flag of template before updating its status.
      If 'updateData.sts_flg' is not equal to sts_flg of this template,
      the action update will occur and 1 row has been updated (and vice versa).
    */
    const stsPreventUpdate =
      updateData.sts_flg === AppConstants.TEMPLATE.STATUS.ANNOTATING
        ? AppConstants.TEMPLATE.STATUS.ANNOTATING
        : updateData.sts_flg;

    const whereClause = {
      tmplt_id: templateId,
      sts_flg: {
        [Op.ne]: stsPreventUpdate,
      },
    };

    this.dataRes = [];
    const result = await model.DexTmplt.update(updateData, {
      where: whereClause,
    }).catch(_err => {
      logger.error(_err);
      throw new BadRequestError({ errorCode: 1114 });
    });

    this.dataRes = result;
    return this.dataRes;
  }

  static async getTemplateById(templateId) {
    await model.DexTmplt.findOne({ where: { tmplt_id: templateId }, include: ['dex_tmplt_rule'] })
      .then(result => {
        this.dataRes = result;
      })
      .catch(_error => {
        logger.error(_error);
        throw new BadRequestError({ errorCode: 1113 });
      });
    return this.dataRes;
  }

  static async getTmplInfoById(templateId) {
    await model.DexTmplt.findOne({ where: { tmplt_id: templateId } })
      .then(result => {
        this.dataRes = result;
      })
      .catch(_error => {
        logger.error(_error);
        throw new BadRequestError({ errorCode: 1115 });
      });
    return this.dataRes;
  }

  static async updateTemplateMatching(templateId, matchingData, usrId) {
    const updateData = {
      root_url: removeIPandPort(matchingData.root_url),
      img_url: removeIPandPort(matchingData.img_url),
      cordi_calc_ctnt: getStringCoord(matchingData.coord_cal),
      cordi_val_ctnt: getStringCoord(matchingData.coord_value) || '[]',
      cordi_key_ctnt: getStringCoord(matchingData.coord_key) || '[]',
      upd_usr_id: usrId,
    };
    await model.DexTmplt.update(updateData, {
      where: {
        tmplt_id: templateId,
      },
    })
      .then(result => {
        this.dataRes = result;
      })
      .catch(_err => {
        logger.error(_err);
        throw new BadRequestError({ errorCode: 1112 });
      });
    return this.dataRes;
  }

  static async updateTemplateAfterGenerate(templateId, templateData, usrId) {
    const updateData = {
      root_url: removeIPandPort(templateData.root_url),
      img_url: removeIPandPort(templateData.img_url),
      cordi_calc_ctnt: getStringCoord(templateData.coord_cal),
      cordi_val_ctnt: getStringCoord(templateData.coord_value) || '[]',
      cordi_key_ctnt: getStringCoord(templateData.coord_key) || '[]',
      doc_tp_id: templateData.doc_tp_id,
      upd_usr_id: usrId,
    };
    await model.DexTmplt.update(updateData, {
      where: {
        tmplt_id: templateId,
      },
    })
      .then(result => {
        this.dataRes = result;
      })
      .catch(_err => {
        logger.error(_err);
        throw new BadRequestError({ errorCode: 1112 });
      });
    return this.dataRes;
  }

  static async getAllTmpltNotAnnotated(groupId, templateType) {
    try {
      const tmplList = await model.DexTmplt.findAll({
        order: [['upd_dt', 'DESC']],
        where: { grp_id: groupId, tp_val: templateType },
      });
      tmplList.map(template => template.dataValues);
      const resData = tmplList.filter(template => {
        const coordCal = template.cordi_calc_ctnt ? JSON.parse(template.cordi_calc_ctnt) : {};
        if (coordCal && coordCal.key_sequence) {
          return (
            coordCal.key_sequence.length === 0 ||
            (Array.isArray(coordCal.key_sequence) &&
              coordCal.key_sequence.includes(AppConstants.TEMPLATE.KEY_SEQ_NOT_ANNOTATED))
          );
        }
        return false;
      });
      this.dataRes = resData;
    } catch (error) {
      logger.error(error);
      throw new BadRequestError('Could not get template not annotated!!!');
    }
    return this.dataRes;
  }

  // Find and update template by user id. That has being not kept by anyone in current moment (or last at least 3 day ago)
  // When un-sync, do loop for next item in empty template list (limited 3 times loop)
  // Return a template valid (and sync) or none
  static async updateEmptyTemplateForUsr(emptyTemplateList, syncTemplateIndex, usrId) {
    if (syncTemplateIndex < emptyTemplateList.length && syncTemplateIndex < 3) {
      try {
        const successDispute = await model.DexTmplt.update(
          {
            ...emptyTemplateList[syncTemplateIndex],
            proc_usr_id: usrId,
            proc_dt: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
          {
            where: {
              tmplt_id: emptyTemplateList[syncTemplateIndex].tmplt_id,
              [Sequelize.Op.or]: [
                {
                  proc_usr_id: {
                    [Sequelize.Op.eq]: null,
                  },
                },
                {
                  proc_dt: {
                    [Sequelize.Op.lte]: new Date(new Date().setDate(new Date().getDate() - 3)),
                  },
                },
              ],
            },
          },
        );

        return successDispute[0] === 1
          ? emptyTemplateList[syncTemplateIndex]
          : await this.updateEmptyTemplateForUsr(emptyTemplateList, syncTemplateIndex + 1, usrId);
      } catch (error) {
        logger.error(error);
        throw new BadRequestError('Could not get template not annotated!!!');
      }
    }
    return null;
  }

  // Get template was not annotated in the past without annotated information
  // Just get by company and available template in DB (not STATUS.ANNOTATING)
  // Return a template valid (and sync) or none
  static async getTmpltNotAnnotated(groupId, tmpltData, docTypeId, usrId) {
    let availableTemplate = null;
    try {
      await model.DexTmplt.findAll({
        order: [['upd_dt', 'DESC']],
        where: { grp_id: groupId, tp_val: tmpltData.tmp_type, co_cd: tmpltData.co_cd, doc_tp_id: docTypeId },
      }).then(async tmpltNotAnnotatedList => {
        const emptyTemplateList = tmpltNotAnnotatedList.flatMap(template => {
          const coordCal = template.cordi_calc_ctnt ? JSON.parse(template.cordi_calc_ctnt) : {};
          const emptyTemplate =
            coordCal.key_sequence &&
            (coordCal.key_sequence === '[]' ||
              coordCal.key_sequence.includes(AppConstants.TEMPLATE.KEY_SEQ_NOT_ANNOTATED));
          const validTemplate = emptyTemplate && AppConstants.TEMPLATE.STATUS.ANNOTATING !== template.sts_flg;
          return validTemplate ? template : [];
        });
        if (emptyTemplateList.length) {
          availableTemplate = await this.updateEmptyTemplateForUsr(emptyTemplateList, 0, usrId);
        }
      });
    } catch (error) {
      logger.error(error);
      throw new BadRequestError('Could not get template not annotated!!!');
    }
    return availableTemplate;
  }

  static async createNewTemplateWithData(tmpltData, usrId, docTypeId, imgUrl, rootUrl) {
    let tmpltId = '';
    let tmpltType = '';
    const templateData = {
      ...tmpltData,
      doc_tp_id: docTypeId,
      img_url: imgUrl,
      root_url: rootUrl,
    };
    try {
      const dataTmpl = await this.createNewTemplate(templateData, usrId);
      if (dataTmpl) {
        tmpltType = dataTmpl.tp_val;
        tmpltId = dataTmpl.tmplt_id;
      }
    } catch (err) {
      logger.error(err);
      throw err;
    }
    return [tmpltType, tmpltId];
  }

  static async getTmpltAfterGenerateNew(tmpltData, docTypeId, usrId) {
    let tmpltId = '';
    let tmpltType = '';
    try {
      const groupId = tmpltData.grp_id || AppConstants.TEMPLATE.GROUP.DEFAULT;
      const rootUrl = removeIPandPort(tmpltData.root_url);
      const imgUrl = removeIPandPort(tmpltData.img_url);
      const tmpltNotAnnotated = await this.getTmpltNotAnnotated(groupId, tmpltData, docTypeId, usrId);
      if (tmpltNotAnnotated && tmpltNotAnnotated.tmplt_id) {
        tmpltType = tmpltNotAnnotated.tp_val;
        tmpltId = tmpltNotAnnotated.tmplt_id;
        const templateData = { ...tmpltData, doc_tp_id: docTypeId };
        await this.updateTemplateAfterGenerate(tmpltId, templateData, usrId);
      } else {
        [tmpltType, tmpltId] = await this.createNewTemplateWithData(tmpltData, usrId, docTypeId, imgUrl, rootUrl);
      }
      if (!tmpltType || !tmpltId) throw new Error('Not found any mapped template after generating');
      this.dataRes = { tmpltType, tmpltId };
    } catch (error) {
      logger.error(error);
      throw new BadRequestError('Could not get template not annotated!!!');
    }
    return this.dataRes;
  }

  static async submitCoreGenFormat(docId, docTpId, fileUrl, oldTmplId) {
    const reqGenFormatData = {
      doc_id: docId,
      file_url: fileUrl,
      old_tmp_id: oldTmplId,
      doc_tp_id: docTpId,
    };
    const coreMatchingData = await CoreAdapterServices.runGenNewFormat(reqGenFormatData, docTpId).catch(error => {
      throw error;
    });
    return coreMatchingData;
  }

  static async generateNewFormat(docId, docTpId, fileUrl, oldTmplId, usrId) {
    if (!docId || !docTpId || !fileUrl || !oldTmplId) throw new Error('Generate format failed! Wrong params!');
    try {
      const coreSubmitData = await this.submitCoreGenFormat(docId, docTpId, fileUrl, oldTmplId);
      if (coreSubmitData) {
        // Find or create template
        const oldTmpltData = await this.getTemplateById(oldTmplId);
        if (oldTmpltData) {
          const docTypeId = docTpId;
          coreSubmitData.tmp_type = oldTmpltData.tp_val;
          coreSubmitData.grp_id = oldTmpltData.grp_id;
          coreSubmitData.co_cd = oldTmpltData.co_cd;
          this.dataRes = await this.getTmpltAfterGenerateNew(coreSubmitData, docTypeId, usrId);
        }
      }
    } catch (err) {
      logger.error(err);
      throw err;
    }
    return this.dataRes;
  }

  static async getTemplateVersion(templateId) {
    await model.DexTmplt.findOne({ where: { tmplt_id: templateId } })
      .then(result => {
        this.dataRes = result ? result.tmplt_ver_val : '';
      })
      .catch(_error => {
        logger.error(_error);
        throw new BadRequestError({ errorCode: 1113 });
      });
    return this.dataRes;
  }

  static async getAllTemplate(dataSearch) {
    const whereDexDoc = {};
    const lastDate = `${dataSearch.toDate.split('T')[0]} 23:59:59`;
    const whereDexTmplt = { delt_flg: 'N', cre_dt: { [Sequelize.Op.between]: [dataSearch.fromDate, lastDate] } };
    if (dataSearch.coCd !== 'All') {
      whereDexDoc.co_cd = dataSearch.coCd;
    }
    if (dataSearch.docTpId !== 'All') {
      whereDexTmplt.doc_tp_id = dataSearch.docTpId;
    }
    await model.DexTmplt.findAll({
      order: [['upd_dt', 'DESC']],
      include: [
        {
          model: model.DexDoc,
          as: 'dex_tmplt_doc',
          attributes: ['doc_id', 'dex_tmplt_id', 'co_cd', 'loc_id'],
          where: whereDexDoc,
        },
      ],
      where: whereDexTmplt,
    })
      .then(result => {
        this.dataRes = result;
      })
      .catch(_error => {
        logger.error(_error);
        throw new BadRequestError({ errorCode: 1113 });
      });
    return this.dataRes;
  }

  static async deleteTemplate(tmpltId, usrId) {
    const updateData = {
      delt_flg: 'Y',
      upd_usr_id: usrId,
    };
    await model.DexTmplt.update(updateData, {
      where: {
        tmplt_id: tmpltId,
      },
    })
      .then(result => {
        this.dataRes = result;
      })
      .catch(_err => {
        logger.error(_err);
        throw new BadRequestError({ errorCode: 1112 });
      });
    return this.dataRes;
  }
}
