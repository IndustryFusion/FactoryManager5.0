# 
# Copyright (c) 2024 IB Systems GmbH 
# 
# Licensed under the Apache License, Version 2.0 (the "License"); 
# you may not use this file except in compliance with the License. 
# You may obtain a copy of the License at 
# 
#    http://www.apache.org/licenses/LICENSE-2.0 
# 
# Unless required by applicable law or agreed to in writing, software 
# distributed under the License is distributed on an "AS IS" BASIS, 
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. 
# See the License for the specific language governing permissions and 
# limitations under the License. 
# 




# Use the official lightweight Node.js 16 image.
# https://hub.docker.com/_/node
FROM node:20-alpine

# Create and change to the app directory.
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image.
# A wildcard is used to ensure both package.json AND package-lock.json are copied.
# Copying this separately prevents re-running npm install on every code change.
COPY package*.json ./

# Install production dependencies.
RUN npm i --legacy-peer-deps

# Copy local code to the container image.
COPY . .

# Open the desired port
EXPOSE 3002

ARG ENV=dev
# Conditionally copy the correct environment file based on ENV
RUN if [ "$ENV" = "dev" ]; then \
    cp .env.development .env.local; \
  else \
    cp .env.production .env.local; \
  fi
# Run the build (always)
RUN npm run build
# Start the application (production start command)
CMD ["npm", "run", "start"]
