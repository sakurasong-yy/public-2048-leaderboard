# 2048 Railway 发布最简流程

这个项目已经按 Railway 准备好了：

- `npm start` 启动 `server.js`
- `/api/health` 用作健康检查
- `railway.json` 会告诉 Railway 用 `npm start` 启动，并检查 `/api/health`
- 绑定 Volume 后，服务会自动把排行榜写到 `RAILWAY_VOLUME_MOUNT_PATH/scores.json`

## 你要做的事

1. 打开 Railway 的 GitHub 新建页。
2. 选择 GitHub 仓库 `sakurasong-yy/public-2048-leaderboard`。
3. 选择 Deploy Now，等待构建完成。
4. 在服务的 Settings -> Networking -> Public Networking 里点 Generate Domain。
5. 打开 Railway 给你的 `https://...railway.app` 地址。

## 重要选择

排行榜要长期保存，必须给服务添加一个 Railway Volume。Volume 的 mount path 建议填 `/data`；代码会自动读取 Railway 提供的 `RAILWAY_VOLUME_MOUNT_PATH`，不需要你手动配置环境变量。

如果你只想先试跑，不加 Volume 也能打开游戏，但每次服务重启或重新部署后，排行榜数据可能丢失。

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
