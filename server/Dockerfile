FROM node:12
EXPOSE 3000
ENV HOME /document-extraction
WORKDIR ${HOME}
ADD . $HOME
WORKDIR $HOME/server
RUN yarn install --frozen-lockfile
CMD tail -f /dev/null