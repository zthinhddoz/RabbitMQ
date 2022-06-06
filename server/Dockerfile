FROM node:12

ENV HOME /document-extraction

WORKDIR ${HOME}
ADD . $HOME

RUN yarn install --frozen-lockfile

EXPOSE 3000
