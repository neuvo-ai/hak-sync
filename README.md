## Description

A synchronization daemon to copy data from the HAK database to Neuvo Inc. Global. Built on top of [Nest](https://github.com/nestjs/nest).

## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Configuration
Example configuration environmental values. You can write these in a `.env` file that is read by the daemon.

```bash
PORT=3210
HTTP_TIMEOUT=30000
HTTP_MAX_REDIRECTS=10

MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USERNAME=username
MYSQL_PASSWORD=password
MYSQL_DATABASE=hak

NEUVO_STATS_API=https://endpoint
NEUVO_SECRET=secret token
```

## License

This project is licensed under a dual license system, you are free to use the code under [GNU GPLv2](LICENSE.md) and a private license of Neuvo Inc. Global. By contributing to this repository, you are accepting our [Individual contributor license agreement](/CONTRIBUTOR-LICENSE.md) that your contributions will be available to Neuvo Inc. Global for commercial use under a private license as well as under GPLv2.
