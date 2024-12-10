# Usa una imagen oficial de Node.js como base
FROM node:18

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia el package.json y package-lock.json al contenedor
COPY package.json package-lock.json ./

# Instala las dependencias
RUN npm install

# Instalar netcat (nc) para hacer la espera de PostgreSQL
RUN apt-get update && apt-get install -y netcat-openbsd

# Copia el resto del código al contenedor
COPY . .

# Expone el puerto en el que correrá el microservicio
EXPOSE 3001

# Comando para iniciar el microservicio
CMD ["node", "index.js"]
