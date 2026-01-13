FROM node:20-alpine

WORKDIR /app

COPY ./code/srcs/ srcs
COPY ./code/*.json .

RUN apk add --no-cache curl

RUN npm install

EXPOSE 3000
