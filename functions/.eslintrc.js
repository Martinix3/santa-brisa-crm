module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "google",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["tsconfig.json", "tsconfig.dev.json"],
    sourceType: "module",
    ecmaVersion: 2021,
  },
  ignorePatterns: [
    "/lib/**/*", // Ignore built files.
  ],
  plugins: ["@typescript-eslint"],
  rules: {
    "quotes": ["error", "double"],
    "indent": "off",
    "require-jsdoc": "off", // Desactivado para no forzar JSDoc en todo.
    "no-unused-vars": "warn",
    "object-curly-spacing": ["error", "always"],
  },
};
