# 部署清单（TinaCloud + Vercel）

本文件是「本地已完成 → 上线」的逐步操作手册。本地实现与验证已于仓库内完成并通过测试，
剩下的是需要**你本人操作**的账号/仓库授权步骤。

---

## 0. 当前状态

- [x] 本地可构建、可编辑、可预览（`npm run build:local` 通过，9 个静态路由）
- [x] 可视化编辑器可插入自定义交互组件（浏览器自动化测试 16/16 通过）
- [x] 站点页面可视化编辑 + 点击跳转字段（5/5 通过）
- [x] 交互组件在静态产物中可用（10/10 通过）
- [x] 草稿不外泄：`draft: true` 不预渲染、不可访问（`npm run smoke:draft` 14/14 通过）
- [x] 内容门禁：MDX 解析失败（属性拼错、类型不符、组件名小写）会让构建失败
- [x] 构建前置检查：凭据缺失/占位符时直接失败并给出提示
- [x] `tina-lock.json` 与 `tina/config.ts` 已核对同步（重新生成后逐字节一致）
- [ ] TinaCloud 项目创建并拿到 Client ID / Read Only Token ← **需要你**
- [ ] GitHub 仓库推送 ← **需要你**
- [ ] Vercel 导入与环境变量配置 ← 拿到上面两项后我可以带你做

> 说明：TinaCloud 项目创建必须经过**交互式 GitHub OAuth 授权**（选择仓库、配置 Site URL），
> 没有可用的无头/API 路径，所以这一步只能由你本人完成。

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

> **顺序很重要**：先做这一步，再导入 Vercel。`npm run build` 会连 TinaCloud 做一串云端校验
> （token/project 校验 → 触发索引同步 → 等数据库 ready → 比对远端 schema 与 lock 文件），
> 任何一步失败都会让构建以 `ERR_CLOUD_CHECK_FAILED` 退出。本地先跑一遍，能把失败原因看清楚，
> 而不是在 Vercel 日志里猜。

```bash
node scripts/check-env.mjs --strict   # 应为 ✔
npm run build                          # 不带 --skip-cloud-checks
```

### 两个容易踩的云端前置条件

1. **`main` 分支必须已在 TinaCloud 建好索引**。TinaCloud 项目刚创建时索引可能还没完成，
   此时构建会报 `Branch 'main' is not on TinaCloud` 或
   `Attempting to index but responded with status 'unknown'`。
   → 到 TinaCloud 项目配置里点该分支的 **Reindex**，等状态变成 complete 再构建。
2. **`tina/tina-lock.json` 只由 `tinacms dev` 生成，`tinacms build` 不会写它**。
   所以改了 `tina/config.ts` 之后必须跑一次 `npx tinacms dev`（让它生成 lock）再提交，
   否则云端会报 local/remote schema 不一致。
   `npm run check:env` 现在会检测「config.ts 比 tina-lock.json 新」并直接报错，避免踩这个坑。

---

## 5. Vercel 导入（你操作 + 我协助核对）

1. Vercel → Add New → Project → 导入 GitHub 仓库。
2. **Build Command**：保持 `npm run build`（`vercel.json` 已固定；内部依次执行
   `check-env --strict` → `tinacms build` → `verify-build-artifacts --strict` →
   `validate-content --strict` → `next build`）。
   > 如果 Vercel 自动检测成 `next build`，`/admin/index.html` 会 404 —— 必须改回。
   > `installCommand` 用 `npm ci`，保证依赖可复现。
3. **Environment Variables**（Production + Preview 都要加）：

   | 名称 | 值 | 说明 |
   | --- | --- | --- |
   | `NEXT_PUBLIC_TINA_CLIENT_ID` | Client ID | 会被烘焙进 admin 的 JS |
   | `TINA_TOKEN` | Read Only Token | 仅构建期使用，不会进前端产物 |
   | `NEXT_PUBLIC_TINA_BRANCH` | `main` | **建议显式设置**；见下方分支说明 |
   | `NEXT_PUBLIC_SITE_URL` | `https://<你的域名>` | 用于 sitemap / robots / RSS；不设则回退到 `VERCEL_PROJECT_PRODUCTION_URL`。**别写 localhost**，生产构建会直接失败 |

   > `TINA_TOKEN` 是敏感值，只放在 Vercel 环境变量里，不要提交到仓库。

### 分支（branch）怎么选

`tina/config.ts` 的解析顺序是
`NEXT_PUBLIC_TINA_BRANCH` → `VERCEL_GIT_COMMIT_REF` → `HEAD` → `'main'`。

- Vercel 提供的是 **`VERCEL_GIT_COMMIT_REF`**（没有 `NEXT_PUBLIC_` 前缀）。
- 不显式设置时，**预览部署**会取功能分支名；TinaCloud 若没索引该分支，构建直接失败
  （`Branch 'feature/x' is not on TinaCloud`）。
- 显式设成 `main` 则预览部署也能构建，但预览里的编辑器会**改到 main 分支**——
  所见并非该预览 URL 的内容。请按需要二选一，不要以为它是自动无害的。

4. Deploy。

---

## 6. 上线后验收（我操作）

1. `https://<域名>/admin/index.html` → 用 GitHub 登录 → 应能看到「博客文章」「独立页面」两个集合。
2. 打开一篇文章 → 正文里应能看到 5 个自定义组件（Callout / Counter / Tabs / Figure / VideoEmbed）
   → 在「插入组件」菜单里也能插入新的。
3. 修改并 Save → 应产生一次 GitHub 提交 → Vercel 自动重新部署。
   > `npm run smoke:save` 验证的是**本地写盘**；线上保存走的是 TinaCloud 提交，
   失败模式不同（token 权限、分支保护、Site URL 白名单），所以这一步必须真的在线上点一次。
4. 站点页面打开 `?edit=true` → 侧边栏编辑 + 点击区块跳转字段应可用。
5. **上传一张图片**并保存 → 确认提交里出现 `public/uploads/<文件>`，
   且在重新部署完成后能正常显示。
   > 仓库内媒体在构建产物里；保存后需要等这次重新部署完成，编辑器预览才会显示新图。
6. 检查 `https://<域名>/sitemap.xml`、`/robots.txt`、`/rss.xml` 中的地址是**你的域名**而不是 localhost。
   之后若绑定自定义域名，记得把 `NEXT_PUBLIC_SITE_URL` 改过去，否则这些文件仍指向 `.vercel.app`。

---

## 7. 可选优化（上线后）

- **防抖部署**：编辑器每次保存都会提交一次并触发 Vercel 构建。若嫌频繁，可按
  [官方 Vercel 指南](https://tina.io/docs/tinacloud/deployment-options/vercel) 配置
  Ignore Build Step 或 GitHub Actions 防抖（合并 5 分钟内的多次提交）。
- **搜索**：TinaCloud 提供托管搜索（需要 Search Token 与 `search.tina.indexerToken`）。
- **媒体**：目前用仓库内 `public/uploads`；若图片多，可换成 Cloudinary 等外部媒体库。
