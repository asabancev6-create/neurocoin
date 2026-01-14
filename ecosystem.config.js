
module.exports = {
  apps: [{
    name: 'neurocoin-backend',
    script: 'server.js',
    // Options reference: https://pm2.io/doc/en/runtime/reference/ecosystem-file/
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      // !!! ВАЖНО: Замените на ваши реальные данные для production
      DB_URL: 'mongodb://localhost:27017/neurocoin',
      REDIS_URL: 'redis://localhost:6379'
    }
  }]
};
