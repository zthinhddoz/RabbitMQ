import model from '~/shared/models';
import { BadRequestError } from '../utils/errors';
import AppConstants from '~/utils/constants';
import logger from '~/shared/logger';

export default class MigrationServices {
  constructor() {
    this.dataRes = null;
  }

  static async updateValCoord(templateId, valCoordObj) {
    await model.DexTmplt.update({ cordi_val_ctnt: JSON.stringify(valCoordObj) }, { where: { tmplt_id: templateId } });
    return true;
  }

  static async addExtrTypeToTmplt() {
    try {
      const allTemplates = await model.DexTmplt.findAll();
      const promiseUpdateTask = [];
      let count = 0;
      allTemplates.forEach(template => {
        if (template && template.cordi_val_ctnt) {
          const coordValArray = JSON.parse(template.cordi_val_ctnt);
          let updateFlag = false;
          const templateId = template.tmplt_id;
          if (coordValArray.length > 0) {
            coordValArray.forEach(valBox => {
              if (!valBox.extr_type) {
                valBox.extr_type = AppConstants.EXTRACTION_TYPE.EMPTY;
                updateFlag = true;
              }
            });
          }
          if (updateFlag) {
            promiseUpdateTask.push(this.updateValCoord(templateId, coordValArray));
            count++;
          }
        }
      });
      await Promise.all(promiseUpdateTask).catch(err => {
        throw err;
      });
      return count;
    } catch (error) {
      logger.error(error);
      throw new BadRequestError('Could not migrate template!!!');
    }
  }
}
