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



# Use an official Node.js runtime as a base image
FROM node:20-alpine

RUN apk add --no-cache curl jq

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Copy the entire application to the working directory
COPY . .

# Expose the port that the application will run on
EXPOSE 4002

# Install application dependencies
RUN npm install

RUN npm run build

RUN chmod +x fetch_env_from_vault.sh

ARG ENV=dev

ENV ENV=$ENV

CMD ["sh", "-c", "if [ \"$ENV\" = \"prod\" ]; then npm run start:prod; else sh fetch_env_from_vault.sh && npm run start:prod; fi"]
