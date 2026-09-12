# 部署清单（TinaCloud + Vercel）

本文件是「本地已完成 → 上线」的逐步操作手册。本地实现与验证已于仓库内完成并通过测试，
剩下的是需要**你本人操作**的账号/仓库授权步骤。

---

## 0. 当前状态

- [x] 本地可构建、可编辑、可预览（`npm run build:local` 通过，9 个静态路由）
- [x] 可视化编辑器可插入自定义交互组件（浏览器自动化测试 16/16 通过）
- [x] 站点页面可视化编辑 + 点击跳转字段（5/5 通过）
- [x] 交互组件在静态产物中可用（10/10 通过）
- [x] 构建前置检查：凭据缺失/占位符时直接失败并给出提示
- [ ] TinaCloud 项目创建并拿到 Client ID / Read Only Token ← **需要你**
- [ ] GitHub 仓库推送 ← **需要你**
- [ ] Vercel 导入与环境变量配置 ← 拿到上面两项后我可以带你做

---

## 1. 推送到 GitHub（你操作）

```bash
cd "D:\deepseek harness\workspace"
git remote add origin https://github.com/<你的账号>/<仓库名>.git
git push -u origin main
```

**必须提交的文件**（否则 TinaCloud 无法索引 schema）：

- `tina/config.ts`
- `tina/tina-lock.json` ← 关键，已在仓库中跟踪
- `content/**/*.mdx`

**不应提交的文件**（已在 `.gitignore` 中排除）：`.env`、`tina/__generated__/`、`node_modules/`。
`public/admin/` 只跟踪它自带的 `.gitignore`，构建产物由 `tinacms build` 生成。

---

## 2. 创建 TinaCloud 项目（你操作）

1. 打开 https://app.tina.io 注册/登录。
2. 新建项目 → 授权 GitHub → 选择上面推送的仓库。
3. 配置页面填写：

   | 字段 | 建议值 | 说明 |
   | --- | --- | --- |
   | Project Name | 任意，如 `my-blog` | 仅显示用 |
   | Site URL（本地） | `http://localhost:3000` | TinaCMS 只允许在这些地址上工作 |
   | Site URL（生产） | `https://<你的域名>` | 只填 origin，不要带路径 |
   | Site URL（预览） | `https://<项目名>-*-<账号>.vercel.app` | 支持 glob，用于 Vercel 预览部署编辑 |

   > Site URL 是**安全白名单**：没配到的地址上编辑器不会工作。Vercel 预览域名必须用 glob 覆盖。

4. 记录两个值：
   - **Client ID**：Project → **Overview** 标签页
   - **Read Only Token**：Project → **Tokens** 标签页（默认会自动生成 Content / Read-only token）

---

## 3. 写入本地 `.env`（我操作，需要你把值发我）

```bash
NEXT_PUBLIC_TINA_CLIENT_ID=<Client ID>
TINA_TOKEN=<Read Only Token>
NEXT_PUBLIC_TINA_BRANCH=main
NEXT_PUBLIC_SITE_URL=https://<你的域名>
```

> ⚠️ 必须写在 `.env`：TinaCMS 的构建**只读 `.env`**，不读 `.env.local` / `.env.development`。
> 而 Next.js 两者都读，所以把凭据放 `.env` 对两边都有效。

## 4. 本地验证真实凭据（我操作）

```bash
node scripts/check-env.mjs --strict   # 应为 ✔
npm run build                          # 不带 --skip-cloud-checks，会校验 schema 与云端是否一致
```

这一步会验证 `tina-lock.json` 与 TinaCloud 索引的 schema 匹配。若有 mismatch，说明
`tina/config.ts` 改过但没重新生成 lock 文件，需要跑一次 `tinacms build` 并提交 `tina-lock.json`。

---

## 5. Vercel 导入（你操作 + 我协助核对）

1. Vercel → Add New → Project → 导入 GitHub 仓库。
2. **Build Command**：保持 `npm run build`（`vercel.json` 已固定；其中包含
   `check-env --strict` 与 `tinacms build`，确保 admin 被构建出来）。
   > 如果 Vercel 自动检测成 `next build`，`/admin/index.html` 会 404 —— 必须改回。
3. **Environment Variables**（Production + Preview 都要加）：

   | 名称 | 值 | 说明 |
   | --- | --- | --- |
   | `NEXT_PUBLIC_TINA_CLIENT_ID` | Client ID | 会被烘焙进 admin 的 JS |
   | `TINA_TOKEN` | Read Only Token | 仅构建期使用，不会进前端产物 |
   | `NEXT_PUBLIC_TINA_BRANCH` | `main` | 可选；也可用 Vercel 自动注入的 `VERCEL_GIT_COMMIT_REF` |
   | `NEXT_PUBLIC_SITE_URL` | `https://<你的域名>` | 用于 sitemap / robots / RSS；不设则回退到 `VERCEL_PROJECT_PRODUCTION_URL` |

   > `TINA_TOKEN` 是敏感值，只放在 Vercel 环境变量里，不要提交到仓库。

4. Deploy。

---

## 6. 上线后验收（我操作）

1. `https://<域名>/admin/index.html` → 用 GitHub 登录 → 应能看到「博客文章」「独立页面」两个集合。
2. 打开一篇文章 → 正文里应能看到三个自定义组件（Callout / Counter / Tabs）→ 在「插入组件」菜单里也能插入新的。
3. 修改并 Save → 应产生一次 GitHub 提交 → Vercel 自动重新部署。
4. 站点页面打开 `?edit=true` → 侧边栏编辑 + 点击区块跳转字段应可用。
5. 检查 `https://<域名>/sitemap.xml`、`/robots.txt`、`/rss.xml` 中的地址是**你的域名**而不是 localhost。

---

## 7. 可选优化（上线后）

- **防抖部署**：编辑器每次保存都会提交一次并触发 Vercel 构建。若嫌频繁，可按
  [官方 Vercel 指南](https://tina.io/docs/tinacloud/deployment-options/vercel) 配置
  Ignore Build Step 或 GitHub Actions 防抖（合并 5 分钟内的多次提交）。
- **搜索**：TinaCloud 提供托管搜索（需要 Search Token 与 `search.tina.indexerToken`）。
- **媒体**：目前用仓库内 `public/uploads`；若图片多，可换成 Cloudinary 等外部媒体库。
