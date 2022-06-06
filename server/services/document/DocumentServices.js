import model from '~/shared/models';
import generateWhereClauses from '~/utils/generateWhereClauses';
import { BadRequestError } from '../utils/errors';
import logger from '~/shared/logger';
export default class DocumentServices {

    constructor() {
        this.dataRes = null;
    };

    static async getDocList(whereClausesObj, attrArr) {
        try {
            let whereClause = {};
            whereClause = generateWhereClauses(whereClausesObj);
            await model.AdmCoDoc.findAll({
                where: whereClause,
                attributes: attrArr ? attrArr : '',
                include:
                    [{
                        model: model.AdmDoc ,
                        as: "adm_documents",
                        where: { delt_flg: 'N'},
                        required: false,
                    }
                    ,{
                        model: model.DexLoc,
                        as: "locations",
                        required: false,
                    }
                ],
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

    static async getDocFullById(doc_tp_id) {
        try {
            let whereClause = { doc_tp_id, delt_flg: 'N' }
            await model.AdmDoc.findAll({
                attributes: ["doc_tp_id", "doc_nm",],
                where: whereClause,
                include:
                    [{
                        model: model.AdmDocFld,
                        as: "doc_fields",
                        attributes: ["doc_fld_id", ["fld_nm", "field_nm"], ["ord_no", "order_no"], ["fld_grp_id", "field_grp_id"], ["dp_tp_cd", "display_tp"], "delt_flg"],
                        where: { delt_flg: 'N' },
                    }],
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
    static async findDocTypeById(docTpId) {
        try {
            await model.AdmDoc.findOne({
                where: {doc_tp_id: docTpId, delt_flg: 'N'},
            }).then(result => {
                this.dataRes = result ? result.dataValues : null;
            });
            return this.dataRes;
        } catch (error) {
            logger.error(error);
            throw new BadRequestError('Get document by doc_tp_id failed');
        }
    };

}
