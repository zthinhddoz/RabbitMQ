import model from '~/shared/models';
import { BadRequestError } from '../utils/errors';
import logger from '~/shared/logger';

export default class AdmDocServices {

    constructor() {
        this.status = 400;
        this.dataRes = null;
    };

    static async getAdmDocs(includeClause, whereClause) {
        await model.AdmDoc.findAll({ include:  includeClause, where: whereClause})
        .then(result => {
            this.dataRes = result ? result : null;
        }).catch(_err => {
            logger.error(_err);
            throw new BadRequestError('Get Doc failed');
        });
        return this.dataRes;
    }

}
