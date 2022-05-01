FROM node:latest

WORKDIR /untismerger/backend
COPY . /untismerger/

RUN npm install
RUN npm run build

ENTRYPOINT [ "node", "./out/src/api.js" ]

