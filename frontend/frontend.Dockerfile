FROM node:latest as build

WORKDIR /untismerger/app

COPY ./frontend /untismerger/app
COPY ./globalTypes.d.ts /untismerger/

RUN npm install
RUN npm run build


FROM nginx
COPY ./frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /untismerger/app/out /usr/share/nginx/html