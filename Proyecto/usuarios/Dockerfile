FROM node:18

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install

# Instalar netcat (nc) para hacer la espera de PostgreSQL
RUN apt-get update && apt-get install -y netcat-openbsd

COPY . .

EXPOSE 3004

CMD ["node", "index.js"]
