FROM node:18-alpine

WORKDIR /usr/src/app

# Copiar package.json e instalar dependencias
COPY package*.json ./
RUN npm install

# Copiar el código fuente
COPY . .

# Exponer puerto
EXPOSE 3000

# Comando de inicio
CMD ["node", "server.js"]