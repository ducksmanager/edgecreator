FROM node:10-slim

ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=3000

RUN mkdir -p /usr/src/nuxt-app
WORKDIR /usr/src/nuxt-app
COPY . /usr/src/nuxt-app/

RUN npm install
RUN npm run build:prod

EXPOSE 3000

CMD [ "npm", "run", "start:prod" ]
