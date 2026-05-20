require('ts-node').register();
const config = require('./prisma/prisma.config.ts').default;
console.log(config);
