# Version list

```
node: 12.20.0
yarn: 1.22.5
npm: 6.14.8
```

# Docker build command

```
cd {WORK_DIR_OF_DOCKER_FILE}
docker build . -t <docker_image_name>:<tag>

- Ex: docker build . -t shinev2_server
```

# Docker run command

```
docker run -d -p 7005:7005 -v /home/ubuntu/data/files:/home/ubuntu/doc-extract-product/server/file -v /home/ubuntu/doc-extract-product/server:/home/ubuntu/doc-extract-product/server -v /home/ubuntu/doc-extract-product/server/docker/config:/home/ubuntu/cmd --restart=unless-stopped --name server shinev2_server

docker run -d -p 9005:7005 -v /home/shine/data/files:/home/ubuntu/doc-extract-product/server/file -v /home/shine/server-test/doc-extract-product/server:/home/ubuntu/doc-extract-product/server -v /home/shine/server-test/doc-extract-product/server/docker/config:/home/ubuntu/cmd --restart=unless-stopped --user ubuntu:ubuntu --name server-test shinev2_server

docker run -d -p 5005:7005 -v /home/ubuntu/data/files:/home/ubuntu/doc-extract-product/server/file -v /home/ubuntu/saas-prod/doc-extract-product/server:/home/ubuntu/doc-extract-product/server -v /home/ubuntu/saas-prod/doc-extract-product/server/docker/config:/home/ubuntu/cmd --restart=unless-stopped --name server-prod shinev2_server

docker run -d -p 9005:7005 -v /home/ubuntu/data/saas-files:/home/ubuntu/doc-extract-product/server/file -v /home/ubuntu/saas-factory/doc-extract-product/server:/home/ubuntu/doc-extract-product/server -v /home/ubuntu/saas-factory/doc-extract-product/server/docker/config:/home/ubuntu/cmd --restart=unless-stopped --user ubuntu:ubuntu --name server-factory shinev2_server


```

# Docker exec command

```
docker exec -it server bash
```

# Docker restart command

## Using when updated the "/home/ubuntu/doc-extract-product/server/docker/config/entrypoint.sh" file)

```
docker restart server
```

# Docker show logs command

```
docker logs -f server
```

# Docker list images command

```
docker images

- We're using this docker image "shinev2_server" for server source
```

# You can change the Docker container name "server" to whatever you want
