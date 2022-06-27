FROM postgres:11

WORKDIR /root
# Add ubuntu user
RUN useradd -m -d /home/ubuntu ubuntu \
    && usermod -aG sudo ubuntu \
    && echo "ubuntu ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

CMD ["postgres"]