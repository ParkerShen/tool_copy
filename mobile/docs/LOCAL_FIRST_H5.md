# 本地全栈记账 H5（iPhone 自用）

这套方案把「页面 + 接口 + 数据库」全部放进同一个 H5 页面，在 iPhone 上运行：

```
iPhone Safari / 主屏幕 PWA
└── H5 页面（uni-app Vue 3）
    ├── src/api/bookkeeping/index.ts   接口门面（local / remote 切换）
    ├── src/api/bookkeeping/local.ts   本地接口（与 serveradmin 语义一致）
    ├── src/api/bookkeeping/sql.ts     SQLite 表结构与增删改查
    ├── src/api/bookkeeping/db.ts      sql.js 加载、写队列、持久化
    └── IndexedDB                      保存 SQLite 数据库文件（.sqlite 字节）
```

- 记账接口不再发起网络请求，返回结构与原服务端一致：`{ code: 200, data }`。
- 数据库使用 SQLite（通过 WebAssembly 运行），文件保存在浏览器的 IndexedDB 中。
- `serveradmin` 不参与手机端运行。iOS 不允许普通 App 在后台长期运行 Node/MySQL，
  因此把接口逻辑移植进页面、把 MySQL 换成 SQLite 是能真正“只带手机”的方案。
- 除了记账外，首页为本地总览，并提供「标签日记」入口（静态页随 H5 一起打包）；倒数日仍是占位页。

### 记账录入与列表快捷编辑

- 新建页上方是分类网格（支出/收入切换、可新建分类），下方是数字键盘：
  `7 8 9 [日期]` / `4 5 6 +` / `1 2 3 −` / `. 0 ⌫ 完成`；
- 金额支持加减算式，保存时按整数「分」计算；日期键直接选日期，
  当天显示「今天」，其他日期显示 `M/D`；
- 备注、图片、标签在同一页填写：图片最多 3 张（自动压缩后存进 SQLite），
  标签最多 5 个，可从历史标签里直接选；
- 列表页可以直接改：点分类图标换分类、点备注就地编辑、点金额弹出键盘改金额和日期；
  长按记录仍是「编辑 / 删除」菜单，点行的其他位置进入完整编辑页；
- 默认账户可切换：在「账户管理」点某个账户 →「设为默认账户」，
  也可以在新建页直接换账户（会自动记住）；系统账户「现金」不能归档或删除。

### 标签日记入口

首页「工具」区最后一张卡片是「标签日记」，点击后打开随 H5 打包的
`/static/tag-diary/index.html?from=mobile`：

- 与主应用同源，数据保存在同一个 localStorage（key：`tag-diary:data:v1`）；
- 页面按手机 App 重做：白色主题，底部「记录 / 时间线 / 日志 / 日历」四个标签页，
  按钮和日历格不小于 44px，输入框 16px 字号（避免 iPhone 聚焦时自动放大）；
- 顶部右侧提供「← 返回应用」按钮；
- 标签日记源码在 `daylife/tag-diary/`，构建时由 `scripts/copy-tag-diary.mjs`
  自动复制到 `src/static/tag-diary/`；也可以单独执行 `pnpm sync:tag-diary`。

## 一、编译

```bash
cd mobile
pnpm install
pnpm build:h5:standalone
```

产物在 `mobile/dist/build/h5/`，包含：

- `index.html`
- `manifest.webmanifest`（PWA 清单）
- `sw.js`（Service Worker，HTTPS 下可离线）
- `static/sql/sql-wasm.js`、`static/sql/sql-wasm.wasm`（SQLite WASM）
- `static/tag-diary/`（标签日记静态页）

> `pnpm prepare:sqljs` 会把 sql.js 的浏览器运行时复制到 `src/static/sql/`，
> `build:h5:standalone` 会自动执行，一般不需要手动运行。

### 上传前自检

`build:h5:standalone` 现在会依次执行：

1. 复制 sql.js 运行时；
2. 复制标签日记静态页；
3. 运行 SQL 层单元测试（失败则停止，不产出半成品）；
4. 构建 H5；
5. 生成 PWA manifest 和 Service Worker；
6. **上传前自检**。

自检会检查：

- 必需文件是否齐全（`index.html`、`sw.js`、`sql-wasm.wasm` 等）；
- 发布目录里是否混入了个人数据或测试文件
  （`.json`、`.zip`、`.sqlite`、`.sql`、`.map`、文件名含 test/backup/副本等）；
- 产物里是否出现账本导入文件、私钥等敏感内容；
- `index.html` 引用的资源是否都存在；
- `manifest.webmanifest` 是否合法、图标是否存在；
- `sw.js` 的预缓存列表是否全部存在、是否包含 SQLite WASM；
- 产物体积是否异常。

任何一项不通过都会以非零退出码结束，并提示「请不要上传」。
构建完成后想再单独检查一次：

```bash
pnpm check:h5
```

也可以直接看终端最后一行：出现「通过：可以上传 dist/build/h5」才上传。

## 二、在局域网内用 iPhone 打开

1. 电脑和 iPhone 连接同一个 Wi-Fi。
2. 启动静态服务器：

   ```bash
   cd mobile
   pnpm serve:h5
   ```

   终端会打印类似：

   ```
   本机: http://localhost:8080
   局域网:
     http://192.168.1.23:8080
   ```

3. 在 iPhone Safari 中打开打印出来的局域网地址（不是 `localhost`）。
4. 点 Safari 的「分享」→「添加到主屏幕」，之后从桌面图标打开。

注意：

- 局域网 HTTP 不是安全上下文，此模式下 Service Worker 不生效，**断网无法打开**，
  但记账数据仍然保存在浏览器里，不影响使用。
- Windows 首次启动服务器时，防火墙弹窗请选择「允许访问」。
- 电脑关机或换网络后，原地址会失效，需要用新地址访问；**不同 origin（地址）之间数据不互通**。

## 三、HTTPS 托管（可离线 + 可添加到主屏幕）

HTTPS 下 Service Worker 才会注册，首次打开后即可离线使用。

### 当前方案：Cloudflare Workers 静态资源

1. Cloudflare Dashboard → Workers & Pages → Create → Upload your static files。
2. 上传 `mobile/dist/build/h5` **文件夹**（不是上一级 `dist`）。
3. 得到 `https://xxxx.workers.dev`，iPhone Safari 打开一次。
4. 分享 → 添加到主屏幕。

> 免费托管只承载静态文件，不保存你的记账数据；数据仍然只存在 iPhone 的浏览器里。
> 更新版本后重新上传即可，先刷新页面一次让新 Service Worker 生效。

### 国内网络打不开 `*.workers.dev`

`workers.dev`、`pages.dev` 在中国大陆常被 DNS 污染/阻断，必须挂代理才能访问。
解决办法是给同一个 Worker 绑定一个自己的域名：

1. 在阿里云/腾讯云等注册商购买域名（`.top`、`.xyz` 首年通常十几元），完成实名认证。
2. 登录 Cloudflare → **Add a site** → 输入域名 → 选 Free 计划。
3. 到域名注册商的 DNS 设置里，把 NS 改成 Cloudflare 给的两个地址，等待生效。
4. 回到 Workers & Pages → 该项目 → **Settings → Domains & Routes → Add → Custom domain**，
   填入 `book.你的域名.com`，Cloudflare 会自动签发证书。
5. 以后统一用 `https://book.你的域名.com` 访问，国内网络可直连，不需要代理。

> 绑定自定义域名后会变成**新的 origin**，旧 `workers.dev` 上的账本不会跟过来。
> 切换前先在旧地址导出 `.sqlite`，到新地址再导入。
> 国内对 Cloudflare 的连接质量因运营商而异；如果仍然很慢，见下面「国内托管」。

### 其他免费选择

- **Netlify Drop**：<https://app.netlify.com/drop>，拖入 `dist/build/h5`，
  得到 `https://xxxx.netlify.app`。国内可访问性不稳定，需实际测试。
- **Cloudflare Pages**：Workers & Pages → Create → Pages → Upload assets，
  行为与 Workers 静态资源相同，`*.pages.dev` 在国内同样可能被阻断。

上传过一次之后，电脑可以关机、断网，手机照样使用（首次打开后已离线缓存）。
只有「改动代码并更新功能」时才需要再次打开电脑重新编译和上传。

构建产物已经打包成 `mobile/dist/local-bookkeeping-h5.zip`（`index.html` 在压缩包根目录），
Netlify Drop / Cloudflare Pages 可直接上传这个 zip，不必逐个拖文件。

> 匿名使用 Netlify Drop 创建的站点是临时的、可能被回收。建议注册免费账号并
> 「Claim」这个站点，固定域名后数据才能长期保存在同一个 origin 下。
> 该 zip 只含页面代码，不包含任何账本数据。

## 四、迁移 serveradmin 里的原有数据

原有 MySQL 数据（2026-10-17 导出的 `xin_20261017.sql`）已经转换成 App 可直接导入的 JSON：

```
mobile/dist/bookkeeping-import-from-xin.json
```

包含：

- 2015-02-25 ~ 2026-10-17 的 10,076 条有效记录（软删除的 500 条已排除）；
- 14 个分类（餐饮、交通、购物、娱乐、居家、医疗、通讯、美容、学习、其他支出、
  工资、奖金、理财、其他收入）；
- 累计收入 ¥1,835,311.09，累计支出 ¥1,838,048.29；
- 1,195 条负数支出（退款/冲正）按原样保留。

导入步骤（在 iPhone 上）：

1. 把 `bookkeeping-import-from-xin.json` 发到 iPhone（AirDrop、微信文件传输、
   存到「文件」App 均可）。
2. 打开 App →「我的」→「导入备份」→ 选择该 JSON 文件。
3. 确认「导入」后等待完成（约 0.1 秒），页面会显示 10,076 条记录。

> 导入会整体替换本地数据库。导入前会自动生成一份「操作前自动快照」，
> 如果导错了，可在「本机自动快照」里一键恢复。
> `bookkeeping-import-from-xin.json` 含个人财务数据，**不要**上传到公开托管目录。

## 五、数据备份与恢复

入口：「我的」→ 数据备份。

**一次导出就包含所有工具的数据**，不需要每个工具分开导出：

- **导出 SQLite 数据库**：生成 `.sqlite` 文件，包含记账数据库和标签日记
  （标签日记存放在 `app_tool_data` 表），可原样恢复。iPhone 上会优先调起系统分享
  （存到「文件」或发给自己）；不支持时自动下载。
- **导出 JSON 备份**：可读文本，包含记账数据和 `tools.tagDiary`；
  记录里还包含备注、图片（data URL）和标签。
- 两种格式都**不包含 DeepSeek API Key**。
- **导入备份**：支持 `.sqlite`、`.db`、`.json`。导入会**整体替换**当前记账数据库；
  如果备份中包含标签日记，也会一并恢复。建议先导出备份（导入前会自动生成快照）。
- **清空所有记账数据**：二次确认后清空记录，保留默认分类（清空前自动生成快照）；
  标签日记不受影响。

### 本机自动快照

数据平时保存在 IndexedDB，App 会自动在**本机**留快照：

- 每天第一次打开且已有记录时，保存一份「每日自动快照」，最多保留最近 7 天；
- 导入、恢复、清空等危险操作前，保存一份「操作前自动快照」，最多保留 3 份；
- 也可以点「立即快照」手动保存，最多保留 5 份；
- 快照同样会带上当时的标签日记，恢复快照时一起恢复。

快照能防止误删、误导入，但它和主数据库在**同一个浏览器**里，
无法防止清理 Safari 网站数据、删除主屏幕图标或 iOS 回收存储。
所以仍然需要定期导出 `.sqlite` 到「文件」或 iCloud。

### 导出提醒

超过 7 天没有导出过备份时，打开 App 会弹出「该备份了」提示，可直接跳到「我的」页导出。
选择「稍后」会在 3 天后再次提醒。

数据风险：

- 清理 Safari 网站数据、删除主屏幕图标、iOS 存储空间不足时，浏览器可能清除 IndexedDB。
- 更换访问地址（例如电脑 IP 变化、换托管域名）会变成新的 origin，看不到旧数据。
- 建议固定使用一个 HTTPS 域名，并定期导出 `.sqlite` 备份。

## 六、更新功能到手机

代码更新必须在电脑上重新编译，手机只负责打开新版本。
**数据不在代码里**，所以更新代码不会影响已有账本，前提是访问地址（origin）保持不变。

```bash
cd mobile
pnpm build:h5:standalone
```

然后按使用方式上传：

- **Cloudflare Workers（当前方案）**：
  1. Workers & Pages → 打开原项目（如 `spring-smoke-7f03`）；
  2. 右上角 **New deployment** → **Upload static files**；
  3. 把 `dist/build/h5` 文件夹拖进去，点 **Deploy**，等状态变为 **Ready**；
  4. iPhone 打开 App，**下拉刷新一次**；仍显示旧界面时，从后台划掉 App 再打开。
  地址保持不变，账本不受影响。
- **Netlify**：重新拖入 `dist/build/h5` 覆盖部署，手机下拉刷新。
- **局域网**：电脑上重新 `pnpm serve:h5`，手机重新打开地址并下拉刷新。

> zip 只是方便上传的打包形式（`dist/local-bookkeeping-h5.zip`，`index.html` 在根目录）。
> Cloudflare 的静态资源上传目前要求文件夹，直接把 `dist/build/h5` 拖进去即可。

更新后如果界面没变化：

1. 完全关闭主屏幕 App 再打开；
2. Safari 中打开同一地址并下拉刷新；
3. 仍不生效时，在 Safari 设置里清除该网站数据会**同时清掉账本**，
   所以不要用它来更新——先导出 `.sqlite`，更新完再导入。

**不要做的事**：

- 不要更换访问地址或托管域名（例如 `xxx.netlify.app` 换成另一个域名），
  浏览器按 origin 隔离 IndexedDB，换地址后会看到空账本；
- 不要在没导出备份的情况下删除主屏幕图标或清理 Safari 网站数据。

## 七、验证与排查

```bash
# 单元测试：直接在 Node 中用真实 sql.js 跑 SQL 层
pnpm test:local-data

# 构建产物检查
ls dist/build/h5
```

常见问题：

| 现象 | 原因 / 处理 |
| --- | --- |
| 页面一直空白 | 确认 `static/sql/sql-wasm.js` 与 `.wasm` 已随构建输出；检查网络面板是否 404 |
| 数据刷新后消失 | 可能处于无痕模式或 IndexedDB 不可用，「我的」页会出现黄色提示 |
| 添加到主屏幕后没有图标 | `apple-touch-icon` 使用 `static/tabbar/bookkeeping_active.png`，确认该文件存在 |
| 离线打不开 | 局域网 HTTP 不支持 Service Worker，需使用 HTTPS 托管 |
| 换地址后数据不见 | 浏览器按 origin 隔离数据，请在原地址访问或从备份导入 |
| `*.workers.dev` 打不开 | 国内 DNS 阻断，给 Worker 绑定自己的域名（见第三节） |
| 更新后仍是旧界面 | 下拉刷新一次；仍不行则从后台划掉 App 再打开 |

## 八、关于原生 iOS 体验版

如果仍想要真正的原生安装包（IPA / TestFlight）：

- 需要 Apple Developer 账号（付费）和签名证书；
- 在 HBuilderX 中配置 iOS 证书后进行云打包；
- Windows 无法在本地直接生成可安装的 IPA。

当前 H5 + 主屏幕方案不需要 Mac、不需要开发者账号，满足个人自用需求。
