const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const config = require('./node_modules/react-scripts/config/webpackDevServer.config');

const compiler = webpack(config);
const devServerOptions = {
  ...config,
  host: 'A-2SWW6K3',
  port: 3000,
  allowedHosts: 'all',
  headers: {
    'Access-Control-Allow-Origin': '*',
  },
};

const server = new WebpackDevServer(devServerOptions, compiler);

server.startCallback(() => {
  console.log('Dev server is running on http://A-2SWW6K3:3000');
}); 