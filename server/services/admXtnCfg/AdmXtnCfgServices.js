import model from '~/shared/models';
import generateNewId from "../utils/generateNewId";

export default class AdmXtnCfgServices {

    constructor() {
        this.dataRes = null;
    };

    static async getChromeXtnCfg(usr_id, loc_cd, doc_tp_id, site_url) {
        try {
            let whereClause = {};
            if (usr_id) {
                whereClause.usr_id = usr_id;
            }
            if (loc_cd) {
                whereClause.loc_cd = loc_cd;
            }
            if (doc_tp_id) {
                whereClause.doc_tp_id = doc_tp_id;
            }
            if (site_url) {
                whereClause.site_url = site_url;
            }
            await model.AdmXtnCfg.findAll({
                attributes: ["xtn_cfg_id", "cfg_val"],
                where: whereClause,
            }).then(result => {
                this.dataRes = result ? result.map(data => data.dataValues) : null;
            });
            return this.dataRes;
        } catch (error) {
            this.dataRes = false;
            return this.dataRes;
        }
    };

    static async updateChromeXtnCfg(xtn_cfg_id, usr_id, cfg_val) {
        try {
            const whereClause = { xtn_cfg_id };  
            if (cfg_val) {
                cfg_val =JSON.stringify(cfg_val)
            }
            await model.AdmXtnCfg.update({cfg_val, upd_usr_id: usr_id ? usr_id : "SYSTEM" },
                { where: whereClause}
            ).then(result => {
                this.dataRes = result ? true : null;
            });
            return this.dataRes;
        } catch (error) {
            this.dataRes = false;
            return this.dataRes;
        }
    };

    static async createChromeXtnCfg(params) {
        try { 
            if (params.cfg_val) {
                params.cfg_val =JSON.stringify(params.cfg_val)
            }  
            const lastAdmXtnCfg = await model.AdmXtnCfg.findAll({
                limit: 1,
                order: [['xtn_cfg_id', 'DESC']],
            });
            const PREFIX_ID_ADM_XTN_CFG = "CHREXT"
            const lastAdmXtnCfgId = lastAdmXtnCfg.length > 0 ? lastAdmXtnCfg[0].xtn_cfg_id : '';
            const newAdmXtnCfgId = generateNewId(lastAdmXtnCfgId, PREFIX_ID_ADM_XTN_CFG);
            await model.AdmXtnCfg.create({
                xtn_cfg_id: newAdmXtnCfgId,
                cfg_val: params.cfg_val ? params.cfg_val : null ,
                site_url: params.site_url ? params.site_url : null,
                usr_id: params.usr_id ? params.usr_id : "SYSTEM",
                loc_cd: params.loc_cd ? params.loc_cd : null,
                cre_usr_id: params.usr_id ? params.usr_id : "SYSTEM",
                upd_usr_id: params.usr_id ? params.usr_id : "SYSTEM",
                doc_tp_id: params.doc_tp_id ? params.doc_tp_id : null,
            }).then(result => {
                this.dataRes = result ? newAdmXtnCfgId : null;
            });
            return this.dataRes;
        } catch (error) {
            this.dataRes = false;
            return this.dataRes;
        }
    };

}
