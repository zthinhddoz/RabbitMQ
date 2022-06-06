import { Router } from 'express';
import passport from 'passport';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import logger from '~/shared/logger';
import { SECRET, CLIENT_REDIRECT } from '~/env';
import AppConstants from '../utils/constants';
import model from '~/shared/models';

const axios = require("axios");
const router = Router();

let code = '';
let usernameReset = '';

/**
 * @name register - Register an account
 * @return {Object<{ username: string, message: string }>}
 *
 * @example POST /authentication/register { username: ${username}, password: ${password} }
 */
router.post('/register', async (req, res) => {
  const { username, first_name, last_name, gender, birthday, address, phone, password, email } = req.body;
  let convertGender = '0';
  if(gender === 'male') convertGender = '1';
  else if (gender === 'female') convertGender = '2';
  else convertGender = '3';
  
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    // Sample data to Test
    const CO_CD = "CLV";
    const ACT_FLG = "1";
    const CRE_USR_ID = "admin";

    model.User.create({ usr_id: username, co_cd: CO_CD, act_flg: ACT_FLG,  usr_nm: username, usr_pwd: passwordHash, usr_eml: email, full_nm: first_name +' '+ last_name, brdy_val: birthday, hm_addr: address, phn_no: phone , sex_flg: convertGender,  cre_usr_id: CRE_USR_ID }).then(result => {
      logger.info(result);
    });
    res.status(200).json({ username, message: 'Sign up sucessfully' });
  } catch (error) {
    res.status(400).json({ error });
  }
});

/**
 * @name login - get user token
 * @return {Object<{ username: string, token: string, message: string }>}
 *
 * @example POST /authentication/login { username: ${username}, password: ${password} }
 */

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await model.User.findOne({ where: { usr_id: username } });
    const passwordsMatch = await bcrypt.compare(password, user.usr_pwd);

    if (passwordsMatch) {
      const payload = {
        username: user.username,
        expires: Date.now() + 3 * 60 * 60 * 1000,
      };

      req.login(payload, { session: false }, error => {
        if (error) res.status(400).json({ message: error });

        const token = jwt.sign(JSON.stringify(payload), SECRET);

        res.status(200).json({ username: user.username, token, message: 'Sign in suceesfully' });
      });
    } else {
      res.status(503).json({ message: 'Incorrect Username / Password' });
    }
  } catch (error) {
    res.status(400).json({ message: error });
  }
});

router.post('/logout', async (req, res) => {
  if (req.session) {
    req.session.destroy(function(err) {
      if(err) {
        return next(err);
      } else {
        return res.redirect('/');
      }
    });
  }
});

// Temporary function to generate authentication code
function makeAuthenticationCode(length) {
  var result           = '';
  var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
     result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

router.post('/check', async (req, res) => {
  const {username, email} = req.body;
  try{
    const user = await model.User.findOne({ where: {usr_nm: username } });
    if( user !== null){
      if(user.usr_eml === email){
        let codeAuth = makeAuthenticationCode(6);
        code = codeAuth;
        usernameReset = username;
        res.status(200).json({ codeAuth, message: 'Successfully' });
      }
      else{
        res.status(200).json({ codeAuth:'', message: 'Wrong email' });
      }
    }
    else{
      res.status(200).json({ codeAuth:'', message: 'Wrong username' });
    }
    
  }
  catch(error){
    res.status(400).json({ error });
  }

});

router.post('/reset', async (req, res) => {
  const {codeAuth, newPassword} = req.body;
  try {
    if(codeAuth === code){
      const passwordHash = await bcrypt.hash(newPassword, 10);
      model.User.update({usr_pwd: passwordHash}, {where: {usr_id: usernameReset}})
      res.status(200).json({message: 'Changed' });
    }
    else{
      res.status(200).json({message: 'Wrong authentication code'});
    }
  } catch (error) {
    res.status(400).json({ error });
  }

});



router.get('/facebook/auth', passport.authenticate('facebook', { scope: ['email'] }));

router.get('/facebook/auth/redirect', passport.authenticate('facebook'),
  (req, res) => {
    if (req.isAuthenticated()) {
      console.log("Is authentication with FB");
    }
    // Is first login with GG, FB, user name is default
    let firstLogin = req.user.usr_id.substring(0, 7) === "fb_acc_"
      || req.user.usr_id.substring(0, 7) === "gg_acc_" ? true : false;
    const payload = {
      userId: req.user.usr_n3pty_id,
      username: "facebook-auth",
      expires: Date.now() + 3 * 60 * 60 * 1000,
    };
    const token = jwt.sign(JSON.stringify(payload), SECRET);
    // Handle case when user is first login
    if (firstLogin) { // First login
      res.redirect(CLIENT_REDIRECT + "?userId=" + req.user.usr_id + "&token=" + token);
    } else {
      res.redirect(CLIENT_REDIRECT + "?username=" + req.user.usr_id + "&token=" + token);
    }
  });

router.get('/google/auth',
  passport.authenticate('google', {
    scope:
      'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile'
  })
);

router.get('/google/auth/redirect',
  passport.authenticate('google'),
  (req, res) => {
    if (req.isAuthenticated()) {
      console.log("Is authentication with GG");
    }
    // Is first login with GG, FB, user name is default
    let firstLogin = req.user.usr_id.substring(0, 7) === "fb_acc_"
      || req.user.usr_id.substring(0, 7) === "gg_acc_" ? true : false;
    const payload = {
      userId: req.user.usr_n3pty_id,
      username: "google-auth",
      expires: Date.now() + 3 * 60 * 60 * 1000,
    };
    const token = jwt.sign(JSON.stringify(payload), SECRET);
    // Handle case when user is first login
    if (firstLogin) { // First login
      res.redirect(CLIENT_REDIRECT + "?userId=" + req.user.usr_id + "&token=" + token);
    } else {
      res.redirect(CLIENT_REDIRECT + "?username=" + req.user.usr_id + "&token=" + token);
    }
  });

router.post('/bp-login', async (req, res, next) => {
  const urlReq = process.env.BP_URL + AppConstants.BP_API.LOGIN;
  return await axios.post(urlReq, req.body)
    .then(response => {
      res.status(200).json(response.data);
    })
    .catch(error => {
      logger.error(error);
      res.status(400).json({ message: error });
    })
});

export default router;
