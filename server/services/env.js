if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
export const NODE_ENV = process.env.NODE_ENV || 'development';

export const HOST = process.env.HOST || '0.0.0.0';
export const PORT = process.env.PORT || 3000;

export const SECRET = process.env.SECRET;
export const BP_SECRET = process.env.BP_SECRET;

export const POSTGRES_URL = process.env.POSTGRES_URL;
export const REDIS_URL = process.env.REDIS_URL;

export const AUTH = {
  GOOGLE: {
    clientID: process.env.GOOGLE_ID,
    clientSecret: process.env.GOOGLE_SECRET,
    googleCallback: process.env.GOOGLE_CALLBACK,
  },
  FACEBOOK: {
    clientID: process.env.FACEBOOK_ID,
    clientSecret: process.env.FACEBOOK_SECRET,
    facebookCallback: process.env.FB_CALLBACK,
  },
  TWITTER: {
    consumerKey: process.env.TWITTER_KEY,
    consumerSecret: process.env.TWITTER_SECRET,
  },
};

export const SERVICE_ACCOUNT = {
  GOOGLE: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN
  }
};

export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

export const RATE_LIMIT = process.env.RATE_LIMIT;

export const SENTRY_DSN = process.env.SENTRY_DSN;

export const STATIC_FILES = process.env.STATIC_FILES;

export const RENDERTRON_URL = process.env.RENDERTRON_URL;

export const CLIENT_REDIRECT = process.env.CLIENT_REDIRECT;
