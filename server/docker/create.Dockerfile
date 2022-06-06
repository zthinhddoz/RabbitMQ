FROM ubuntu:18.04
EXPOSE 3000-3010 7005
WORKDIR /root
RUN apt-get update --fix-missing
RUN apt-get -y install bash sudo curl net-tools gnupg gnupg1 gnupg2 build-essential
RUN useradd -m -d /home/ubuntu ubuntu \
    && usermod -aG sudo ubuntu \
    && echo "ubuntu ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers \
    && echo fs.inotify.max_user_watches=524288 | tee -a /etc/sysctl.conf && sysctl -p
RUN curl -sL https://deb.nodesource.com/setup_12.x | bash - \
    && apt-get -y install nodejs
RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - \
    && echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list \
    && apt-get update \
    && apt-get -y install yarn
USER ubuntu
WORKDIR /home/ubuntu
RUN mkdir -p doc-extract-product cmd
WORKDIR /home/ubuntu/doc-extract-product
COPY ./server/docker/config/entrypoint.sh /home/ubuntu/cmd/entrypoint.sh
ENTRYPOINT ["/home/ubuntu/cmd/entrypoint.sh"]
