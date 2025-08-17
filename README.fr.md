###### English version [here](https://github.com/johan-perso/obsidianinbox-api/blob/main/README.md).

# Obsidian Inbox | API

Une extension pour Obsidian vous permettant de recevoir des fichiers dans votre coffre via une API REST, comme une boîte de réception.


## Installation

### Installation classique

**Prérequis :**

- Une version récente de [Node.js](https://nodejs.org/fr/download) et de [npm](https://nodejs.org/fr/download) (fourni avec Node.js)
	- Obsidian Inbox a été testé avec Node.js v24
	- Vous pouvez vérifier la version installée avec la commande `node --version`
- [Git CLI](https://git-scm.com/)

**Télécharger le code et les dépendances :**

```bash
git clone https://github.com/johan-perso/obsidianinbox-api.git
cd obsidianinbox-api

npm install
# ou pnpm install
```

**Configurer l'API :**

```bash
mv .env.example .env
nano .env
```

> Le mot de passe de l'API doit être défini avec la variable d'environnement `AUTH_PASSWORD`. Celui-ci devra également être configuré dans Obsidian.

**Démarrer l'API :**

```bash
npm start

# Pour démarrer l'API en arrière-plan, vous pouvez utiliser PM2 :
# npm install pm2 -g
# pm2 start index.js --name obsidianinbox-api
```

### Installation avec Docker

**Prérequis :**

- [Docker](https://docs.docker.com/get-docker/)
- [Git CLI](https://git-scm.com/)

**Télécharger le code source :**

```bash
git clone https://github.com/johan-perso/obsidianinbox-api.git
cd obsidianinbox-api
```

**Configurer l'API :**

```bash
mv .env.example .env
nano .env
```

> Le mot de passe de l'API doit être défini avec la variable d'environnement `AUTH_PASSWORD`. Celui-ci devra également être configuré dans Obsidian.

**Démarrer l'API :**

```bash
docker-compose up -d --build
# Pour voir les logs : docker-compose logs -f
```

## Configurer l'extension

Les instructions sont disponibles sur le [dépôt GitHub de l'extension](https://github.com/johan-perso/obsidianinbox-extension).

## Utilisation de l'API

### Créer des fichiers (POST `/store`)

```bash
curl -X POST "http://localhost:3000/store" \
  -H "Authorization: <AUTH_PASSWORD>" \
  -H "Content-Type: application/json" \
  -d '{"files":[{"name":"test.md","content":"blablabla","force":false}]}'

# 'force' permet de remplacer un fichier s'il n'a pas encore été synchronisé dans le coffre.
```

### Récupérer les fichiers (GET `/files`)

```bash
curl -X GET "http://localhost:3000/files" \
	-H "Authorization: <AUTH_PASSWORD>"
```

### Supprimer des fichiers (DELETE `/delete`)

```bash
curl -X DELETE "http://localhost:3000/delete" \
  -H "Authorization: <AUTH_PASSWORD>" \
  -H "Content-Type: application/json" \
  -d '{"files":["test.md"]}'
```

## Licence

MIT © [Johan](https://johanstick.fr). [Soutenez ce projet](https://johanstick.fr/#donate) si vous souhaitez m'aider 💙
