FROM node:12

ENV HOME /document-extraction

WORKDIR ${HOME}
ADD . $HOME

RUN yarn install --frozen-lockfile
CMD ['yarn', 'start']

EXPOSE 3000
