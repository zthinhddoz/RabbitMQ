import model from '~/shared/models';
import { BadRequestError } from '../utils/errors';
import logger from '~/shared/logger';
import AppConstants from '../utils/constants';
const Sequelize = require('sequelize');
const _ = require('lodash');
const axios = require('axios');

export default class SyncdataChangeService {
  constructor() {
    this.dataChangeDetailRes = {};
  }

  static async handleMenuChange(info) {
    const dataChangeDetail = info.data;
    /*
      Formar dataChangeDetail:
      {
        bp_mn_id:
        link:
        mn_prt_id:
        ls_btn_no: []
        type:
        mn_nm:
        act_flg:
      }
      Table: AdmMnuPgm, AdmMnuPgmBtn
    */
    if (info.actCd === AppConstants.BP_ACTION.INSERT) {
      await model.AdmMnuPgm.create({
        mnu_pgm_id: dataChangeDetail.bp_mn_id,
        prnt_mnu_id: dataChangeDetail.mn_prt_id,
        mnu_pgm_ord_no: 0,
        mnu_pgm_nm: dataChangeDetail.mn_nm,
        mnu_pgm_url_html: dataChangeDetail.link,
        pjt_id: process.env.PROJECT_ID,
      }).catch((err) => {
        console.log('Error when creating menu', err);
      });
      // Insert button_no for page (ls_btn_no.length > 0)
      if (dataChangeDetail.ls_btn_no.length > 0) {
        dataChangeDetail.ls_btn_no.forEach(item => {
          model.AdmMnuPgmBtn.create({
            btn_no: item,
            mnu_pgm_id: dataChangeDetail.bp_mn_id,
            cre_usr_id: 'admin',
            upd_usr_id: 'admin',
          }).catch((err) => {
            console.log('Error when creating menu button', err);
          });
        });
      }
    } else if (info.actCd === AppConstants.BP_ACTION.UPDATE) {
      await model.AdmMnuPgm.update(
        {
          prnt_mnu_id: dataChangeDetail.mn_prt_id,
          mnu_pgm_ord_no: 0,
          mnu_pgm_nm: dataChangeDetail.mn_nm,
          mnu_pgm_url_html: dataChangeDetail.link,
          pjt_id: process.env.PROJECT_ID,
        },
        { where: { mnu_pgm_id: dataChangeDetail.bp_mn_id } },
      ).catch((err) => {
        console.log('Error when update menu', err);
      });
      // With action Update: will delete all button of this menu before add
      if (dataChangeDetail.ls_btn_no.length > 0) {
        await model.AdmMnuPgmBtn.destroy({
          where: { mnu_pgm_id: dataChangeDetail.bp_mn_id },
        }).catch((err) => {
          console.log('Error when delete menu button', err);
        });
        dataChangeDetail.ls_btn_no.forEach(item => {
          model.AdmMnuPgmBtn.create({
            btn_no: item,
            mnu_pgm_id: dataChangeDetail.bp_mn_id,
            cre_usr_id: 'admin',
            upd_usr_id: 'admin',
          }).catch((err) => {
            console.log('Error when creating menu button', err);
          });
        });
      }
    } else if (info.actCd === AppConstants.BP_ACTION.DELETE) {
      model.AdmMnuPgmBtn.destroy({
        where: { mnu_pgm_id: dataChangeDetail.bp_mn_id },
      }).catch((err) => {
        console.log('Error when delete menu button', err);
      });
      model.AdmMnuPgm.destroy({
        where: { mnu_pgm_id: dataChangeDetail.bp_mn_id },
      }).catch((err) => {
        console.log('Error when delete menu', err);
      });
    }
  }

  static async handleRoleChange(info) {
    const dataChangeDetail = info.data;
    /*
      Formar dataChangeDetail:
      {
        co_cd:
        role_tp_cd:
        role_id:
        cre_usr_id:
        role_nm:
        role_desc:
        upd_usr_id:
      }
      Table: AdmRole
    */
    if (info.actCd === AppConstants.BP_ACTION.INSERT) {
      model.AdmRole.create({
        role_id: dataChangeDetail.role_id,
        role_nm: dataChangeDetail.role_nm,
        role_desc: dataChangeDetail.role_desc,
        role_tp_cd: dataChangeDetail.role_tp_cd,
        co_cd: dataChangeDetail.co_cd,
        cre_usr_id: dataChangeDetail.cre_usr_id,
        upd_usr_id: dataChangeDetail.upd_usr_id,
      }).catch((err) => {
        console.log('Error when creating role', err);
      });
    } else if (info.actCd === AppConstants.BP_ACTION.UPDATE) {
      model.AdmRole.update(
        {
          role_nm: dataChangeDetail.role_nm,
          role_desc: dataChangeDetail.role_desc,
          upd_usr_id: dataChangeDetail.upd_usr_id,
          co_cd: dataChangeDetail.co_cd,
          role_tp_cd: dataChangeDetail.role_tp_cd,
        },
        { where: { role_id: dataChangeDetail.role_id } },
      ).catch((err) => {
        console.log('Error when update role', err);
      });
    } else if (info.actCd === AppConstants.BP_ACTION.DELETE) {
      model.AdmRole.destroy({
        where: { role_id: dataChangeDetail.role_id },
      }).catch((err) => {
        console.log('Error when delete role', err);
      });
    }
  }

  static async handleUserChange(info) {
    const dataChangeDetail = info.data;
    /*
      Formar dataChangeDetail:
      {
        usrEml:
        ofcCd:
        actFlg:
        coCd:
        comUsrSx:
        usrNm:
        roleId:
        brdyVal:
        usrId:
        fullNm:
      }
      Table: AdmUsr, AdmUsrRole
    */
    if (info.actCd === AppConstants.BP_ACTION.INSERT) {
      await model.AdmUsr.create({
        usr_id: dataChangeDetail.usrId,
        usr_nm: dataChangeDetail.usrNm,
        usr_eml: dataChangeDetail.usrEml,
        co_cd: dataChangeDetail.coCd,
        com_usr_sx: dataChangeDetail.comUsrSx || 'M',
        full_nm: dataChangeDetail.fullNm,
        cre_usr_id: 'admin',
        upd_usr_id: 'admin',
      }).catch((err) => {
        console.log('Error when creating user', err);
      });
      model.AdmUsrRole.create({
        usr_id: dataChangeDetail.usrId,
        role_id: dataChangeDetail.roleId,
        cre_usr_id: 'admin',
        upd_usr_id: 'admin',
      }).catch((err) => {
        console.log('Error when creating user role', err);
      });
    } else if (info.actCd === AppConstants.BP_ACTION.UPDATE) {
      model.AdmUsr.update(
        {
          usr_nm: dataChangeDetail.usrNm,
          usr_eml: dataChangeDetail.usrEml,
          co_cd: dataChangeDetail.coCd,
          com_usr_sx: dataChangeDetail.comUsrSx,
          full_nm: dataChangeDetail.fullNm,
        },
        { where: { usr_id: dataChangeDetail.usrId } },
      ).catch((err) => {
        console.log('Error when update user', err);
      });
    } else if (info.actCd === AppConstants.BP_ACTION.DELETE) {
      model.AdmUsr.destroy({
        where: { usr_id: dataChangeDetail.usr_id },
      }).catch((err) => {
        console.log('Error when delete user button', err);
      });
      model.AdmUsrRole.destroy({
        where: { usr_id: dataChangeDetail.usr_id, role_id: dataChangeDetail.roleId },
      }).catch((err) => {
        console.log('Error when delete user button', err);
      });
    }
  }

  static async handleAuthChange(info) {
    /*
      Formar dataChangeDetail:
      {
        button: []
        role:
        authority:
        updateUser:
        createUser:
        menu:
      }
      Table: AdmRolePgmAuth, AdmRolePgmBtnAuth
    */
    const dataChangeDetail = info.data;
    if (info.actCd === AppConstants.BP_ACTION.INSERT) {
      await model.AdmRolePgmAuth.create({
        role_id: dataChangeDetail.role,
        mnu_pgm_id: dataChangeDetail.menu,
        cre_usr_id: dataChangeDetail.createUser || 'admin',
        upd_usr_id: dataChangeDetail.updateUser || 'admin',
      }).catch((err) => {
        console.log('Error when creating menu auth', err);
      });
      // Insert button_no auth for menu auth (button.length > 0)
      if (dataChangeDetail.button.length > 0) {
        dataChangeDetail.button.forEach(item => {
          model.AdmRolePgmBtnAuth.create({
            btn_no: item,
            role_id: dataChangeDetail.role,
            mnu_pgm_id: dataChangeDetail.menu,
            cre_usr_id: dataChangeDetail.createUser || 'admin',
            upd_usr_id: dataChangeDetail.updateUser || 'admin',
          }).catch((err) => {
            console.log('Error when creating menu button auth', err);
          });
        });
      }
    } else if (info.actCd === AppConstants.BP_ACTION.UPDATE) {
      // With action Update: will delete all button auth of this menu before add
      await model.AdmRolePgmBtnAuth.destroy({
        where: { mnu_pgm_id: dataChangeDetail.menu, role_id: dataChangeDetail.role },
      }).catch((err) => {
        console.log('Error when delete menu button', err);
      });
      dataChangeDetail.button.forEach(item => {
        model.AdmRolePgmBtnAuth.create({
          btn_no: item,
          role_id: dataChangeDetail.role,
          mnu_pgm_id: dataChangeDetail.menu,
          cre_usr_id: dataChangeDetail.createUser || 'admin',
          upd_usr_id: dataChangeDetail.updateUser || 'admin',
        }).catch((err) => {
          console.log('Error when creating menu button auth', err);
        });
      });
    } else if (info.actCd === AppConstants.BP_ACTION.DELETE) {
      model.AdmRolePgmAuth.destroy({
        where: { mnu_pgm_id: dataChangeDetail.menu, role_id: dataChangeDetail.role },
      }).catch((err) => {
        console.log('Error when delete menu button', err);
      });
      model.AdmRolePgmBtnAuth.destroy({
        where: { mnu_pgm_id: dataChangeDetail.menu, role_id: dataChangeDetail.role },
      }).catch((err) => {
        console.log('Error when delete menu', err);
      });
    }
  }
}
