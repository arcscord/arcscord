const path = require("node:path");

module.exports = function babelConfig(api) {
  const isServer = api.caller(caller => caller?.name === "server");
  const runtimePath = path.dirname(require.resolve("@babel/runtime/package.json"));

  return {
    presets: [
      [
        require.resolve("@babel/preset-env"),
        isServer
          ? {
              modules: false,
              targets: {
                node: "current",
              },
            }
          : {
              corejs: "3",
              exclude: ["transform-typeof-symbol"],
              loose: true,
              modules: false,
              useBuiltIns: "entry",
            },
      ],
      [
        require.resolve("@babel/preset-react"),
        {
          runtime: "automatic",
        },
      ],
      require.resolve("@babel/preset-typescript"),
    ],
    plugins: [
      [
        require.resolve("@babel/plugin-transform-runtime"),
        {
          absoluteRuntime: runtimePath,
          corejs: false,
          helpers: true,
          regenerator: true,
          useESModules: true,
          version: require("@babel/runtime/package.json").version,
        },
      ],
      require.resolve("@babel/plugin-syntax-dynamic-import"),
    ],
  };
};
