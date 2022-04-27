FROM node:latest

WORKDIR /untismerger/app
COPY backend /untismerger/app
COPY ../globalTypes.d.ts /untismerger
RUN npm install
RUN npm run build

ENTRYPOINT [ "node", "./build/src/api.js" ]

