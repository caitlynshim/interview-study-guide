module.exports = {
  presets: ['@babel/preset-env', '@babel/preset-react'],
  // For Jest: transpile ESM modules like react-markdown
  overrides: [
    {
      test: /node_modules[\\/]react-markdown[\\/]/,
      presets: ['@babel/preset-env', '@babel/preset-react'],
    },
  ],
};
