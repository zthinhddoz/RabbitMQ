import session from 'express-session';
import Keycloak from 'keycloak-connect';
// Connect to SSO server
const kcConfig = {
  realm: process.env.REALM,
  'bearer-only': true,
  'auth-server-url': process.env.SERVER_SSO,
  'ssl-required': 'external',
  resource: process.env.RESOURCE_NAME,
  'confidential-port': 0,
};
const memoryStore = new session.MemoryStore();
/*
 Define keycloak middleWare to verify access token. Failed -> 403 Forbidden
 Use in router as keycloak.protect()(req, res, (error) => {})
*/
const keycloak = new Keycloak({ store: memoryStore }, kcConfig);
export default keycloak;
