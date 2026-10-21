const path = require('path');

module.exports = {
  entry: './src/entry.js',
  mode: 'production',
  output: {
    path: path.resolve(__dirname, 'dist/public'),
    filename: 'bundle.js',
  },
};