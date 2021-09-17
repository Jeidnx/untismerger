FROM node:latest

RUN git clone https://github.com/Jeidnx/untismerger.git
WORKDIR /untismerger

COPY ./config.js /untismerger/
RUN npm install

EXPOSE 8080 8081

ENTRYPOINT [ "node", "index.js" ]