
FROM node:16-alpine
WORKDIR /usr/src/app
COPY package.json .
RUN npm install --silent
RUN npm install pm2 -g
COPY . .
EXPOSE 3000
CMD ["npm","start"]