FROM node:20-slim

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN node prisma/filter-schemas.js

RUN npx prisma generate --schema=./prisma/schema.prisma

EXPOSE 3000
CMD ["npm", "run", "dev"]