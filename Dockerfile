FROM node:8.11

RUN mkdir -p /foxtail

WORKDIR /foxtail

COPY package.json package.json

RUN npm install

COPY . .

EXPOSE 9000

CMD ["npm","run","prostart"]
