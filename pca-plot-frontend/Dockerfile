FROM node:20-alpine

# directory di lavoro nel container
WORKDIR /app

# copia solo i file necessari per installare le dipendenze
COPY package.json package-lock.json ./

# installa le dipendenze
RUN npm ci

# copia il resto del codice
COPY . .

# Angular dev server
EXPOSE 4200

# avvio in modalità dev, accessibile dall'esterno
CMD ["npm", "start", "--", "--host", "0.0.0.0", "--port", "4200", "--poll", "2000"]
