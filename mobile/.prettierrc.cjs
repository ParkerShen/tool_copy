// @see https://prettier.io/docs/en/options
module.exports = {
  // 结尾添加分号
  semi: true,
  // 使用单引号 (true:单引号;false:双引号)
  singleQuote: false,
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: false,
  trailingComma: "all",
  endOfLine: "auto",
  htmlWhitespaceSensitivity: "ignore",
  overrides: [
    {
      files: "*.json",
      options: {
        trailingComma: "none",
      },
    },
  ],
};
