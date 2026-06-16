# 璀璨宝石商会 Railway 发布流程

这个项目已经按 Railway 准备好：

- `npm start` 启动 `server.js`
- `/api/health` 用作健康检查
- `railway.json` 使用 Railpack 构建，并通过 `npm start` 启动
- 绑定 Volume 后，胜场榜会写到 `RAILWAY_VOLUME_MOUNT_PATH/scores.json`，牌局过程会写到 `RAILWAY_VOLUME_MOUNT_PATH/matches.json`

## 使用 Railway CLI

```bash
npm start
```

本地确认可用后：

```bash
railway login
railway init
railway up
railway domain
```

如果项目已经关联 Railway，可以跳过 `railway init`，直接执行 `railway up`。

## Railway 网页发布

1. 在 Railway 新建 Project。
2. 选择从当前 GitHub 仓库部署。
3. 确认 Start Command 为 `npm start`。
4. 确认 Healthcheck Path 为 `/api/health`。
5. 在 Networking 中生成公开域名。

## 持久化胜场榜

如果要长期保存胜场榜和每局过程档案，给服务添加一个 Railway Volume。Mount path 建议填 `/data`；代码会自动读取 Railway 提供的 `RAILWAY_VOLUME_MOUNT_PATH`，不需要额外环境变量。

不绑定 Volume 也能运行游戏，但服务重启或重新部署后，胜场数据和牌局过程可能丢失。

## 本地验证

```bash
npm start
```

然后打开：

```text
http://localhost:4173
```

健康检查：

```bash
curl http://localhost:4173/api/health
```

胜场榜 API：

```bash
curl http://localhost:4173/api/leaderboard
```
