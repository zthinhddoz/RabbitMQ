import model from '~/shared/models';
const axios = require('axios');

// import model from '~/shared/models';

export default class BatchJobServices {
  constructor() {
    this.status = 400;
    this.dataRes = null;
  }

  static async updateFlagBatchJob(data) {
    const { loc_id, flag_val, method_update } = data;
    try {
      const updateVal = flag_val=== 'Y' || flag_val ==='N' ? flag_val : 'N';
      const updataFlag = model.DexUpldMzd.update(
        { run_bg_flg: updateVal },
        {
          where: {
            loc_id,
            usd_mzd_cd: method_update,
          },
        },
      ).catch(error => {
        logger.error(error);
        throw new BadRequestError({ errorCode: 205 });
      });
      return updataFlag;
    } catch (error) {
      logger.error(error);
      throw new BadRequestError({ errorCode: 205 });
    }
  }
}
