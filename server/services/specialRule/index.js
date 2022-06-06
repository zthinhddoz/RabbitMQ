import { Router } from 'express';
const { Op } = require("sequelize");
import model from '~/shared/models';
import generateNewId from '../utils/generateNewId'
const router = Router();
import multer from 'multer';
import fs from 'fs';
import SpecialRuleServices from './SpecialRuleServices';
import { customRes } from '~/utils/commonFuncs';
import logger from '~/shared/logger';
import keycloak from '../shared/middleWare/checkSSO';

const originFolder = 'file';
var sequelize = require('sequelize');

router.post('/search', keycloak.protect(), async (req, res) => {
    try {
        let ruleName = req.body.form.ruleName ? req.body.form.ruleName : '';
        ruleName = ruleName.toLowerCase();
        let ruleType = req.body.form.ruleType ? req.body.form.ruleType : '';
        let whereClause = {
            [Op.and]: [{
                rule_nm: sequelize.where(sequelize.fn('LOWER', sequelize.col('rule_nm')), 'LIKE', '%' + ruleName + '%'),
                rule_tp_val: {
                    [Op.like]: ruleType.toLowerCase() !== 'all' ? '%' + ruleType + '%' : '%'
                },
                delt_flg: 'N',
            }]
        };
        const ruleResult = await model.DexRule.findAll({ where: whereClause, order: [['rule_id', 'ASC']] });
        const msg = (ruleResult !== null) && (ruleResult.length > 0) ? 'Get Successfully.' : 'No Match Have Found';
        res.status(200).json({ result: ruleResult, message: msg });
    } catch (error) {     
        logger.error(error);
        res.status(500).json({ errorCode: 501 });
    }
});

router.put('/delete', keycloak.protect(), async (req, res) => {
    try {
        const ruleResult = await model.DexRule.update({ delt_flg: "Y" }, { where: { rule_id: req.body.rule_id } });
        const msg = ruleResult === null ? "Error" : 'Delete Successfully.';
        res.status(200).json({ result: ruleResult, message: msg });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ errorCode: 502 });
    }
});

router.post('/update', keycloak.protect(), async (req, res) => {
    const upload = multer({ dest: `${originFolder}/temp` }).single('my_file');
    upload(req, res, async function(err) {
        const docInfo = req.body;
        if (!fs.existsSync(`${originFolder}/images/`)) {
            fs.mkdirSync(`${originFolder}/images/`, { recursive: true });
        }
        if (req.file) {
              // Move file in temp folder to company folder
            fs.readdirSync(`${originFolder}/temp`).forEach(file => {
                fs.renameSync(`${originFolder}/temp/${file}`, `${originFolder}/images/${docInfo.img_nm}`);
            });
            // remove folder files temp
            fs.rmdirSync(`${originFolder}/temp/`, { recursive: true });
        }
        try {
            let rule_id = docInfo.rule_id ? docInfo.rule_id : '';
            const imgUrl = `${process.env.REACT_APP_DOC_LOC}/images/${docInfo.img_nm}`; 
            await model.DexRule.update({
                "rule_nm": docInfo.rule_nm ? docInfo.rule_nm : '',
                "rule_tp_val": docInfo.rule_tp_val ? docInfo.rule_tp_val : '',
                "rule_desc": docInfo.rule_desc ? docInfo.rule_desc : '',
                "img_url": docInfo.img_nm ? imgUrl : docInfo.img_url,
                "upd_usr_id": docInfo.upd_usr_id ? docInfo.upd_usr_id : '',
                "doc_tp_ctnt": docInfo.doc_tp_ctnt ? docInfo.doc_tp_ctnt : '',
            }, {
                where: {
                        rule_id: rule_id,
                }
            })
            .catch(err => {
                logger.error(err);
                res.status(500).json({ message: 'Update failed' });
            });
            res.status(200).json({ message: 'Update successfully' });
        } catch (error) {
            logger.error(error);
            res.status(500).json({ errorCode: 503 });
        }
  });
});

router.post('/add', keycloak.protect(), async (req, res) => {
    const upload = multer({ dest: `${originFolder}/temp` }).single('my_file');
    upload(req, res, async function(err) {
        const docInfo = req.body;
        if (!fs.existsSync(`${originFolder}/images/`)) {
            fs.mkdirSync(`${originFolder}/images/`, { recursive: true });
        }
        if (req.file) {
              // Move file in temp folder to company folder
            fs.readdirSync(`${originFolder}/temp`).forEach(file => {
                fs.renameSync(`${originFolder}/temp/${file}`, `${originFolder}/images/${docInfo.img_nm}`);
            });
            // remove folder files temp
            fs.rmdirSync(`${originFolder}/temp/`, { recursive: true });
        }
        try {
            await model.DexRule.findAll({
                limit: 1,
                order: [['cre_dt', 'DESC']]
            }).then(function (lasted) {
                const prefix = "SR";
                const lastId = lasted.length > 0 ? lasted[0].rule_id : '';
                const rule_id = generateNewId(lastId, prefix);
                const imgUrl = `${process.env.REACT_APP_DOC_LOC}/images/${docInfo.img_nm}`; 
                model.DexRule.create({
                    "rule_id": rule_id,
                    "rule_nm": docInfo.rule_nm ? docInfo.rule_nm : '',
                    "rule_tp_val": docInfo.rule_tp_val ? docInfo.rule_tp_val : '',
                    "rule_desc": docInfo.rule_desc ? docInfo.rule_desc : '',
                    "img_url": docInfo.img_nm ? imgUrl : '',
                    "cre_usr_id": docInfo.cre_usr_id ? docInfo.cre_usr_id : '',
                    "upd_usr_id": docInfo.upd_usr_id ? docInfo.upd_usr_id : '',
                    "doc_tp_ctnt": docInfo.doc_tp_ctnt ? docInfo.doc_tp_ctnt : '',
                }).then(result => {
                    if (result == null) {
                        res.status(500).json({ errorCode: 504 });
                    } else {
                        res.status(200).json({ result: result, message: 'Create successfully' });
                    }
                }
                )
            })
        } catch (error) {
            logger.error(error);
            res.status(500).json({ errorCode: 503 });
        }
  });
});

router.get('/get/:ruleId', keycloak.protect(), async (req, res, next) => {
    const dataRes = await SpecialRuleServices.getSpecialRule(req.params.ruleId).catch(err => next(err));
    customRes(req, res, next, dataRes);
});

router.get('/get-rule-by-template-id', keycloak.protect(), async (req, res, next) => {
    const { templateId, docTypeId } = req.query;
    const dataRes = await SpecialRuleServices.getSpecialRuleOfTemplateId(templateId, docTypeId).catch(err => next(err));
    customRes(req, res, next, dataRes);
});

router.get('/get-all-rules', keycloak.protect(), async (req, res, next) => {
    const dataRes = await SpecialRuleServices.getAllSpecialRule().catch(err => next(err));
    customRes(req, res, next, dataRes);
});

export default router;