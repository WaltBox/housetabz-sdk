const path = require('path');

module.exports = {
  entry: './src/core/index.ts',
  output: {
    filename: 'housetabz.min.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'HouseTabz',
    libraryTarget: 'window',
    libraryExport: 'default'
  },
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
};