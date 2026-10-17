# serveradmin

## 本地数据库准备（Windows）

后端的业务数据使用 MySQL，启动时会执行 Sequelize 同步，因此 **MySQL 是本地运行后端的必需依赖**。MongoDB 仅用于可选的日志持久化；开发环境默认关闭 MongoDB 日志，不安装 MongoDB 也可以启动后端。

### 1. 安装并启动 MySQL

1. 从 [MySQL Community Server Windows 安装文档](https://dev.mysql.com/doc/refman/8.4/en/windows-installation.html) 安装 MySQL Community Server。
2. 安装过程中选择以 Windows 服务运行，并设置 MySQL 管理员密码。
3. 启动服务后，在 PowerShell 中检查：

   ```powershell
   Get-Service *MySQL*
   Test-NetConnection 127.0.0.1 -Port 3306
   ```

4. 创建开发数据库和账号。下面的 SQL 只示例本地开发用途，请替换密码：

   ```sql
   CREATE DATABASE xin_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'xin'@'localhost' IDENTIFIED BY '123456';
   GRANT ALL PRIVILEGES ON xin_dev.* TO 'xin'@'localhost';
   FLUSH PRIVILEGES;
   ```

5. 导入项目提供的 `xin.sql`：

   ```powershell
   mysql -u xin -p xin_dev < .\xin.sql
   ```

   `xin.sql` 是表结构和数据导出文件，不会自动创建数据库；文件头标记的源数据库是 `xin`，而开发环境默认使用 `xin_dev`。

### 2. 可选：安装 MongoDB

只有需要把 warn/error 日志写入 MongoDB 时才需要安装。使用 [MongoDB Community Server Windows 安装文档](https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-windows/) 或 [Community Server 下载页](https://www.mongodb.com/try/download/community)，安装 MSI 时保留 **Install MongoD as a Service**，然后检查：

```powershell
Get-Service MongoDB
Test-NetConnection 127.0.0.1 -Port 27017
```

安装并启动 MongoDB 后，将对应环境文件中的 `MONGO_LOG_ENABLED` 改为 `true`。MongoDB 驱动的旧 `useUnifiedTopology` 参数已从代码中移除。

## 启动

从 `serveradmin` 目录执行：

```powershell
pnpm install
pnpm dev
```

默认读取 `.env.development`。PowerShell 中设置生产环境启动：

```powershell
$env:NODE_ENV = 'production'
pnpm build
pnpm start
```

PM2 启动生产环境时会设置 `NODE_ENV=production`：

```powershell
pnpm build
pm2 start ecosystem.config.js --env production
```

环境文件中的 `DB_HOST`、`DB_PORT`、`DB_NAME`、`DB_USER`、`DB_PASSWORD` 必须与本机 MySQL 配置一致。生产环境请使用独立的随机密钥和最小权限数据库账号，不要复用示例密码。

如果 MySQL 未启动，后端会明确报告连接地址并退出，不会误报服务已就绪；如果开发环境 MongoDB 未启动，控制台和文件日志仍可用。

## 常见检查

```powershell
Get-Service *Mongo*, *MySQL*
Test-NetConnection 127.0.0.1 -Port 3306
Test-NetConnection 127.0.0.1 -Port 27017
```

MySQL 服务文档：[Starting MySQL as a Windows service](https://dev.mysql.com/doc/refman/8.4/en/windows-start-service.html)。
