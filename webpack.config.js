const slsw = require('serverless-webpack');
const nodeExternals = require('webpack-node-externals');

const ESLintPlugin = require('eslint-webpack-plugin');

const myEslintOptions = {
  extensions: ['js', 'ts', '.jsx'],
  exclude: ['node_modules'],
};

module.exports = {
  entry: slsw.lib.entries,
  externals: [nodeExternals()],
  target: 'node',
  mode: slsw.lib.webpack.isLocal ? 'development' : 'production',
  resolve: {
    extensions: ['.js', '.ts', '.jsx'],
  },
  plugins: [new ESLintPlugin(myEslintOptions)],
  optimization: {
    // We no not want to minimize our code.
    minimize: !slsw.lib.webpack.isLocal,
  },
  performance: {
    // Turn off size warnings for entry points
    hints: slsw.lib.webpack.isLocal ? 'warning' : false,
  },
  module: {
    rules: [
      {
        test: /\.ts(x?)$/,
        exclude: /node_modules/,
        loader: 'ts-loader',
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: 'babel-loader',
      },
      {
        test: /\.jsx$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-react'],
          },
        },
      },
    ],
  },
};
