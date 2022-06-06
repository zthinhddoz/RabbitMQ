/* eslint-disable no-unused-expressions */
/* eslint-disable object-curly-newline */
/* eslint-disable function-paren-newline */
/* eslint-disable implicit-arrow-linebreak */
/* eslint-disable no-nested-ternary */
/* eslint-disable no-restricted-globals */
/* eslint-disable arrow-parens */
/* eslint-disable import/no-unresolved */
/* eslint-disable indent */
/* eslint-disable camelcase */
import AppConstants from '~/utils/constants';
import model from '~/shared/models';
import { BadRequestError } from '../utils/errors';
import logger from '~/shared/logger';
const Sequelize = require('sequelize');
export default class DashboardServices {
  constructor() {
    this.dataRes = null;
  }

  static async getAllTemplates(param) {
    const CoCdwc = param.co_cd
      ? param.co_cd
      : {
          [Sequelize.Op.not]: null,
        };
    await model.DexTmplt.count({
      distinct: true,
      col: 'tmplt_id',
      include: [
        {
          model: model.DexDoc,
          as: 'dex_tmplt_doc',
          where: {
            co_cd: CoCdwc,
          },
        },
      ],
      where: {
        delt_flg: 'N',
      },
    })
      .then(result => {
        this.dataRes = result || '0';
      })
      .catch(_error => {
        logger.error(_error);
        throw new BadRequestError({ errorCode: 3000 });
      });
    return this.dataRes;
  }

  static async getAllLocs(param) {
    const CoCdwc = param.co_cd
      ? param.co_cd
      : {
          [Sequelize.Op.not]: null,
        };
    await model.DexLoc.count({
      distinct: true,
      col: 'loc_cd',
      where: {
        delt_flg: 'N',
        co_cd: CoCdwc,
      },
    })
      .then(result => {
        this.dataRes = result || '0';
      })
      .catch(_error => {
        logger.error(_error);
        throw new BadRequestError({ errorCode: 3000 });
      });
    return this.dataRes;
  }

  static async getDocsProByMonth(param) {
    const CoCd_wc = Sequelize.where(
      Sequelize.col('dex_loc.co_cd'),
      param.co_cd
        ? param.co_cd
        : {
            [Sequelize.Op.not]: null,
          },
    );
    const LocCd_wc = Sequelize.where(
      Sequelize.col('dex_loc.loc_cd'),
      param.loc_cd
        ? param.loc_cd
        : {
            [Sequelize.Op.not]: null,
          },
    );
    const year_wc = Sequelize.where(
      Sequelize.fn('to_char', Sequelize.col('dex_doc.cre_dt'), 'YYYY'),
      param.year ? param.year : { [Sequelize.Op.not]: null },
    );
    const prnt_doc_id_condition = Sequelize.where(Sequelize.col('dex_doc.prnt_doc_id'), null);

    await model.DexDoc.findAll({
      attributes: [
        [Sequelize.fn('to_char', Sequelize.col('dex_doc.cre_dt'), 'MON'), 'month'],
        [Sequelize.fn('count', '*'), 'count'],
      ],
      include: [
        {
          model: model.DexLoc,
          as: 'dex_loc',
          attributes: ['co_cd', 'loc_cd'],
          where: [CoCd_wc, LocCd_wc],
        },
      ],
      group: ['month', 'dex_loc.loc_id'],
      where: {
        [Sequelize.Op.and]: [year_wc, prnt_doc_id_condition],
      },
    })
      .then(result => {
        const dataValues = result ? result.map(data => data.dataValues) : null;
        this.dataRes = {};
        if (dataValues != null) {
          const processedData = {};
          // Handle data from result
          dataValues.forEach(element => {
            const { month } = element;
            const amount = parseInt(element.count, 10);
            if (!(month in processedData)) {
              processedData[month] = { amount: 0 };
            }
            processedData[month].amount += amount;
          });
          // Handle output
          this.dataRes.month = Object.keys(processedData);
          this.dataRes.data = Object.keys(processedData).map(month => processedData[month].amount);
        }
      })
      .catch(_error => {
        logger.error(_error);
        throw new BadRequestError({ errorCode: 3000 });
      });
    return this.dataRes;
  }

  static async getAllDocsByComp(param) {
    const limit = param.limit ? param.limit : '5';
    const year_wc = Sequelize.where(
      Sequelize.fn('to_char', Sequelize.col('dex_doc.cre_dt'), 'YYYY'),
      param.year ? param.year : { [Sequelize.Op.not]: null },
    );
    const prnt_doc_id_condition = Sequelize.where(Sequelize.col('dex_doc.prnt_doc_id'), null);

    await model.DexDoc.findAll({
      raw: true,
      attributes: [[Sequelize.col('dex_loc.co_cd'), 'com_cd'], [Sequelize.fn('count', '*'), 'count']],
      include: [
        {
          model: model.DexLoc,
          as: 'dex_loc',
          attributes: ['co_cd'],
        },
      ],
      group: ['com_cd'],
      where: {
        [Sequelize.Op.and]: [year_wc, prnt_doc_id_condition],
      },
      order: [['count', 'DESC']],
      limit: parseInt(limit, 10),
    })
      .then(result => {
        this.dataRes = {};
        if (result != null) {
          this.dataRes.co_cd = result.map(row => row.com_cd);
          this.dataRes.data = result.map(row => row.count);
        }
      })
      .catch(_error => {
        logger.error(_error);
        throw new BadRequestError({ errorCode: 3000 });
      });
    return this.dataRes;
  }

  static async getAllDocsByLoc(param) {
    const limit = param.limit ? param.limit : '5';
    const CoCd_wc = Sequelize.where(
      Sequelize.col('dex_loc.co_cd'),
      param.co_cd
        ? param.co_cd
        : {
            [Sequelize.Op.not]: null,
          },
    );
    const year_wc = Sequelize.where(
      Sequelize.fn('to_char', Sequelize.col('dex_doc.cre_dt'), 'YYYY'),
      param.year ? param.year : { [Sequelize.Op.not]: null },
    );
    const prnt_doc_id_condition = Sequelize.where(Sequelize.col('dex_doc.prnt_doc_id'), null);

    await model.DexDoc.findAll({
      raw: true,
      attributes: [
        [Sequelize.col('dex_loc.co_cd'), 'com_cd'],
        [Sequelize.col('dex_loc.loc_cd'), 'loct_cd'],
        [Sequelize.fn('count', '*'), 'count'],
      ],
      include: [
        {
          model: model.DexLoc,
          as: 'dex_loc',
          attributes: ['co_cd', 'loc_cd'],
          where: [CoCd_wc],
        },
      ],
      group: ['com_cd', 'loct_cd'],
      where: {
        [Sequelize.Op.and]: [year_wc, prnt_doc_id_condition],
      },
      order: [['count', 'DESC']],
      limit: parseInt(limit, 10),
    })
      .then(result => {
        this.dataRes = {};
        if (result != null) {
          this.dataRes.co_cd = result.map(row => row.com_cd);
          this.dataRes.loc_cd = result.map(row => row.loct_cd);
          this.dataRes.data = result.map(row => row.count);
        }
      })
      .catch(_error => {
        logger.error(_error);
        throw new BadRequestError({ errorCode: 3000 });
      });
    return this.dataRes;
  }

  static async getDistributeOfDoc(param) {
    try {
      const CoCd_wc = `dex_loc.co_cd ${param.co_cd ? `= '${param.co_cd}'` : 'IS NOT NULL'}`;
      const raw_query = `
      (SELECT adm_doc.doc_nm AS doc_name, COUNT(adm_doc.doc_nm) AS doc_count FROM dex_doc
        JOIN adm_doc ON dex_doc.doc_tp_id = adm_doc.doc_tp_id
        JOIN dex_loc ON dex_doc.loc_id = dex_loc.loc_id
        WHERE dex_doc.prnt_doc_id IS NULL AND ${CoCd_wc}
        GROUP BY adm_doc.doc_nm
        ORDER BY doc_count desc
        LIMIT 5)
      UNION
      (SELECT 'Others' AS doc_name,
        CASE 
          WHEN SUM(others_doc.doc_count) IS NULL THEN '0'
          ELSE SUM(others_doc.doc_count)
          END AS doc_count 
        FROM
          (SELECT adm_doc.doc_nm AS doc_name, COUNT(adm_doc.doc_nm) AS doc_count FROM dex_doc
            JOIN adm_doc ON dex_doc.doc_tp_id = adm_doc.doc_tp_id
            JOIN dex_loc ON dex_doc.loc_id = dex_loc.loc_id
            WHERE dex_doc.prnt_doc_id IS NULL AND ${CoCd_wc}
            GROUP BY adm_doc.doc_nm
            ORDER BY doc_count DESC
            OFFSET 5 ) AS others_doc)
      ORDER BY doc_count DESC`;

      const results = await model.sequelize.query(raw_query, {
        type: Sequelize.QueryTypes.SELECT,
      });

      this.dataRes = {};
      this.dataRes.doc_name = results.map(row => row.doc_name);
      this.dataRes.data = results.map(row => parseInt(row.doc_count, 10));
      return this.dataRes;
    } catch (_error) {
      logger.error(_error);
      throw new BadRequestError({ errorCode: 3000 });
    }
  }

  static async getDistributeOfDocDetails(param) {
    try {
      const CoCd_wc = `dex_loc.co_cd ${param.co_cd ? `= '${param.co_cd}'` : 'IS NOT NULL'}`;
      const raw_query = `
      (SELECT adm_doc.doc_nm AS doc_name, 
        COUNT(adm_doc.doc_nm) AS doc_count,
        SUM(CASE WHEN sts_cd IN ('E','V') THEN 1 ELSE 0 END) AS doc_processed,
        SUM(CASE WHEN sts_cd IN ('A','N') THEN 1 ELSE 0 END) AS doc_not_annotated,
        SUM(CASE WHEN sts_cd IN ('F') THEN 1 ELSE 0 END) AS doc_failed
        FROM dex_doc
          JOIN adm_doc ON dex_doc.doc_tp_id = adm_doc.doc_tp_id
          JOIN dex_loc ON dex_doc.loc_id = dex_loc.loc_id
          WHERE dex_doc.prnt_doc_id IS NULL AND ${CoCd_wc}
          GROUP BY adm_doc.doc_nm
          ORDER BY doc_count desc
          LIMIT 5)
      UNION
      (SELECT CONCAT('Others (', COUNT(*), ' document types)') AS doc_name,
        CASE 
          WHEN SUM(others_doc.doc_count) IS NULL THEN '0'
          ELSE SUM(others_doc.doc_count)
          END AS doc_count,
        CASE 
            WHEN SUM(others_doc.doc_processed) IS NULL THEN '0'
            ELSE SUM(others_doc.doc_processed)
            END AS doc_processed,
        CASE 
            WHEN SUM(others_doc.doc_not_annotated) IS NULL THEN '0'
            ELSE SUM(others_doc.doc_not_annotated)
            END AS doc_not_annotated,
        CASE 
            WHEN SUM(others_doc.doc_failed) IS NULL THEN '0'
            ELSE SUM(others_doc.doc_failed)
            END AS doc_failed
        FROM
           (SELECT adm_doc.doc_nm AS doc_name, COUNT(adm_doc.doc_nm) AS doc_count ,
            SUM(CASE WHEN sts_cd IN ('E','V') THEN 1 ELSE 0 END) AS doc_processed,
            SUM(CASE WHEN sts_cd IN ('A','N') THEN 1 ELSE 0 END) AS doc_not_annotated,
            SUM(CASE WHEN sts_cd IN ('F') THEN 1 ELSE 0 END) AS doc_failed
            FROM dex_doc
            JOIN adm_doc ON dex_doc.doc_tp_id = adm_doc.doc_tp_id
            JOIN dex_loc ON dex_doc.loc_id = dex_loc.loc_id
            WHERE dex_doc.prnt_doc_id IS NULL AND ${CoCd_wc}
            GROUP BY adm_doc.doc_nm
            ORDER BY doc_count DESC
            OFFSET 5 ) AS others_doc)
        ORDER BY doc_count DESC`;

      const results = await model.sequelize.query(raw_query, {
        type: Sequelize.QueryTypes.SELECT,
      });

      this.dataRes = {};
      this.dataRes.doc_name = results.map(row => row.doc_name);
      this.dataRes.total_docs = results.map(row => row.doc_count);
      this.dataRes.success_ratio = results.map(row => parseInt(row.doc_processed, 10) / parseInt(row.doc_count, 10));
      this.dataRes.not_annotated = results.map(
        row => parseInt(row.doc_not_annotated, 10) / parseInt(row.doc_count, 10),
      );
      this.dataRes.failed = results.map(row => parseInt(row.doc_failed, 10) / parseInt(row.doc_count, 10));
      return this.dataRes;
    } catch (_error) {
      logger.error(_error);
      throw new BadRequestError({ errorCode: 3000 });
    }
  }

  static async getDocPageProc(param) {
    const CoCd_wc = Sequelize.where(
      Sequelize.col('dex_loc.co_cd'),
      param.co_cd
        ? param.co_cd
        : {
            [Sequelize.Op.not]: null,
          },
    );
    const LocCd_wc = Sequelize.where(
      Sequelize.col('dex_loc.loc_cd'),
      param.loc_cd
        ? param.loc_cd
        : {
            [Sequelize.Op.not]: null,
          },
    );
    const user_wc = Sequelize.where(
      Sequelize.col('dex_doc.cre_usr_id'),
      param.usr_id
        ? param.usr_id
        : {
            [Sequelize.Op.not]: null,
          },
    );
    const prnt_doc_id_condition = Sequelize.where(Sequelize.col('dex_doc.prnt_doc_id'), null);
    const year_wc = Sequelize.where(
      Sequelize.fn('to_char', Sequelize.col('dex_doc.cre_dt'), 'YYYY'),
      param.year ? param.year : { [Sequelize.Op.not]: null },
    );

    await model.DexDoc.findAll({
      raw: true,
      attributes: [
        [Sequelize.fn('to_char', Sequelize.col('dex_doc.cre_dt'), 'MON'), 'month'],
        [Sequelize.fn('sum', Sequelize.col('dex_doc.pg_val')), 'pages'],
      ],
      include: [
        {
          model: model.AdmDoc,
          as: 'adm_doc_tp',
          attributes: ['doc_nm', 'doc_tp_id'],
        },
        {
          model: model.DexLoc,
          as: 'dex_loc',
          attributes: ['co_cd', 'loc_cd'],
          where: [CoCd_wc, LocCd_wc],
        },
      ],
      group: ['month', 'adm_doc_tp.doc_tp_id', 'adm_doc_tp.doc_nm', 'dex_loc.loc_id'],
      where: {
        [Sequelize.Op.and]: [
          year_wc,
          prnt_doc_id_condition,
          user_wc,
          {
            sts_cd: ['E', 'V'],
          },
        ],
      },
      order: [[Sequelize.fn('sum', Sequelize.col('dex_doc.pg_val')), 'DESC']],
    })
      .then(results => {
        // extract data from results
        const data_ext = {};
        results.forEach(element => {
          const doc_name = element['adm_doc_tp.doc_nm'];
          const { month } = element;
          const pages = parseInt(element.pages, 10);
          if (!(doc_name in data_ext)) {
            data_ext[doc_name] = {};
          }
          data_ext[doc_name][month] ? (data_ext[doc_name][month] += pages) : (data_ext[doc_name][month] = pages);
        });
        // process data output
        this.dataRes = {};
        // sort data to get top 5 doc having the most page
        const listAmountPageOfDoc = [];
        Object.keys(data_ext).forEach(doc_name => {
          let amount = 0;
          Object.keys(data_ext[doc_name]).forEach(month => {
            amount += data_ext[doc_name][month];
          });
          listAmountPageOfDoc.push({ doc_name, amount });
        });
        listAmountPageOfDoc.sort((a, b) => parseInt(b.amount, 10) - parseInt(a.amount, 10));
        // process data output
        listAmountPageOfDoc.slice(0, 5).forEach(doc => {
          this.dataRes[doc.doc_name] = {};
          AppConstants.MONTH_IN_YEAR.forEach(month => {
            this.dataRes[doc.doc_name][month] = data_ext[doc.doc_name][month] || 0;
          });
        });
      })
      .catch(_error => {
        logger.error(_error);
        throw new BadRequestError({ errorCode: 3000 });
      });
    return this.dataRes;
  }

  static async getAllDocProcessed(param) {
    try {
      const CoCd_wc = `dex_loc.co_cd ${param.co_cd ? `= '${param.co_cd}'` : 'IS NOT NULL'}`;
      const doc_sts = param.usr_id ? "dex_doc.sts_cd IN  ('E')" : "dex_doc.sts_cd IN  ('E','V')";
      const raw_query = `
        SELECT COUNT(*) AS doc_received
        ${
          param.usr_id
            ? `, (
          SELECT COUNT(DISTINCT doc_id)
          FROM (
            SELECT DISTINCT ON (doc_id) doc_id, dex_doc.cre_usr_id AS usr_cre_doc ,
             dex_tj.cre_usr_id AS usr_latest_edit, dex_tj.cre_dt
              FROM dex_doc
              JOIN dex_tj ON doc_id = tp_id
              JOIN dex_loc ON dex_doc.loc_id = dex_loc.loc_id
              WHERE ${CoCd_wc}
              AND tp_nm IN ('${AppConstants.TRANSACTION.VERIFY}', '${AppConstants.TRANSACTION.RE_APPLY_BIZ}')
              AND dex_tmplt_id IN (
                SELECT DISTINCT(dex_tmplt_id)
                FROM dex_doc
                JOIN dex_tj ON doc_id = tp_id
                JOIN dex_loc ON dex_doc.loc_id = dex_loc.loc_id
                WHERE ${CoCd_wc} AND dex_tj.cre_usr_id = '${param.usr_id}'
                AND tp_nm IN ('${AppConstants.TRANSACTION.VERIFY}', '${AppConstants.TRANSACTION.RE_APPLY_BIZ}')
                AND dex_doc.prnt_doc_id IS NULL
              )
              AND dex_doc.prnt_doc_id IS NULL
              GROUP BY doc_id, dex_doc.cre_usr_id, dex_tj.cre_usr_id, dex_tj.cre_dt
              ORDER BY doc_id, dex_tj.cre_dt DESC
          ) AS doc_and_latest_usr
          WHERE doc_and_latest_usr.usr_latest_edit = '${param.usr_id}'
          OR (doc_and_latest_usr.usr_latest_edit != '${param.usr_id}' AND doc_and_latest_usr.usr_cre_doc = '${param.usr_id}')
        ) AS doc_verify`
            : ''
        }
        FROM dex_doc
        JOIN dex_loc ON dex_doc.loc_id = dex_loc.loc_id
        WHERE dex_doc.prnt_doc_id IS NULL
        AND ${doc_sts} AND ${CoCd_wc}
        ${param.usr_id ? `AND dex_doc.cre_usr_id = '${param.usr_id}'` : ''}
      `;

      const results = await model.sequelize.query(raw_query, {
        type: Sequelize.QueryTypes.SELECT,
      });

      this.dataRes = results.length > 0
          ? `${parseInt(results[0].doc_received || '0', 10) + parseInt(results[0].doc_verify || '0', 10)}`
          : '0';
      return this.dataRes;
    } catch (_error) {
      logger.error(_error);
      throw new BadRequestError({ errorCode: 3000 });
    }
  }

  static async getAllPageProcessed(param) {
    const CoCd_wc = param.co_cd
      ? param.co_cd
      : {
          [Sequelize.Op.not]: null,
        };
    const user_wc = param.usr_id
      ? param.usr_id
      : {
          [Sequelize.Op.not]: null,
        };
    await model.DexDoc.findAll({
      raw: true,
      attributes: [[Sequelize.fn('sum', Sequelize.col('pg_val')), 'pages']],
      where: {
        prnt_doc_id: null,
        sts_cd: ['E', 'V'],
        co_cd: CoCd_wc,
        cre_usr_id: user_wc,
      },
    })
      .then(result => {
        this.dataRes = result && result[0].pages ? result[0].pages : '0';
      })
      .catch(_error => {
        logger.error(_error);
        throw new BadRequestError({ errorCode: 3000 });
      });
    return this.dataRes;
  }

  static async getDocsByStatus(param) {
    const CoCd_wc = Sequelize.where(
      Sequelize.col('dex_loc.co_cd'),
      param.co_cd
        ? param.co_cd
        : {
            [Sequelize.Op.not]: null,
          },
    );
    const year_wc = Sequelize.where(
      Sequelize.fn('to_char', Sequelize.col('dex_doc.cre_dt'), 'YYYY'),
      param.year ? param.year : { [Sequelize.Op.not]: null },
    );
    const user_wc = Sequelize.where(
      Sequelize.col('dex_doc.cre_usr_id'),
      param.usr_id
        ? param.usr_id
        : {
            [Sequelize.Op.not]: null,
          },
    );

    const prnt_doc_id_condition = Sequelize.where(Sequelize.col('dex_doc.prnt_doc_id'), null);

    await model.DexDoc.findAll({
      raw: true,
      attributes: ['sts_cd', [Sequelize.fn('count', '*'), 'count']],
      include: [
        {
          model: model.AdmDoc,
          as: 'adm_doc_tp',
          attributes: ['doc_tp_id'],
        },
        {
          model: model.DexLoc,
          as: 'dex_loc',
          attributes: ['co_cd'],
          where: [CoCd_wc],
        },
      ],
      group: ['sts_cd', 'adm_doc_tp.doc_tp_id', 'dex_loc.co_cd'],
      where: {
        [Sequelize.Op.and]: [year_wc, prnt_doc_id_condition, user_wc],
      },
    })
      .then(result => {
        this.dataRes = {};
        if (result != null) {
          this.dataRes.sts_cd = result.map(row => row.sts_cd);
          this.dataRes.count = result.map(row => row.count);
        }
      })
      .catch(_error => {
        logger.error(_error);
        throw new BadRequestError({ errorCode: 3000 });
      });
    return this.dataRes;
  }

  static async getDocsSuccess(param) {
    try {
      const CoCd_wc = `dex_loc.co_cd ${param.co_cd ? `= '${param.co_cd}'` : 'IS NOT NULL'}`;
      const year_wc = `TO_CHAR(dex_doc.cre_dt, 'YYYY') ${param.year ? `= '${param.year}'` : 'IS NOT NULL'}`;
      const raw_query = `
      SELECT 
        CASE 
          WHEN SUM(doc_success.doc_count) IS NULL THEN '0'
          ELSE SUM(doc_success.doc_count)
          END AS doc_count,
        CASE 
          WHEN SUM(doc_success.doc_processed) IS NULL THEN '0'
          ELSE SUM(doc_success.doc_processed)
          END AS doc_processed
        FROM
        (SELECT COUNT(adm_doc.doc_tp_id) AS doc_count,
            SUM(CASE WHEN sts_cd IN ('E','V') THEN 1 ELSE 0 END) AS doc_processed
            FROM dex_doc
            JOIN adm_doc ON dex_doc.doc_tp_id = adm_doc.doc_tp_id
            JOIN dex_loc ON dex_doc.loc_id = dex_loc.loc_id
            WHERE dex_doc.prnt_doc_id IS NULL AND ${CoCd_wc} AND ${year_wc}
            GROUP BY adm_doc.doc_nm) AS doc_success`;

      const results = await model.sequelize.query(raw_query, {
        type: Sequelize.QueryTypes.SELECT,
      });

      this.dataRes = results.length > 0 ? `${parseInt(results[0].doc_processed, 10) / parseInt(results[0].doc_count, 10)}` : '0';
      return this.dataRes;
    } catch (_error) {
      logger.error(_error);
      throw new BadRequestError({ errorCode: 3000 });
    }
  }

  static async getProcTimeAvg(param) {
    try {
      const CoCd_wc = `dex_loc.co_cd ${param.co_cd ? `= '${param.co_cd}'` : 'IS NOT NULL'}`;
      const raw_query = `
                  SELECT AVG(list_time.time_spend) AS avg_time FROM (
                        SELECT doc_id, sum((tj_ctnt::json->'timeSpend')::text::int) as time_spend 
                        FROM dex_doc 
                        JOIN dex_tj ON doc_id = tp_id 
                        JOIN dex_loc ON dex_doc.loc_id = dex_loc.loc_id
                        WHERE ${CoCd_wc}
                        AND tp_nm IN ('${AppConstants.TRANSACTION.VERIFY}')
                        AND dex_doc.prnt_doc_id IS NULL GROUP BY doc_id) AS list_time`;

      const results = await model.sequelize.query(raw_query, {
        type: Sequelize.QueryTypes.SELECT,
      });

      this.dataRes = results.length > 0 ? `${parseInt(results[0].avg_time || '0', 10)}` : '0';
      return this.dataRes;
    } catch (_error) {
      logger.error(_error);
      throw new BadRequestError({ errorCode: 3000 });
    }
  }

  static async getAnnoTimeAvg(param) {
    try {
      const coCd_wc = `dex_loc.co_cd ${param.co_cd ? `= '${param.co_cd}'` : 'IS NOT NULL'}`;
      const user_wc = `AND dex_tj.upd_usr_id ${param.usr_id ? `='${param.usr_id}'` : 'IS NOT NULL'}`;
      const raw_query = `
                  SELECT AVG(list_time.time_spend) AS avg_time FROM (
                        SELECT DISTINCT(tj_id), (tj_ctnt::json->'timeSpend')::text::int as time_spend 
                        FROM dex_doc 
                        JOIN dex_tj ON tp_id LIKE CONCAT('%-', dex_tmplt_id) 
                        JOIN dex_loc ON dex_doc.loc_id = dex_loc.loc_id
                        WHERE ${coCd_wc} AND tp_nm = :type AND dex_doc.prnt_doc_id IS NULL ${user_wc}) 
                        AS list_time`;

      const results = await model.sequelize.query(raw_query, {
        replacements: { type: AppConstants.TRANSACTION.ANNOTATE },
        type: Sequelize.QueryTypes.SELECT,
      });

      this.dataRes = results.length > 0 ? `${parseInt(results[0].avg_time || '0', 10)}` : '0';
      return this.dataRes;
    } catch (_error) {
      logger.error(_error);
      throw new BadRequestError({ errorCode: 3000 });
    }
  }

  static async getProcessTimeByMonth(param) {
    try {
      const CoCd_wc = `dex_loc.co_cd ${param.co_cd ? `= '${param.co_cd}'` : 'IS NOT NULL'}`;
      const LocCd_wc = `dex_loc.loc_cd ${param.loc_cd ? `= '${param.loc_cd}'` : 'IS NOT NULL'}`;
      const year_wc = `to_char(dex_tj.cre_dt, 'YYYY') ${param.year ? `= '${param.year}'` : 'IS NOT NULL'}`;

      const raw_query = `SELECT adm_doc.doc_nm, to_char(dex_tj.cre_dt, 'MON') as tj_month,
                        sum((tj_ctnt::json->'timeSpend')::text::int) as time_spend,
                        count(adm_doc.doc_nm) as nb_count
                        FROM dex_doc 
                        JOIN dex_tj ON doc_id = tp_id
                        JOIN dex_loc ON dex_doc.loc_id = dex_loc.loc_id
                        JOIN adm_doc ON dex_doc.doc_tp_id = adm_doc.doc_tp_id
                        WHERE ${CoCd_wc} AND ${LocCd_wc} AND ${year_wc}
                        AND tp_nm IN ('${AppConstants.TRANSACTION.VERIFY}') 
                        AND dex_doc.prnt_doc_id IS NULL GROUP BY doc_id, tj_month, adm_doc.doc_nm`;

      const results = await model.sequelize.query(raw_query, {
        type: Sequelize.QueryTypes.SELECT,
      });

      // extract data from results
      const extractedData = extractTimeDataByMonth(results, 'doc_nm');
      // Calculate average processed time and Sort descending total average processed time
      const { dataAvgByMonth, listTotalAvgTimeOfDoc } = caculateAvgAndSortData(extractedData);
      // process top 5 data output
      this.dataRes = {};
      listTotalAvgTimeOfDoc.slice(0, 5).forEach(doc => {
        this.dataRes[doc.extractedProp] = {};
        AppConstants.MONTH_IN_YEAR.forEach(month => {
          this.dataRes[doc.extractedProp][month] = dataAvgByMonth[doc.extractedProp][month] || 0;
        });
      });
      return this.dataRes;
    } catch (_error) {
      logger.error(_error);
      throw new BadRequestError({ errorCode: 3000 });
    }
  }

  static async getAnnotateTimeByMonth(param) {
    try {
      const CoCd_wc = `dex_loc.co_cd ${param.co_cd ? `= '${param.co_cd}'` : 'IS NOT NULL'}`;
      const LocCd_wc = `dex_loc.loc_cd ${param.loc_cd ? `= '${param.loc_cd}'` : 'IS NOT NULL'}`;
      const user_wc = `dex_tj.upd_usr_id ${param.usr_id ? `='${param.usr_id}'` : 'IS NOT NULL'}`;
      const year_wc = `to_char(dex_tj.upd_dt, 'YYYY') ${param.year ? `='${param.year}'` : ' IS NOT NULL'}`;

      const raw_query = `SELECT tp_id, to_char(dex_tj.upd_dt, 'MON') as tj_month,
                        sum((tj_ctnt::json->'timeSpend')::text::int) as time_spend,
                        count(tp_id) as nb_count
                        FROM dex_tj 
                        JOIN (
                          SELECT DISTINCT dex_tmplt_id 
                          FROM dex_doc 
                          JOIN dex_loc ON dex_doc.loc_id = dex_loc.loc_id
                          WHERE ${CoCd_wc} AND ${LocCd_wc} AND dex_doc.prnt_doc_id IS NULL
                        ) dex_document ON tp_id LIKE CONCAT('%-', dex_document.dex_tmplt_id)
                        WHERE ${year_wc} AND ${user_wc}
                        AND tp_nm= :type GROUP BY tp_id, tj_month`;

      const results = await model.sequelize.query(raw_query, {
        replacements: { type: AppConstants.TRANSACTION.ANNOTATE },
        type: Sequelize.QueryTypes.SELECT,
      });

      // extract data from results
      const extractedData = extractTimeDataByMonth(results, 'tp_id');
      // calculate average processed time and sort descending total average processed time
      const { dataAvgByMonth, listTotalAvgTimeOfDoc } = caculateAvgAndSortData(extractedData);
      // process top 5 data output
      this.dataRes = {};
      listTotalAvgTimeOfDoc.slice(0, 5).forEach(doc => {
        this.dataRes[doc.extractedProp] = {};
        AppConstants.MONTH_IN_YEAR.forEach(month => {
          this.dataRes[doc.extractedProp][month] = dataAvgByMonth[doc.extractedProp][month] || 0;
        });
      });
      return this.dataRes;
    } catch (_error) {
      logger.error(_error);
      throw new BadRequestError({ errorCode: 3000 });
    }
  }

  static async getLastThreeYears() {
    await model.DexDoc.findAll({
      attributes: ['cre_dt'],
      order: [['cre_dt', 'ASC']],
    })
      .then(result => {
        if (result) {
          const years = result.map(data => data.dataValues.cre_dt.getFullYear()); // array
          this.dataRes = [...new Set(years)].slice(0, 3);
        }
      })
      .catch(_error => {
        logger.error(_error);
        throw new BadRequestError({ errorCode: 3000 });
      });
    return this.dataRes;
  }
}

function extractTimeDataByMonth(queriedData, queriedProp) {
  const data_ext = {};
  queriedData.forEach(element => {
    const extractedProp = element[queriedProp];
    const { tj_month } = element;
    const time_spend = parseInt(element.time_spend, 10);
    const nb_count = parseInt(element.nb_count, 10);
    if (!(extractedProp in data_ext)) data_ext[extractedProp] = {};
    if (!(tj_month in data_ext[extractedProp])) data_ext[extractedProp][tj_month] = { time: 0, amount: 0 };
    data_ext[extractedProp][tj_month].time += time_spend;
    data_ext[extractedProp][tj_month].amount += nb_count;
  });
  return data_ext;
}

function caculateAvgAndSortData(extractedData) {
  const dataAvgByMonth = extractedData;
  const listTotalAvgTimeOfDoc = [];
  Object.keys(extractedData).forEach(extractedProp => {
    let total_avg_time = 0;
    Object.keys(extractedData[extractedProp]).forEach(month => {
      const avg_time = Number(
        (extractedData[extractedProp][month].time / extractedData[extractedProp][month].amount).toFixed(2),
      );
      dataAvgByMonth[extractedProp][month] = avg_time;
      total_avg_time += avg_time;
    });
    listTotalAvgTimeOfDoc.push({ extractedProp, total_avg_time });
  });
  listTotalAvgTimeOfDoc.sort((a, b) => parseFloat(b.total_avg_time) - parseFloat(a.total_avg_time));
  return { dataAvgByMonth, listTotalAvgTimeOfDoc };
}
