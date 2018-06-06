const path = require('path')
const resolve = (...args) => path.resolve(__dirname, ...args)
const isProd = process.env.NODE_ENV === 'production'

module.exports = {
  mode: isProd ? 'production' : 'development',
  devtool: isProd ? 'none' : 'source-map',
  entry: './src/main.js',
  output: {
    path: resolve('dist'),
    filename: 'bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: 'babel-loader'
      }
    ]
  }
}