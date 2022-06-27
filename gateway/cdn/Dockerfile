FROM node:12-alpine

RUN npm install http-server -g
# Add ubuntu user
RUN addgroup ubuntu
RUN adduser \
    --disabled-password \
    --gecos "" \
    --home /home/ubuntu \
    --ingroup ubuntu \
    ubuntu
USER ubuntu
RUN mkdir -p /home/ubuntu/cdn

WORKDIR /home/ubuntu/cdn
CMD [ "http-server", "--cors" ]
