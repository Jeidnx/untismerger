FROM node:latest

WORKDIR /untismerger/src
COPY backend /untismerger/src
COPY globalTypes.d.ts /untismerger
RUN npm install
RUN npm run build

ENTRYPOINT [ "node", "./build/src/api.js" ]

