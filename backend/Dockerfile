FROM node:latest

WORKDIR /untismerger
COPY . /untismerger/
RUN npm install

ENTRYPOINT [ "node", "./build/api.js" ]

