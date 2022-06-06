import model from '~/shared/models';
import { BadRequestError } from '../utils/errors';
import { getCurrentTimeString } from '../utils/commonFuncs';
import logger from '~/shared/logger';

export const ANNOTATE_STATUS_NONE = '0';
export const ANNOTATE_STATUS_PROCESSING = '1';
export const ANNOTATE_STATUS_NEW = '2';
export const ANNOTATE_STATUS_ANNOTATED = '3';


const { Op } = require("sequelize");

export default class DocTmpltServices {

    constructor() {
        this.status = 400;
        this.dataRes = null;
    };

    static async getDocTmpltList(co_cd, loc_cd, doc_tp_id, tmp_type) {
        try {
            let whereClause = {};
            if (co_cd) {
                whereClause.co_cd = co_cd;
            }
            if (doc_tp_id) {
                whereClause.doc_tp_id = doc_tp_id;
            }
            let dexTmpltId = [];
            await model.DexDoc.findAll({
                where: whereClause,
                attributes: [["dex_tmplt_id", "tmplt_id"]],
                group: ['dex_tmplt_id'],
            }).then(result => {
                dexTmpltId = result ? result.map(data => data.dataValues) : null;
            })
            let whereClauseResult = { [Op.or]: dexTmpltId, delt_flg: 'N' };
            if (tmp_type) {
                whereClauseResult.tp_val = tmp_type;
            }
            await model.DexTmplt.findAll({
                include:
                    [{
                        model: model.DexTmpltRule,
                        as: "dex_tmplt_rule",
                        attributes: [["rule_id", "id"]]
                    }],
                where: whereClauseResult
            }).then(result => {
                this.dataRes = result ? result.map(data => data.dataValues) : null;
            });
            return this.dataRes;
        } catch (error) {
            logger.error(error);
            this.dataRes = false;
            return this.dataRes;
        }
    };

    static async getDocTmpltById(tmplt_id) {
        try {
            const whereClause = { tmplt_id }
            await model.DexTmplt.findAll({
                include:
                    [{
                        model: model.DexTmpltRule,
                        as: "dex_tmplt_rule",
                        attributes: [["rule_id", "id"]]
                    }],
                where: whereClause
            }).then(result => {
                this.dataRes = result ? result.map(data => data.dataValues) : null;
            });
            return this.dataRes;
        } catch (error) {
            logger.error(error);
            this.dataRes = false;
            return this.dataRes;
        }
    };

    static async saveTemplate(tmplt_id, params) {
        console.log(params)
        const whereClause = { tmplt_id }
        let queryClause = {
            grp_id: params.grp_id,
            tmplt_nm: params.name,
            tp_val: params.type,
            cordi_calc_ctnt: params.coord_cal,
            cordi_val_ctnt: params.coord_value,
            cordi_key_ctnt: params.coord_key,
            cre_usr_id: 'SYSTEM',
            upd_usr_id: 'SYSTEM',
            root_url: params.root_url,
            img_url: params.img_url,
            tmplt_ver_val: getCurrentTimeString(),
        }
        let rules = JSON.parse(params.rules);
        let queryParams = [];
        rules.map(rule => {
            queryParams.push({
                tmplt_id,
                rule_id: rule,
                cre_usr_id: 'SYSTEM',
                upd_usr_id: 'SYSTEM',
            })
        })
        try {
            await model.DexTmplt.findOne({
                where: whereClause
            }).then(async result => {
                if (!result) {
                    queryClause.tmplt_id = tmplt_id;
                    await model.DexTmplt.create(
                        queryClause
                    ).then(resultCreate => {
                        if (!resultCreate) {
                            this.dataRes = false;
                            return this.dataRes;
                        }
                    });
                } else {
                    await model.DexTmplt.update(
                        queryClause
                        , { where: whereClause }).then(resultUpdate => {
                            if (!resultUpdate) {
                                this.dataRes = false;
                                return this.dataRes;
                            }
                        });
                    await model.DexTmpltRule.destroy({
                        where: whereClause
                    }).then(resultDestroy => {
                        if (!resultDestroy) {
                            this.dataRes = false;
                            return this.dataRes;
                        }
                    })
                }
            })

            await model.DexTmpltRule.bulkCreate(queryParams)
                .then(resultBulkCreate => {
                    if (!resultBulkCreate) {
                        this.dataRes = false;
                        return this.dataRes;
                    }
                })
            this.dataRes = true;
            return this.dataRes;
        }
        catch (error) {
            logger.error(error);
            this.dataRes = false;
            return this.dataRes;
        }
    };

    /**
     * This func is used to get current status of template
     * @param {*} tmpltType 
     * @param {*} tmpltId 
     * @returns 
     */
    static async getStatus(tmpltType, tmpltId) {
        await model.DexTmplt.findOne({
            where: { tp_val: tmpltType, tmplt_id: tmpltId },
            attributes: [['tmplt_id', 'id'], ['sts_flg', 'status'], 'proc_usr_id', 'proc_dt'],
        })
            .then(result => {
                this.dataRes = result ? result.dataValues : null;
            }).catch(err => {
                logger.error(err);
                throw BadRequestError("Getting Status failed!");
            })
        return this.dataRes;
    };

    /**
     * This func is used to update status fpr template
     * TODO: Check the status var, why status include id and type???
     * @param {*} status 
     * @returns 
     */
    static async updateStatus(status) {
        await model.DexTmplt.findOne({
            where: { tmplt_id: status.id, tp_val: status.type },
            attributes: ['tmplt_id', 'sts_flg',],
        })
            .then(async result => {
                if (result) {
                    const data = result.dataValues;
                    const updateTmplt = { tmplt_id: status.id, tp_val: status.type, sts_flg: status.status };
                    updateTmplt.proc_usr_id = status && status.status === ANNOTATE_STATUS_PROCESSING ? (status.userId ? status.userId : 'admin') : null;
                    updateTmplt.proc_dt = status.status && status.status === ANNOTATE_STATUS_PROCESSING ? Date.parse(new Date()) : null;
                    await model.DexTmplt.update(
                        updateTmplt,
                        { where: { tmplt_id: status.id, tp_val: status.type } }
                    ).then(resultUpdate => {
                        this.dataRes = resultUpdate ? true : false;
                    })
                }
            }).catch(err => {
                logger.error(err);
                throw BadRequestError("Template not found");
            })
        return this.dataRes;
    };
}
