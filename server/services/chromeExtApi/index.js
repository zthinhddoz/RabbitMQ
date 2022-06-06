import { Router } from 'express';
import AdmXtnCfgServices from '../admXtnCfg/AdmXtnCfgServices';
import DocumentServices from '../document/DocumentServices';

const router = Router();
const verify = require('../shared/middleWare/verifyToken');


/**
 * Sample API 
 * TODO: Re-Handle
 * router.get('/:id', verify, async (req, res, next) => {});
 */

router.get('/doc', verify, async (req, res, next) => {
    const params = req.query;
    const attributes = ["doc_tp_id", "loc_id"];
    const rawDataRes = await DocumentServices.getDocList(params, attributes);
    if (rawDataRes && rawDataRes.length) {
        let data = [];
        let listLocId = [];
        rawDataRes.map(item =>{
            if (listLocId.includes(item.loc_id)) {
                data[listLocId.indexOf(item.loc_id)].list_docs.push({
                    doc_tp_id: item.adm_documents.doc_tp_id,
                    doc_nm: item.adm_documents.doc_nm,
                })
            } else {
                listLocId.push(item.loc_id)
                data.push({
                    loc_id: item.loc_id, 
                    loc_nm: item.locations.loc_nm,
                    list_docs: [{
                        doc_tp_id: item.adm_documents.doc_tp_id,
                        doc_nm: item.adm_documents.doc_nm,
                    }]
                })
            }
        })
        return res.status(200).json({sts_cd: 200, msg: 'Get Document successful', data});
    }
    return next(res.status(500).json({sts_cd: 500, msg: 'Get Document fail', data: []}));
});

router.get('/cfg', verify, async (req, res, next) => {
    const { usr_id, loc_cd, doc_tp_id, site_url} = req.query;
    const rawDataRes = await AdmXtnCfgServices.getChromeXtnCfg(usr_id, loc_cd, doc_tp_id, site_url);
    if (rawDataRes && rawDataRes.length) {
        return res.status(200).json({sts_cd: 200, msg: 'Get config successful', data: rawDataRes});
    }
    return next(res.status(500).json({sts_cd: 500, msg: 'Get config fail', data: []}));
});

router.put('/cfg/:id', verify, async (req, res, next) => {
  const xtn_cfg_id = req.params.id;
  const { usr_id, cfg_val } = req.body;
  const rawDataRes = await AdmXtnCfgServices.updateChromeXtnCfg(xtn_cfg_id, usr_id, cfg_val);
  if (rawDataRes) {
      return res.status(200).json({sts_cd: 200, msg: 'Save chrome configs successful', xtn_cfg_id});
  }
  return next(res.status(500).json({ sts_cd: 500, msg: 'Save chrome configs fail'}));
});

router.post('/cfg', verify, async (req, res, next) => {
  const params = req.body;
  const rawDataRes = await AdmXtnCfgServices.createChromeXtnCfg(params);
  if (rawDataRes) {
      return res.status(200).json({sts_cd: 200, msg: 'Create chrome configs successful', xtn_cfg_id :rawDataRes});
  }
  return next(res.status(500).json({ sts_cd: 500, msg: 'Create chrome configs fail'},));
});


export default router;
