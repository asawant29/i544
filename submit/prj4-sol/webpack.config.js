const BASE_CONFIG = {
  module: {
    rules: [
      { test: /\.jsx$/,
	exclude: /node_modules/,
	use: [
	  'babel-loader',
	],
      },
      // { test: /\.(png|svg|jpg|gif)$/,
      //   use: [
      //      'file-loader',
      //    ],
      // },      
    ],
  },
};

const DEVEL_CONFIG = {
  devServer: {
    stats: 'errors-only',
    port: process.env.PORT,
    //open: true,
    overlay: true,
    contentBase: './dist',
  },

  devtool: 'eval-source-map',
};

if (process.env.NODE_ENV === 'production') {
  const TerserPlugin = require("terser-webpack-plugin");
  const PROD_CONFIG = {
    optimization: {
      minimizer: [new TerserPlugin({sourceMap: false})],
    },
  };

  module.exports = Object.assign({}, BASE_CONFIG, PROD_CONFIG);
    
}
else {
  module.exports = Object.assign({}, BASE_CONFIG, DEVEL_CONFIG);
}
