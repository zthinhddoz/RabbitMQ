FROM node:12

ENV HOME /document-extraction

WORKDIR ${HOME}
ADD . $HOME

RUN yarn install && yarn build

ENV NODE_ENV production

# envs --
ENV HOST 0.0.0.0

ENV SECRET jbmpHPLoaV8N0nEpuLxlpT95FYakMPiu

ENV POSTGRES_URL postgres://ymuxoegt:ONfBcCQylth3boOdUE2EkcZbC2OAbtcm@tantor.db.elephantsql.com:5432/ymuxoegt
ENV REDIS_URL redis://redis-17929.c1.us-central1-2.gce.cloud.redislabs.com:17929

ENV SENTRY_DSN https://70484e0dda784a1081081ca9c8237792:51b5a95ee1e545efba3aba9103c6193e@sentry.io/236866

ENV RATE_LIMIT 100
# -- envs

# processes --
ENV WEB_CONCURRENCY 1
# -- processes

CMD node processes.js
