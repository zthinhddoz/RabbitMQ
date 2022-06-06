import { join } from 'path';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import session from 'express-session';
import morgan from 'morgan';
import rendertron from 'rendertron-middleware';
import history from 'express-history-api-fallback';
import * as Sentry from '@sentry/node';

import routes from '~/gateway-api/routes';
// import apolloServer from '~/gateway-api/graphql';
import passport from '~/shared/passport';
import Keycloak from 'keycloak-connect';
import { NODE_ENV, SECRET, RATE_LIMIT, SENTRY_DSN, STATIC_FILES, RENDERTRON_URL } from './env';

const kcConfig = {
  realm: 'demo_shine',
  'bearer-only': true,
  'auth-server-url': process.env.SERVER_SSO,
  'ssl-required': 'external',
  resource: process.env.RESOURCE_NAME,
  'confidential-port': 0,
};
const memoryStore = new session.MemoryStore();
const app = express();
app.use(
  session({
    secret: 'some secret',
    resave: false,
    saveUninitialized: true,
    store: memoryStore,
  }),
);
const keycloak = new Keycloak({ store: memoryStore }, kcConfig);
// listen to BLP RabbitMQ
// let Receive = require('./AMPQ/receive');
console.log('consuming data from rabbitMQ');
const Consumer = require('./AMPQCore/consumer');

if (NODE_ENV === 'production') Sentry.init({ dsn: SENTRY_DSN });

/**
 * @name middleware-functions
 */
app.use(helmet());
app.use(cors());
app.use(rateLimit({ max: Number(RATE_LIMIT), windowMs: 15 * 60 * 1000 }));
app.use(compression());
app.use(morgan('tiny'));
app.use(express.raw({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 }));
app.use(express.json({ limit: '50mb' }));
app.use(keycloak.middleware());
app.use(passport.initialize());
app.use(passport.session());

if (NODE_ENV === 'production') app.use(Sentry.Handlers.requestHandler());

/**
 * @name REST
 */
app.use('/', routes);

/**
 * @name GraphQL
 */
// apolloServer.applyMiddleware({ app });

if (NODE_ENV === 'production') app.use(Sentry.Handlers.errorHandler());

/**
 * @name static-files
 */
if (STATIC_FILES) {
  const root = join(__dirname, `../${STATIC_FILES}`);

  // seo friendly
  app.use(rendertron.makeMiddleware({ proxyUrl: RENDERTRON_URL }));

  // serve static
  app.use(express.static(root));

  // spa friendly
  app.use(history('index.html', { root }));
}

export default app;
