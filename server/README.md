# Document Extraction

The repository provides the following features:

- [x] Authorization
- [x] Message queue
- [ ] CICD
- [ ] Mail
- [ ] Paytment
- [ ] Billing
- [ ] Content Manager
- [ ] ...

## Getting Started

Follow steps to execute source.

1. Clone source

```bash
$ git clone --depth 1 https://gitlab.com/cyberlogitec/document-extraction.git <PROJECT_NAME>
$ cd <PROJECT_NAME>
```

2. Install dependencies

```bash
$ yarn install
```

3. Start a local server

- Need to create .env first, can copy from .env.development

```bash
$ yarn serve
```

4. Compile code

```bash
$ yarn build
```

5. Check code quality

```bash
$ yarn lint
```

6. Runs unit tests

```bash
$ yarn unit
```

7. Runs end-to-end tests

```bash
$ yarn e2e
```

## Dockerization

Dockerize an application.

1. Build and run the container in the background

```bash
$ docker-compose up -d app
```

2. Run a command in a running container

```bash
$ docker-compose exec app <COMMAND>
```

3. Remove the old container before creating the new one

```bash
$ docker-compose rm -fs
```

4. Restart up the container in the background

```bash
$ docker-compose up -d --build app
```

5. Push images to Docker Cloud

```diff
# .gitignore

  .DS_Store
  node_modules
  dist
  coverage
+ dev.Dockerfile
+ stage.Dockerfile
+ prod.Dockerfile
  *.log
```

````bash
$ docker build -f ./setup/<dev|stage|prod>.Dockerfile -t <IMAGE_NAME>:<IMAGE_TAG> .

# checkout
$ docker images

$ docker tag <IMAGE_NAME>:<IMAGE_TAG> <DOCKER_ID_USER>/<IMAGE_NAME>:<IMAGE_TAG>
$ docker push <DOCKER_ID_USER>/<IMAGE_NAME>:<IMAGE_TAG>

# remove
$ docker rmi <REPOSITORY>:<TAG>
# or
$ docker rmi <IMAGE_ID>

## Database migration
`node_modules/.bin/sequelize db:migrate`
## Directory Structure

The structure

```coffee
.
├── src
│   ├── <SERVICE> -> service modules
│   │   ├── __tests__
│   │   │   ├── <FEATURE>.e2e-spec.js
│   │   │   └── <FEATURE>.spec.js
│   │   ├── _<THING> -> feature of private things
│   │   │   └── ...
│   │   └── <FEATURE>.js
│   ├── <GROUP-SERVICE> -> module group
│   │   └── <SERVICE> -> service modules
│   │       ├── __tests__
│   │       │   ├── <FEATURE>.e2e-spec.js
│   │       │   └── <FEATURE>.spec.js
│   │       ├── _<THING> -> feature of private things
│   │       │   └── ...
│   │       └── <FEATURE>.js
│   ├── shared -> shared feature module
│   ├── app.js
│   ├── env.js
│   └── server.js
├── setup
│   └── ...
├── .editorconfig
├── .eslintrc
├── .gitignore
├── .prettierrc
├── babel.config
├── docker-compose.yml
├── Dockerfile
├── jest.config.js
├── LICENSE
├── package.json
├── processes.js
├── README.md
└── yarn.lock
````

## Microservices
