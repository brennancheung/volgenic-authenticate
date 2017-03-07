FROM volgenic/node-dev-service:latest

LABEL maintainer "git@brennancheung.com"

EXPOSE 80

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY . /usr/src/app

RUN npm install

ENTRYPOINT ["npm", "start"]
