# 新会话必读（给未来的我 / 其他 AI）

这是一个已上线的 Next.js 16 + TinaCMS 3 静态博客。本文件是**最短上手路径**，目的是让新会话不用重新摸索。
请先读完本文件，再读 `README.md` 的对应章节，然后直接动手。

> **要改样式？先读 [`STYLE-GUIDE.md`](./STYLE-GUIDE.md)。**
> 视觉语言、改哪里、不能碰什么、怎么验证、以及**已经踩过的坑**都在那里 ——
> 那是改样式的最短路径。完整的决策理由与实测数据在 `STYLE-DIRECTIONS.md`（当附录查）。

---

## 一、这个项目是什么

| 项 | 值 |
| --- | --- |
| 项目路径 | `D:\deepseek harness\workspace` |
| 框架 | Next.js 16.3.5（App Router）+ React 19 + TypeScript |
| 样式 | Tailwind CSS v4（`@tailwindcss/postcss` + typography） |
| CMS | TinaCMS 3.13.0 + TinaCloud |
| 线上域名 | https://yujingyao.com （也绑定在 TinaCloud Site URL 白名单里） |
| 部署 | Vercel，构建命令 `npm run build`（**不要改成 `next build`**） |
| 内容 | `content/posts/*.mdx`、`content/pages/*.mdx`，正文用 MDX |

**铁律（产品要求，不要违反）**：正文渲染只用 Tina 官方的 `<TinaMarkdown>`。
**不要**引入 `next-mdx-remote`、`@next/mdx` 或任何 MDX 编译管线。

---

## 二、必须先记住的一件事：新增组件要同步 4 处

这是本项目最容易出错的地方。漏掉任何一处，都不会有编译报错，但线上会出问题：

| # | 文件 | 加什么 | 漏了会怎样 |
| --- | --- | --- | --- |
| 1 | `tina/config.ts` → `richTextTemplates` | 模板定义（`name` 必须 **PascalCase**） | 编辑器「插入组件」菜单里没有它 |
| 2 | `src/components/tina-markdown.tsx` → `components` 映射表 | 与模板**同名**的条目 + `data-tina-field` 包裹 | 线上渲染成一行原始文本 |
| 3 | `scripts/validate-content.mjs` → `richTextField.templates` | 同样的模板定义 | 内容门禁会误报，构建失败 |
| 4 | `src/components/mdx/<name>.tsx` | 组件本体（需要交互就加 `'use client'`） | — |

### 还有两条硬约束

- **属性类型必须与模板字段类型一致**。声明为 `rich-text` 的字段不能当字符串属性传，
  否则**整篇正文**会退化成 `invalid_markdown` 节点（有渲染兜底，但内容等于废了）。
  嵌套富文本必须走 `children` 子节点。
- **组件名必须大写开头**。`<callout />` 会被 MDX 解析器当成原始 HTML，页面上原样显示。

参考实现：`Callout`（嵌套富文本 + 固定选项）、`Counter`（客户端状态 + localStorage）、
`Tabs`（对象列表 + ARIA）、`Figure`（image 字段 + 远程主机白名单）、`VideoEmbed`（白名单拼 URL）。

---

## 三、开发流程

```bash
npm install          # 首次
npm run dev          # 站点 3000 + 本地内容 API 4001；编辑器在 /admin/index.html
```

**本地不需要 TinaCloud 账号**，走的是本地文件内容 API。

### 改完必须验证

```bash
npm run typecheck    # tsc --noEmit，必须为 0
npm run build:local  # 完整本地构建 + 全部离线门禁
```

`build:local` 需要 `npm run dev` 正在运行（它要从本地 API 读内容）。
它会依次跑：内容校验 → `next build` → 运行时独立性 → 路由契约。

### 只改样式时

同样跑 `npm run typecheck` + `build:local`；涉及交互/布局改动的，跑一次浏览器测试：

```bash
npm install --no-save playwright   # 首次需要
npm run smoke                      # admin / visual / interaction / save / http
```

> ⚠️ `npm install`（不带 `--no-save`）会把 playwright 清掉，因为它是 `--no-save` 装的，
> 用之前重新装一次。

---

## 四、踩过的坑（别再踩）

1. **不要用 `tinacms dev --no-server` 启动本地 API** —— 它不启动 API，只重新生成 client。
2. **不要加 `--noWatch`** —— 会关闭内容监听。删改 `content/` 文件后索引可能不刷新，
   导致构建产物里出现过期内容；**遇到诡异现象先重启本地 API**（我踩过两次）。
3. **保存会重写整个文件**：Tina 用自家序列化器重写 `.mdx`（去引号、重排 JSX）。
   语义不变，但第一次 diff 很大，这是正常现象。
4. **新增远程图床要加白名单**：`src/lib/image-hosts.ts` 的 `ALLOWED_IMAGE_HOSTS`。
   不在白名单的远程图会让优化器返回 400、页面 200 但图裂——组件已做降级（用原始 `<img>`）
   并打印开发警告。
5. **Vercel 上 `NEXT_PUBLIC_SITE_URL` 已在环境变量里设为 `https://yujingyao.com`**。
   它控制 canonical / og / sitemap / RSS。**不要写进本地 `.env`**（`.env` 优先于 Vercel 变量）。
6. **本地 `.env` 里的占位符是故意的**，真实凭据只放在 Vercel 环境变量和你的本地 `.env` 中；
   `.env` 已 gitignore。

---

## 五、质量门禁一览（`npm run build` 里跑的）

顺序：`check:env --strict` → `tinacms build` → `check:artifacts --strict` →
`check:content --strict` → `next build` → `check:runtime` → `check:routes`

| 命令 | 作用 |
| --- | --- |
| `check:env` | Tina 凭据 / 站点地址是否可用（占位符会失败） |
| `check:artifacts` | 生成的 client 不能指向 localhost、admin 不能是 dev 版 |
| `check:content` | 用 Tina 官方解析器校验每篇正文，解析失败即阻断构建 |
| `check:runtime` | 正文已烘焙进 HTML、客户端包不含内容 API、路由是静态 |
| `check:routes` | 列表/首页/sitemap/RSS 发出的 URL 都有对应预渲染页面 |
| `test:unit` | 图片主机匹配 + 站点地址解析（离线，无需构建） |

> `check:runtime` 与 `check:routes` 在找不到构建产物时**会跳过并警告**（CI 文件系统可能只保留产物），
> `build:local` 会用 `--require-bundles` / `--require-artifacts` 强制它们真跑。

---

## 六、上线状态

**已全部完成并验证**：

- Vercel 部署成功，站点正常访问
- 自定义域名 `https://yujingyao.com`（Cloudflare DNS，**必须保持 DNS-only 灰云**）已生效
- TinaCloud Site URL 白名单已包含该域名
- **在线编辑并保存已真实验证过**（编辑器改动提交到 GitHub 并触发重新部署）
- 之前阻塞部署的 `check:runtime` / `check:routes` 路径假设问题已修复

## 七、历史记录（了解即可）

`PLAN-blog-tinacms-nextjs.md` 是当初的实施方案，其中的实测结论仍然有效；
功能盘点与后期优化方向在 `README.md` 与 `DEPLOYMENT.md`。
