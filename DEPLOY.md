# 2048 正式发布最简流程

这个项目已经按 Render Web Service 准备好了：

- `npm start` 启动 `server.js`
- `/api/health` 用作健康检查
- `SCORES_FILE=/var/data/scores.json` 把排行榜写到持久磁盘
- `render.yaml` 会自动配置 Node 服务、Singapore 区域、持久磁盘和自动部署

## 你要做的事

1. 把整个目录推到一个 GitHub 仓库。
2. 打开 Render Dashboard，选择 New -> Blueprint。
3. 连接这个 GitHub 仓库。
4. Render 会读取 `render.yaml`，确认创建 `public-2048-leaderboard`。
5. 等部署完成，打开 Render 给你的 `https://...onrender.com` 地址。

## 重要选择

排行榜要长期保存，必须有持久存储。Render 的持久磁盘需要付费 Web Service；这个项目的 `render.yaml` 已经选了 `starter` 计划和 1GB 磁盘。

如果你只想先免费试跑，可以临时把 `render.yaml` 里的 `plan: starter` 和整个 `disk:` 块删掉，但每次服务重启或重新部署后，排行榜数据可能丢失。

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

排行榜 API：

```bash
curl http://localhost:4173/api/leaderboard
```

## 后续增强

现在的版本适合正式分享和小范围活动。它有基础限流和输入校验，但没有强防作弊；如果要办严肃比赛，下一步建议把每局随机种子和移动回放发到服务端校验，再接受分数。
