module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
    sourceType: "module"
  },
  plugins: ["@typescript-eslint", "react", "react-hooks"],
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  settings: {
    react: {
      version: "detect"
    }
  },
  rules: {
    "react/react-in-jsx-scope": "off",
    "@typescript-eslint/no-misused-promises": ["error", { "checksVoidReturn": false }],
    "@typescript-eslint/no-base-to-string": "off"
  },
  overrides: [
    {
      files: ["src/**/__tests__/**", "tests/e2e/**"],
      rules: {
        "@typescript-eslint/require-await": "off",
        "@typescript-eslint/no-unsafe-return": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-unsafe-member-access": "off",
        "@typescript-eslint/no-unsafe-assignment": "off",
        "@typescript-eslint/no-floating-promises": "off"
      }
    }
  ]
};
