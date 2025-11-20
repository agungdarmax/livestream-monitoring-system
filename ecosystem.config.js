module.exports = {
  apps: [
    {
      name: 'remarc-backend',
      cwd: '/home/remtech/livestream-project/backend',
      script: 'src/server.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: '/home/remtech/livestream-project/logs/backend-error.log',
      out_file: '/home/remtech/livestream-project/logs/backend-out.log',
      autorestart: true
    },
    {
      name: 'remarc-frontend',
      cwd: '/home/remtech/livestream-project/frontend',
      script: 'npm',
      args: 'start',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      error_file: '/home/remtech/livestream-project/logs/frontend-error.log',
      out_file: '/home/remtech/livestream-project/logs/frontend-out.log',
      autorestart: true
    }
  ]
}
