FROM node:20-alpine

WORKDIR /app
COPY index.html styles.css app.js server.js package.json ./

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["npm", "start"]
