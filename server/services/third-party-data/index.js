import { Router } from "express";
import { customRes } from "../utils/commonFuncs";
import AppConstants from '~/utils/constants';
import model from '~/shared/models';
import generateNewId from "../utils/generateNewId";
import logger from '~/shared/logger';
import ThirdPartyDataServices from './ThirdPartyDataServices';
import * as Diff from 'diff'

const router = Router();

router.get('/get-all', async (req, res, next) => {
    const attributes = ['dat_id', 'dat_cd', 'dat_nm', 'co_cd', 'loc_cd', 'loc_id', 'doc_tp_id','loc_id', 'dat_val', 'delt_flg'];
    const dataRes = await ThirdPartyDataServices.getThirdPartyData(null, attributes, 401).catch(err => next(err));
    customRes(req, res, next, dataRes);
});

router.get('/get-all-dat-cd', async (req, res, next) => {
    const attributes = ['dat_id', 'dat_cd', 'dat_nm', 'co_cd', 'loc_cd', 'loc_id', 'doc_tp_id', 'loc_id', 'delt_flg'];
    const dataRes = await ThirdPartyDataServices.getThirdPartyData(null, attributes, 401).catch(err => next(err));
    customRes(req, res, next, dataRes);
  });

router.post('/add', async (req, res, next) => {
    try {
        let dataRes = {};
        let attrsUpd = {
            dat_cd: req.body.dat_cd,
            dat_nm: req.body.dat_nm,
            co_cd: req.body.co_cd,
            loc_cd: req.body.loc_cd,
            doc_tp_id: req.body.doc_tp_id,
            upd_usr_id: req.body.userId,
            delt_flg: 'N',
        };

        const loc = await model.DexLoc.findOne({ where: {
            co_cd: req.body.co_cd,
            loc_cd: req.body.loc_cd,
            doc_tp_id: req.body.doc_tp_id
        }});
        attrsUpd.loc_id =  loc ? loc.loc_id : null;

        const datCliCode = { dat_cd: req.body.dat_cd };
        const isDatExists = await ThirdPartyDataServices.getThirdPartyData(datCliCode, null, 401).catch(err => next(err));;
        if (isDatExists.length > 0) {
            attrsUpd.dat_val = null;
            dataRes = await ThirdPartyDataServices.updateThirdPartyData(datCliCode, attrsUpd).catch(err => next(err));
        } else {
            const otherClause = {
                limit: 1,
                order: [['dat_id', 'DESC']],
            };
            const datLastest = await ThirdPartyDataServices.getThirdPartyData(null, null, 404, otherClause).catch(err => next(err));
            const idLastest = datLastest.length ? datLastest[0].dat_id : '';
            const idGenNew = generateNewId(idLastest, 'DATCLI');
            let attrsCreate = {
                ...attrsUpd,
                dat_id: idGenNew,
                cre_usr_id: req.body.userId,
            }
            if (req.body?.dat_val) {
              attrsCreate['dat_val'] = req.body?.dat_val;
            }
            dataRes = await ThirdPartyDataServices.createThirdPartyData(attrsCreate).catch(err => next(err));
        }
        customRes(req, res, next, dataRes);
    } catch (err) {
        logger.error(err);
        return res.status(500).json({ errorCode: 108 });
    }
});

router.put('/update', async (req, res, next) => {
    try {
        const whereClause = { dat_id: req.body.dat_id };
        let attrsUpd = {
            dat_nm: req.body.dat_nm,
            co_cd: req.body.co_cd,
            loc_cd: req.body.loc_cd,
            doc_tp_id: req.body.doc_tp_id,
            upd_usr_id: req.body.userId,
            delt_flg: 'N',
        };
        let dataRes = await ThirdPartyDataServices.updateThirdPartyData(whereClause, attrsUpd).catch(err => next(err));
        customRes(req, res, next, dataRes);
    } catch (err) {
        logger.error(err);
        return res.status(500).json({ errorCode: 108 });
    }
});

router.put('/delete', async (req, res, next) => {
    try {
        const whereClause = { dat_id: req.body.dat_id };
        const attrsUpd = {
            delt_flg: 'Y',
            upd_usr_id: req.body.userId,
        };
        let dataRes = await ThirdPartyDataServices.updateThirdPartyData(whereClause, attrsUpd).catch(err => next(err));
        customRes(req, res, next, dataRes);
    } catch (err) {
        logger.error(err);
        return res.status(500).json({ errorCode: 108 });
    }
});

router.put('/import', async (req, res, next) => {
    try {
        const whereClause = { dat_id: req.body.dat_id };

        let attrsUpd = {
            dat_val: JSON.stringify(req.body.dat_val),
            upd_usr_id: req.body.userId,
        };
        let dataRes = await ThirdPartyDataServices.updateThirdPartyData(whereClause, attrsUpd).catch(err => next(err));
        customRes(req, res, next, dataRes);
    } catch (err) {
        logger.error(err);
        return res.status(500).json({ errorCode });
    }
});

router.get('/get-code-by-data', async (req, res, next) => {
    try {
        const upperCaseKeyObject = (obj) => {
            return Object.fromEntries(Object.entries(obj).map(item => [item[0].toUpperCase(), item[1].toString().toUpperCase()]));
        }
        const removeSpaceAndSpecialChars = (obj) => {
            return obj.toString().replace(/[^a-zA-Z0-9 ]/g, '');
        }

        const { dat_cd, res_key, params } = req.query;
        const parseParams = upperCaseKeyObject(JSON.parse(params));
        const numberParams = Object.keys(parseParams).length;
        const attributes = ['dat_id', 'dat_val'];
        const whereClause = { dat_cd: dat_cd, delt_flg: 'N' };
        const result = await ThirdPartyDataServices.getThirdPartyData(whereClause, attributes, 401).then(result => JSON.parse(result[0].dat_val).data).catch(err => next(err));

        const dataRes = [];
        if (Object.keys(parseParams).length > 0) {
            for(let i = 0; i < result.length; i++) {
                const row = upperCaseKeyObject(result[i]);
                let sumPercent = 0;
                let arr = [];

                for (let [key, value] of Object.entries(parseParams)) {
                    if (value === '' || row.hasOwnProperty(key) === false) continue;
                    const paramClear = removeSpaceAndSpecialChars(value.toString());
                    const recordClear = removeSpaceAndSpecialChars(row[key] ? row[key].toString() : '');

                    const diffChars = Diff.diffChars(recordClear, paramClear);

                    let chars = null;
                    for(let i = 0; i < diffChars.length; i++) {
                        const item = diffChars[i];
                        if (!item.hasOwnProperty('added') && !item.hasOwnProperty('removed')) {
                            if (chars) {
                                if (item.count > chars.count) {
                                    chars = item;
                                }
                            } else {
                                chars = item;
                            }
                        }
                    }
                    if (chars) {
                        const percent = (chars.count * 100) / (paramClear.length);
                        if (percent >= AppConstants.DIFF_LIMIT_PERCENT) {
                            sumPercent += percent;
                            arr.push(key)
                        }
                    }
                }
                if(arr.length === numberParams) {
                    dataRes.push({ result: row, percent: sumPercent/ numberParams});
                }
            }
        }
        customRes(req, res, next, dataRes.sort((a, b) => a.percent > b.percent ? -1 : a.percent < b.percent ? 1 : 0));
    } catch (err) {
        logger.error(err);
        return res.status(500).json({ errorCode: 408 });
    }
});

export default router;