FROM node:latest

WORKDIR /untismerger
COPY . /untismerger/
EXPOSE 8080

ENTRYPOINT [ "node", "index.js" ]
