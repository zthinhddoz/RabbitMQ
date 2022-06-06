import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import DocumentServices from '../document/DocumentServices';
import DocTmpltServices from '../docTmplt/DocTmpltServices';
import CommonDataServices from '../common-data/CommonDataServices';
import SpecialRuleServices from '../specialRule/SpecialRuleServices';
import LocationServices from '../locations/LocationServices';
import DocDataServices from '../docData/DocDataServices';
import CoreServices from './CoreServices';
import DexGrpServices from '../dexGrp/DexGroupsServices';
import { BadRequestError } from '../utils/errors';
import DynamicTypeService from '../dynamicType/DynamicTypeService';
import logger from '~/shared/logger';
const router = Router();

const baseUrl = `/upload-file/read/`;
const originFolder = 'file';

/**
 * Sample API 
 * TODO: Re-Handle
 * router.get('/:id', verify, async (req, res, next) => {});
 */

 router.get('/template', async (req, res, next) => {
  try {
    const { co_cd, lo_cd, doc_tp_id, tmp_type } = req.query;
    const rawDataRes = await DocTmpltServices.getDocTmpltList(co_cd, lo_cd, doc_tp_id, tmp_type);
    const dataResult = [];
    if (rawDataRes && rawDataRes.length > 0) {
      for (let index in rawDataRes) {
        let item = rawDataRes[index]
        const grp_id = item.grp_id
        const grp_nm = await DexGrpServices.getGrpName(grp_id);
        const rules = item.rule_id_val ? item.rule_id_val.replace(/\s/g, '').split(',') : [];
        item.grp_nm = grp_nm
        dataResult[index] = {
          grp_id: item.grp_id,
          grp_val: item.grp_nm,
          tmp_type: item.tp_val,
          tmp_id: item.tmplt_id,
          coord_value: item.cordi_val_ctnt,
          coord_key: item.cordi_key_ctnt,
          coord_cal: item.cordi_calc_ctnt,
          rules: rules,
          root_url: item.root_url,
          img_url: item.img_url,
        };
      }
    }
    return res.status(200).json({ data: dataResult });
  } catch (error) {
    logger.error(error);
    return next(res.status(500).json({ sts_cd: 500, msg: 'Get Template fail'}));
  }
});


router.get('/template/:id', async (req, res, next) => {
  try {
    const tmplt_id = req.params.id;
    const rawDataRes = await DocTmpltServices.getDocTmpltById(tmplt_id);
    if (rawDataRes && rawDataRes.length) {
      const dataResult = [];
      rawDataRes.map((item, index) => {
        dataResult[index] = {
          grp_id: item.grp_id,
          tmp_type: item.tp_val,
          tmp_id: item.tmplt_id,
          coord_value: item.cordi_val_ctnt,
          coord_key: item.cordi_key_ctnt,
          coord_cal: item.cordi_calc_ctnt,
          rules: item.rule_id_val ? item.rule_id_val.replace(/\s/g, '').split(',') : [],
          root_url: item.root_url,
          img_url: item.img_url,
        };
      })
      if (dataResult && dataResult.length) {
        return res.status(200).json({
          sts_cd: 200,
          msg: 'Get Template successful',
          grp_id: dataResult[0].grp_id,
          tmp_type: dataResult[0].tmp_type,
          tmp_id: dataResult[0].tmp_id,
          coord_value: dataResult[0].coord_value,
          coord_key: dataResult[0].coord_key,
          coord_cal: dataResult[0].coord_cal,
          rules: dataResult[0].rules,
          root_url: dataResult[0].root_url,
          img_url: dataResult[0].img_url,
        });
      }
    }
    return next(res.status(500).json({ sts_cd: 500, msg: 'Get Template fail', data: [] }));
  } catch (error) {
    logger.error(error);
    return next(res.status(500).json({ sts_cd: 500, msg: 'Get Template fail', data: [] }));
  }

});

router.post('/template/:id', async (req, res, next) => {
  const doc_tp_id = req.params.id;
  const params = req.body;
  const rawDataRes = await DocTmpltServices.saveTemplate(doc_tp_id, params);
  if (rawDataRes) {
    return res.status(200).json({ sts_cd: 200, msg: 'Save Template successful' });
  }
  return next(res.status(500).json({ sts_cd: 500, msg: 'Save Template Fail' }));
});

router.get('/doc/:id', async (req, res, next) => {
  const doc_id = req.params.id;
  const rawDataRes = await DocDataServices.getDocDetails(doc_id);
  if (rawDataRes) {
    const fields = [];
    rawDataRes.adm_doc_tp.doc_fields.map(data => {
      fields.push({
        [data.dataValues.doc_fld_id]: {
          field_nm: data.dataValues.fld_nm,
          tmplt_flg: data.dataValues.tmplt_flg,
          attr_ctnt: data.dataValues.attr_ctnt,
          extr_type: data.dataValues.extr_tp_cd,
        }
      })
    })
    rawDataRes.doc_fields = fields;

    // TODO: Recheck and handle logic here, dex_tmplt is null => make API failed
    const groupVal = rawDataRes.dex_tmplt ? 
      rawDataRes.dex_tmplt.dex_grp ? rawDataRes.dex_tmplt.dex_grp.grp_nm : '' : '';

    return res.status(200).json({
      doc_tp_id: rawDataRes.doc_tp_id,
      doc_nm: rawDataRes.doc_nm,
      doc_cd: rawDataRes.adm_doc_tp.doc_cd,
      grp_tp: rawDataRes.adm_doc_tp.mtch_tp === "T" ? "TEXT" : "KEYWORD",
      grp_val: groupVal,
      tmplt_ftr_id: rawDataRes.adm_doc_tp.tmplt_ftr_id,
      fields: rawDataRes.doc_fields,
    });

  }
  return next(res.status(500).json({ sts_cd: 500, msg: 'Get Document fail', data: [] }));
});

router.get('/doc-full/:id', async (req, res, next) => {
  const doc_tp_id = req.params.id;
  const rawDataRes = await DocumentServices.getDocFullById(doc_tp_id);
  if (rawDataRes && rawDataRes.length) {
    rawDataRes.map((item) => {
      const fields = [];
      item.doc_fields.map(data => {
        fields.push({
          [data.dataValues.doc_fld_id]: {
            field_nm: data.dataValues.field_nm,
            order_no: data.dataValues.order_no,
            field_grp_id: data.dataValues.field_grp_id || '',
            field_grp_nm: data.dataValues.adm_fld_grp ? data.dataValues.adm_fld_grp.dataValues.field_grp_nm : '',
            display_tp: data.dataValues.display_tp
          }
        })
      })
      item.doc_fields = fields;
    })
    return res.status(200).json({
      doc_tp_id: rawDataRes[0].doc_tp_id,
      doc_nm: rawDataRes[0].doc_nm,
      tmplt_ftr_id: rawDataRes[0].tmplt_ftr_id,
      fields: rawDataRes[0].doc_fields,
    });
  }
  return next(res.status(500).json({ status: 500, errorCode: 102 }));
});

router.get('/matching/cfg', async (req, res, next) => {
  const rawDataRes = await SpecialRuleServices.getMatchingCfg();
  if (rawDataRes && rawDataRes.length) {
    const rawData = []
    rawDataRes.map((item) => {
      const obj = {};
      obj.id = item.rule_id;
      obj.img_url = baseUrl + item.img_url;
      obj.keyword = item.keyword ? item.keyword : '';
      rawData.push(obj)
    })
    return res.status(200).json({
      sts_cd: 200,
      msg: 'Get Matching cfg successful',
      data: rawData
    });
  }
  return next(res.status(500).json({ sts_cd: 500, msg: 'Get Matching cfg fail', data: [] }));
});

router.get('/matching/type', async (req, res, next) => {
  const whereClause = { com_dat_cd: "MATCHING_TYPE" }
  const rawDataRes = await CommonDataServices.getCommonData(whereClause);
  // const rawDataRes = await CommonDataServices.getMatchingType();
  if (rawDataRes) {
    rawDataRes.com_dat_val = JSON.parse(rawDataRes[0].com_dat_val)
    let dataRes = rawDataRes.com_dat_val.data.filter((item) => item.deleted === "No");

    return res.status(200).json({
      sts_cd: 200,
      msg: 'Get Matching type successful',
      data: dataRes
    });
  }
  return next(res.status(500).json({ sts_cd: 500, msg: 'Get Matching type fail', data: [] }));
});

router.post('/upload', (req, res) => {
  const upload = multer({ dest: `${originFolder}/temp`}).single('file');
  upload(req, res, async function(err) {
    let {doc_id, file_ext } = req.body;
    // get url folder
    try {
      if(!doc_id || !file_ext){
        throw new BadRequestError('doc_id, file_ext is required');
      }
      const fileInfo = await DocDataServices.getUrlFolderById(doc_id);
      if(!fileInfo){
        throw new BadRequestError('Failed to get file info');
      }
      if (req.isNotValidFile || !req.file || err) {
        throw new BadRequestError('File is invalid');
      }

      let fileName = CoreServices.formatFileName(fileInfo[0]);
      let fullName = `${fileName}.${ file_ext}`;
      const folLocUrl = fileInfo[1];
      
      if (!fs.existsSync(`${originFolder}${folLocUrl}/Output/`)) {
        fs.mkdirSync(`${originFolder}${folLocUrl}/Output/`,  { recursive: true });
      }
      if (fs.existsSync(`${originFolder}${folLocUrl}/Output/${fullName}`)) {
        fullName = `${fileName}-${Math.floor(Date.now() / 1000)}.${ file_ext}`;
      }
      const fileUrl = `${process.env.REACT_APP_DOC_LOC}${folLocUrl}/Output/${fullName}`; 

      // Move file in temp folder to company folder
      let nameTemp = "";
      fs.readdirSync(`${originFolder}/temp`).forEach(file => {
        nameTemp = file;
      });

      fs.renameSync(`${originFolder}/temp/${nameTemp}`, `${originFolder}${folLocUrl}/Output/${fullName}`);
      //Remove folder temp
      fs.rmdirSync(`${originFolder}/temp/`, { recursive: true });

      return res.status(200).json({ sts_cd:200, msg: 'Insert document successful', file_url: fileUrl});

    } catch(error) {
      logger.error(error);
      //Remove folder temp
      fs.rmdirSync(`${originFolder}/temp/`, { recursive: true });
      return res.status(500).json({ sts_cd:500, msg: "Upload failed", error: error });
    }
  })
});


router.get('/upload', async (req, res) => {
  try {
    let {doc_id, file_ext } = req.body;
    if(!doc_id || !file_ext){
      throw new BadRequestError('doc_id, file_ext is required');
    }

    const fileInfo = await DocDataServices.getUrlFolderById(doc_id);
    if(!fileInfo){
      throw new BadRequestError('Failed to get file info');
    }  

    const fileUrlFolder = `${originFolder}${fileInfo[1]}/Output/`;
    const files = [];
    const fileUrlHost = [];
    if (!fs.existsSync(`${fileUrlFolder}`)) {
      throw new BadRequestError('No such file or directory');
    }

    fs.readdirSync(`${fileUrlFolder}`).forEach(file => {
      files.push(file);
    });

    const fileName = CoreServices.formatFileName(fileInfo[0]);
    for (const file of files) {
      if(file.includes(fileName) && file.split('.').pop() == file_ext){
        fileUrlHost.push(`${process.env.REACT_APP_DOC_LOC}${fileInfo[1]}/Output/${file}`)
      }
    }

    return res.status(200).json({ sts_cd:200, msg: 'Get document successful', file_url: fileUrlHost});

  } catch (error) {
    logger.error(error);
    return res.status(500).json({sts_cd:500, msg: "Get document failed", error: error });
  }

});

/**
 * POST request to check dynamic type
 * Just get input data and res data output with the same format of Core
 *
 */
async function getListDynamic(listKey, dynTpVal) {
  const result = {};
  for (const ordItem of listKey) {
    result[ordItem] = await DynamicTypeService.getDynamicTypeById(dynTpVal[ordItem].dyn_id);
  }
  return result;
}

export function combineComDatVal(possibleParams, possibleParamsKey) {
  const combinationsArray = [];
  for (let index = 0; index < possibleParams[possibleParamsKey[0]].length; index++) {
    combinationsArray.push([possibleParams[possibleParamsKey[0]][index]]);
  }
  if (possibleParamsKey.length > 1) {
    for (let index = 1; index < possibleParamsKey.length; index++) {
      combinationsArray.forEach(item => {
        possibleParams[possibleParamsKey[index]].forEach(nextItem => {
          const cloneItem = [...item];
          cloneItem.push(nextItem);
          combinationsArray.push(cloneItem);
        });
      });
    }
  }
  return combinationsArray.filter(item => item.length === possibleParamsKey.length);
}

async function checkRegOfEachDynType(listDynamicItem, dynType, txtItem, listCommonData) {
  try {
    const txtData = txtItem.text.toUpperCase();
    const listConfdt = txtItem.confdt;
    const srcVal = JSON.parse(dynType.src_val);
    let found = false;
    if (srcVal.length > 0) {
      const possibleParams = {};
      for (const index in srcVal) {
        const variable = { regExp: srcVal[index].regExp, colNm: srcVal[index].colNm };
        possibleParams[variable.regExp] = [];
        const commonData = listCommonData.find(element => element.com_dat_id === srcVal[index].source.com_dat_id);
        const comDatVal = JSON.parse(commonData.com_dat_val);
        comDatVal.data.forEach(rowData => {
          if (rowData.deleted === 'No') {
            possibleParams[variable.regExp].push(rowData[variable.colNm]);
          }
        });
      }
      const possibleParamsKey = Object.keys(possibleParams);
      const combinationsArray = combineComDatVal(possibleParams, possibleParamsKey);
      for (const val of combinationsArray) {
        let regExprVal = dynType.reg_expr_val;
        for (let index = 0; index < possibleParamsKey.length; index++) {
          const searchRegExp = new RegExp(`{{${possibleParamsKey[index]}}}`, 'g');
          regExprVal = regExprVal.replace(searchRegExp, `${val[index]}`);
        }
        found = txtData.match(regExprVal);
        if (found) return found;
      }
    } else {
      found = txtData.match(dynType.reg_expr_val);
    }
    return found;
  } catch (error) {
    throw new BadRequestError(error);
  }
}

function getDefaultItem() {
  const itemRes = {};
  itemRes.is_dync = false;
  itemRes.type = null;
  itemRes.allow_autogen = false;
  return itemRes;
}

router.post('/template/type/dynamic', async (req, res) => {
  try {
    const { doc_tp_id, txt_pattern } = req.body;
    if (!doc_tp_id || !txt_pattern) {
      throw new BadRequestError('doc_tp_id and txt_pattern is required');
    }
    // Get dyn_id by doc_tp_id
    const documentData = await DocumentServices.findDocTypeById(doc_tp_id);
    const result = [];
    if (documentData && documentData.dyn_tp_val) {
      if (txt_pattern && txt_pattern.length > 0) {
        const dynTpVal = JSON.parse(documentData.dyn_tp_val);
        let listKey = null;
        listKey = Object.keys(dynTpVal);
        listKey = listKey.sort();
        let listDynamicItem = await getListDynamic(listKey, dynTpVal);
        const whereClauseCommonData = { delt_flg: 'N' };
        const listCommonData = await CommonDataServices.getCommonData(whereClauseCommonData, null);
        for (const txtItem of txt_pattern) {
          let itemRes = {};
          let checkVal = false;
          for (const ordItem of listKey) {
            const dynamicItem = listDynamicItem[ordItem];
            if (dynamicItem) {
              const found = await checkRegOfEachDynType(listDynamicItem[ordItem], dynamicItem, txtItem, listCommonData);
              if (found) {
                itemRes.is_dync = true;
                itemRes.type = dynTpVal[ordItem].dyn_id;
                itemRes.allow_autogen = dynTpVal[ordItem].allow_autogen;
                result.push(itemRes);
                checkVal = true;
                break;
              }
            }
          }
          if (!checkVal) {
            itemRes = getDefaultItem();
            result.push(itemRes);
          }
        }
      }
    } else if (txt_pattern && txt_pattern.length > 0) {
      for (const txtItem of txt_pattern) {
        const itemRes = getDefaultItem();
        result.push(itemRes);
      }
    }
    return res.status(200).json({ msg: 'Sucess', data: result });
  } catch (error) {
    logger.error(error);
    return res.status(500).json({ msg: 'Failed', error });
  }
});

/**
 * Used to save transaction to OCR Table
 * Input req body:
 * {
    "ip_addr": string,
    "engine": string
    "file_url": string
    "doc_id": string or null
    "tmp_id": string or null
    "duration": float
    "status": string
    "env": string
}
 */
router.post('/ocr/transaction', async (req, res) => {
  try {
    const { ip_addr, engine, file_url, doc_id, tmp_id, duration, status, env } = req.body;
    if (ip_addr && engine && file_url && duration && status && env) {
      // Save to DB
      await CoreServices.saveOcrTrans(ip_addr, engine, file_url, doc_id, tmp_id, duration, status, env);
      return res.status(200).json({ msg: 'Insert succeeded !', sts_cd: 200 });
    }
    return res.status(200).json({ msg: 'Invalid params !', sts_cd: 500 });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: 'Save OCR transaction failed !', sts_cd: 500 });
  }
});

export default router;
