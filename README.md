###### Version française [ici](https://github.com/johan-perso/obsidianinbox-api/blob/main/README.fr.md).

# Obsidian Inbox | API

An Obsidian extension allowing you to receive files in your vault via a REST API, like an inbox.


## Hosting

### Install from source

**Prerequisites:**

- A recent version of [Node.js](https://nodejs.org/en/download) and [npm](https://nodejs.org/en/download) (comes with Node.js)
	- Obsidian Inbox has been tested with Node.js v24
	- You can check the installed version with the command `node --version`
- [Git CLI](https://git-scm.com/)

**Download the code and dependencies:**

```bash
git clone https://github.com/johan-perso/obsidianinbox-api.git
cd obsidianinbox-api

npm install
# or pnpm install
```

**Configure the API:**

```bash
mv .env.example .env
nano .env
```

> The API password must be set with the environment variable `AUTH_PASSWORD`. This will also need to be configured in Obsidian.

**Start the API:**

```bash
npm start

# To start the API in the background, you can use PM2:
# npm install pm2 -g
# pm2 start index.js --name obsidianinbox-api
```

### Installation with Docker

**Prerequisites:**

- [Docker](https://docs.docker.com/get-docker/)
- [Git CLI](https://git-scm.com/)

**Download the source code:**

```bash
git clone https://github.com/johan-perso/obsidianinbox-api.git
cd obsidianinbox-api
```

**Configure the API:**

```bash
mv .env.example .env
nano .env
```

> The API password must be set with the environment variable `AUTH_PASSWORD`. This will also need to be configured in Obsidian.

**Start the API:**

```bash
docker-compose up -d --build
# To view logs: docker-compose logs -f
```

## Configure the Obsidian extension

These instructions can be found in the [GitHub repository of the extension](https://github.com/johan-perso/obsidianinbox-extension).

## Using the API

### Add files to the inbox (POST `/store`)

```bash
curl -X POST "http://localhost:3000/store" \
  -H "Authorization: <AUTH_PASSWORD>" \
  -H "Content-Type: application/json" \
  -d '{"files":[{"name":"test.md","content":"blablabla","force":false}]}'

# 'force' allows a file to be overwritten if not yet synchronized in the vault.
```

### Get incoming files (GET `/files`)

```bash
curl -X GET "http://localhost:3000/files" \
	-H "Authorization: <AUTH_PASSWORD>"
```

### Remove files from the inbox (DELETE `/delete`)

```bash
curl -X DELETE "http://localhost:3000/delete" \
  -H "Authorization: <AUTH_PASSWORD>" \
  -H "Content-Type: application/json" \
  -d '{"files":["test.md"]}'
```

## License

MIT © [Johan](https://johanstick.fr/). [Support this project](https://johanstick.fr/#donate) if you want to help me 💙
