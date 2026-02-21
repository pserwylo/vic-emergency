FROM node:24-alpine3.23
WORKDIR /app
COPY package.json /app
RUN npm install
COPY . /app
CMD ["npm","run", "server:start"]
