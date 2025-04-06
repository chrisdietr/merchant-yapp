module.exports = {
  apps: [{
    name: 'merchant-yapp',
    script: 'server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production'
    },
    exp_backoff_restart_delay: 100
  }]
}; 