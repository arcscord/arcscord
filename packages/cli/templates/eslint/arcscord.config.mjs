import antfu from "@antfu/eslint-config";

export default antfu(
  {
    type: "app",
    stylistic: {
      quotes: "double",
      semi: true,
    },
    typescript: true,
  },
);
