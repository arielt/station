FROM node:24-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY projects/google-sheet-demo/package*.json ./

# Install bash shell for debugging.
# RUN apk add --no-cache bash

# Bundle app source
COPY projects/google-sheet-demo/ .
COPY deployment/docker/run-app.sh ./deployment/docker/run-app.sh

CMD [ "./deployment/docker/run-app.sh" ]
