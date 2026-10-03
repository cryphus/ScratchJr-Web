// webpack.config.js
const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
// const BundleAnalyzerPlugin =
//   require("webpack-bundle-analyzer").BundleAnalyzerPlugin;

module.exports = {
  entry: "./src/app/appEntry.js",
  mode: "development",
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true, // Remove console.log statements
            collapse_vars: true,
            reduce_vars: true,
          },
          output: {
            comments: false,
          },
        },
      }),
    ],
  },
  // plugins: [new BundleAnalyzerPlugin()],
  plugins: [
    new HtmlWebpackPlugin({
      template: "src/index.html",
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: "src/app/css", to: "css" },
        { from: "src/app/assets", to: "assets" },
        { from: "src/app/localizations", to: "localizations" },
        { from: "src/app/pnglibrary", to: "pnglibrary" },
        { from: "src/app/sounds", to: "sounds" },
        { from: "src/app/svglibrary", to: "svglibrary" },
        { from: "src/app/media.json", to: "media.json" },
        { from: "src/app/settings.json", to: "settings.json" },
        { from: "src/web/app.webmanifest", to: "app.webmanifest" },
        { from: "src/web/sw.js", to: "sw.js" },
        { from: "src/web/.nojekyll", to: ".nojekyll", toType: "file" },
      ],
    }),
  ],
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist"),
    publicPath: "auto",
    clean: true,
  },
  devServer: {
    static: {
      directory: path.join(__dirname, "dist"),
    },
    compress: true,
    port: 3002,
  },
  devtool: "eval-source-map",
};
