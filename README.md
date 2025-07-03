## ⚙️ 环境

- node>=18
- pnpm>=7.30

### 安装、运行

```bash [pnpm]
pnpm i
pnpm dev
# dev默认运行的是h5，其他平台执行dev:<uni-platform>，如:
pnpm dev:mp-weixin
```

`pnpm dev` 之后在浏览器打开 `http://localhost:9000/`。

### 第一次 `commit`

```bash
git add .
git commit -m "feat: init project"

# 如果需要跳过检查，执行
git commit -m '跳过检查' --no-verify
```

### `v3` 代码块

在 `vue` 文件中，输入 `v3` 按 `tab` 即可快速生成页面模板，可以大大加快页面生成。

> 原理：基于 `VSCode` 代码块生成。

## 📄 License

[MIT](https://opensource.org/license/mit/)

Copyright (c) 2024 影诺智能
