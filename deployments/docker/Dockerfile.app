FROM node:24-alpine

ARG PROJECT=google-sheet-demo

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY projects/${PROJECT}/package*.json ./

# Install bash shell for debugging.
# RUN apk add --no-cache bash

# Bundle app source
COPY projects/${PROJECT}/ .
COPY deployments/docker/run-app.sh ./deployments/docker/run-app.sh

CMD [ "sh", "./deployments/docker/run-app.sh" ]
