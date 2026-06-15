# 成人钢琴前20课发布说明

现在浏览器里的 `file:///Users/bytedance/Documents/sakura.01/index.html` 只在本机可用。要让朋友访问，需要把页面发布到公网，拿到一个 `https://...` 链接。

这个项目是纯静态网页，也带了一个很轻量的 Node 静态服务器，所以有两种发布方式。

## 最推荐：GitHub Pages

适合：只想让朋友打开网页，不需要后端接口。

1. 把当前代码提交并推送到 GitHub。
2. 打开 GitHub 仓库页面。
3. 进入 `Settings` -> `Pages`。
4. `Build and deployment` 选择 `Deploy from a branch`。
5. `Branch` 选择主分支，目录选择 `/root`。
6. 保存后等待 1-2 分钟，GitHub 会生成一个公开地址。

如果继续使用当前远程仓库名，地址通常会类似：

```text
https://sakurasong-yy.github.io/public-2048-leaderboard/
```

如果你之后把仓库改名为 `adult-piano-curriculum`，地址会变成类似：

```text
https://sakurasong-yy.github.io/adult-piano-curriculum/
```

## 也可以：Render

适合：想继续用 Node 服务方式部署。

1. 在 Render 新建 `Web Service`。
2. 选择当前 GitHub 仓库。
3. Runtime 选择 `Node`。
4. Build Command 填：

```bash
npm install
```

5. Start Command 填：

```bash
npm start
```

6. Health Check Path 填：

```text
/api/health
```

Render 部署成功后会给一个 `https://xxx.onrender.com` 地址，发给朋友即可。

## 也可以：Railway

适合：已经习惯用 Railway 或已有 Railway 项目。

```bash
railway login
railway init
railway up
railway domain
```

如果项目已经关联 Railway，可以跳过 `railway init`，直接执行：

```bash
railway up
railway domain
```

生成的 Railway Domain 就是可以分享给朋友的公网地址。

## 本地确认

本地运行：

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
