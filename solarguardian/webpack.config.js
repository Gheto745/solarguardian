// webpack.config.js
const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function(env, argv) {
  // Get the default config
  const config = await createExpoWebpackConfigAsync(env, argv);
  
  // For SVG handling, let's use a simpler approach
  if (config.module && config.module.rules) {
    // Find the rules that handle SVG
    const svgRule = config.module.rules.find(r => 
      r.test && r.test.toString().includes('svg')
    );
    
    if (svgRule) {
      // Replace it with a simpler rule
      svgRule.test = /\.svg$/;
      svgRule.use = ['@svgr/webpack'];
    }
  }
  
  // Remove SVG-specific aliases as we'll handle SVG differently
  if (config.resolve && config.resolve.alias) {
    // Remove any problematic aliases
    const { 'react-native-svg': _, ...restAliases } = config.resolve.alias;
    config.resolve.alias = restAliases;
  }
  
  // Simplify dev server config to avoid validation errors
  if (config.devServer) {
    const { port, host, https } = config.devServer;
    config.devServer = {
      port,
      host,
      https,
      hot: true,
      historyApiFallback: true
    };
  }
  
  return config;
};