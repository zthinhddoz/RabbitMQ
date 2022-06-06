import model from '~/shared/models';
import { BadRequestError } from '../utils/errors';
import logger from '~/shared/logger';

export default class DexGrpServices {

    constructor() {
        this.dataRes = null;
    };

    static async getGrpName(grp_id) {
        await model.DexGrp.findOne({
            where: { grp_id: grp_id },
            attributes: ['grp_nm']
        }).then(result => {
            this.dataRes = result ? result.dataValues.grp_nm : null;
        }).catch(_error => {
            logger.error(_error);
            throw new BadRequestError({ errorCode: 1111 });
        });
        return this.dataRes;
    };

    static async createDexGroup(groupVal) {
        try {
            const latestGroup = await model.DexGrp.findOne({
                limit: 1,
                order: [['cre_dt', 'DESC']],
            });
            const lastestId = latestGroup? parseInt(latestGroup.dataValues.grp_id) + 1 : 1;
            await model.DexGrp.create({
                grp_id: lastestId,
                grp_nm: groupVal,
                cre_usr_id: 'admin',
                upd_usr_id: 'admin'
            }).then(result => {
                this.dataRes = result ? result : null;
            })
        } catch(error) {
            logger.error(error);
            throw new BadRequestError({ errorCode: 1112 });
        };
        return this.dataRes;
    }

    static async getAllDexGroup() {
        try {
            const allGroup = await model.DexGrp.findAll({order: [['cre_dt', 'DESC']]});
            this.dataRes = allGroup ? allGroup.map(grp => grp.dataValues) : null;
        } catch(error) {
            logger.error(error);
            throw new BadRequestError({ errorCode: 1112 });
        };
        return this.dataRes;
    }
}