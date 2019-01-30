FROM node:8

# Create app directory
WORKDIR /usr/src/app

RUN apt-get update && apt-get install -y \
  bluetooth \
  bluez \
  libbluetooth-dev \
  libudev-dev \
  python3-pip

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm install --only=production

# Bundle app source
COPY . .

RUN pip3 install -r requirements.txt

# RUN cd noble/ && npm install && cd ..

EXPOSE 3000
CMD [ "npm", "start" ]
