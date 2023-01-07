
FROM node:18-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm i
COPY . .
EXPOSE 1337
CMD ["npm","start"]