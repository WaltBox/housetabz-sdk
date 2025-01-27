const path = require('path');

module.exports = {
  mode: 'development',  // Let's explicitly set mode
  entry: './src/core/index.ts',  // This points to our TypeScript file
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
  output: {
    filename: 'housetabz.min.js',
    path: path.resolve(__dirname, 'dist'),
  }
};