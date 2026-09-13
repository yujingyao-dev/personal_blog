# 视觉改造备忘录（STYLE-DIRECTIONS）

> 这份文档既是**构思稿**，也是**可勾选的待办清单**。
> 每完成一项就把 `[ ]` 改成 `[x]`，并在「决策记录」里补一句为什么。
> 设计系统的唯一代码来源是 `src/app/globals.css` 的 `@theme` 块 —— 改样式前先看那里。

- 最后更新：2026-09-13
- 状态：**P0 / P1 / P2 全部处理完毕**（P2 有 3 项经判断后有意不做，理由见清单）
- 预览图：`style-preview-*-debug.png`（`*-debug.png` 已被 `.gitignore` 忽略，不会进仓库）

---

## 〇、长期规则（不要再讨论，照做即可）

> 这一节是用户明确拍板的规则，不是待办。**不要在未来某轮里"顺手改回去"。**

### R1 —— 移动端一律不加动效

**768px 以下：没有任何动画、没有任何过渡、没有视差、没有页面过渡。**

这条是性能结论驱动的，不是审美偏好。§7 实测：只要页面在动，就有一笔恒定的每帧开销
（4x 降频下约 **180 ms/s** 主线程），且与动几个元素、动什么属性基本无关。
手机视口像素只有桌面的 6%，开销却只便宜约 30% —— 手机 CPU 最弱、最不该承担这个。

改动它需要同时动**四处**，缺一处就会漏：

| # | 位置 | 作用 |
| --- | --- | --- |
| 1 | `globals.css` 的 `@media (width < 48rem)` | `* { animation: none; transition: none }`，管所有 CSS 动效 |
| 2 | `src/components/site/motion-provider.tsx` | `MotionConfig reducedMotion="always"`，管 Framer 的动画 |
| 3 | `src/components/site/use-no-motion.ts` | 唯一判据来源；**新增动效组件必须用它**，不能用 `useReducedMotion()` |
| 4 | 各组件里的 `max-md:animate-none` | 背景层那些持续动画的元素 |

> 为什么需要 2 和 3 两套：`MotionConfig` 管不到**直接被驱动的 MotionValue**
> （`useSpring` 之类）。文章页的阅读进度条和背景视差都属于这一类，
> 它们靠 `useNoMotion()` 换成常量才真正停下来。

**新增任何动效时，必须问一句：手机上它会不会跑？** 用 `useNoMotion()` 就不会。

### R1 的两道门禁（2026-09 补）

规则本身没有类型系统或构建能强制，所以加了两道互补的检查：

| 门禁 | 位置 | 能抓到什么 |
| --- | --- | --- |
| **源码门禁**（离线，9 条规则） | `scripts/unit-no-motion.mjs`，挂在 `npm run test:unit` | CSS 规则被删、`useReducedMotion` 被误用、MotionValue 驱动文件漏了 `useNoMotion()`、持续动画漏了 `max-md:animate-none`、无 `useNoMotion()` 的文件里出现无限 Framer 循环 |
| **运行时门禁**（浏览器） | `scripts/motion-smoke.mjs`，挂在 `npm run smoke:motion`（也已加入 `npm run smoke`） | **真正权威**：在 390px 下对每个路由做「定格比对」—— 拍一张全页 computed style 快照，等 800ms 再拍一张，**只要有任何东西变了就失败** |

> ⚠️ **运行时门禁里有一个反向对照**：同时在桌面宽度跑同一次比对，断言它**必须**检测到变化。
> 没有这个对照，一个永远比较两个空字符串的坏测试也会显示"通过"。

> ⚠️ **源码门禁有已知盲区**（实测确认）：它只能发现「整个文件根本没有 `useNoMotion()`」，
> 无法判断某个**具体**动画是否真的被那个调用门控住了。往一个已经调用 `useNoMotion()`
> 的文件里加一段未门控的无限透明度动画，源码门禁 9/9 通过，而运行时门禁会失败。
> 两者是互补的：源码门禁离线、能指出文件名；运行时门禁权威、但需要浏览器。**两个都要留。**

---


## 一、设计语言：三根支柱

| 支柱 | 具体做法 | 代码落点 |
| --- | --- | --- |
| **1. 毛玻璃** | 半透明填充 `bg-white/60` + `backdrop-blur-xl` + `backdrop-saturate-150` + 发丝高光边 | 各面板组件；`--shadow-glass*`（暂存未用） |
| **2. 大尺寸流动渐变几何** | 38–62rem 的大图形 + 四色渐变 + `background-position` 流动 + 缓慢自转/形变（周期 32–118s） | `src/components/site/backdrop.tsx` |
| **3. Neo-Brutalism** | 硬描边 `--color-ink`/`--color-chalk` + 零模糊硬偏移投影 `--shadow-brutal-*` + `font-black` 超粗标题 + 贴纸胶囊 + 手绘 SVG 插画 | 全站 className；`src/components/site/illustrations.tsx` |

### 颜色角色

| token | 值 | 用途 |
| --- | --- | --- |
| `--color-ink` | `#0b1221` | 浅色模式的描边与正文 |
| `--color-chalk` | `#e9eef8` | 深色模式的描边与正文 |
| `--color-paper` | `#f7f4ee` | 浅色模式纸底 |
| `--color-midnight` | `#060a12` | 深色模式底色 |
| `--color-iris` | `#6d5cff` | 主强调色 —— **仅用于填充 / 描边 / 渐变** |
| `--color-blush` | `#ff6b9d` | 次强调色 —— **仅用于填充 / 描边 / 渐变** |
| `--color-sun` | `#ffd166` | 高亮 / 荧光笔 |
| `--color-mint` | `#4ade9b` | 成功 / 正向 |
| `--color-iris-text` | `#4f3ce0` | **文字专用**的 iris（正文链接、chip 文字） |
| `--color-blush-text` | `#c2185b` | **文字专用**的 blush（hover 文字色） |

> ⚠️ 这是本轮最容易踩的坑：品牌色是按「填充」挑的，直接当正文色用**不达标**。
> `#6d5cff` 在纸底上只有 4.14:1。加文字一律用 `-text` 后缀的深色变体。详见 §4。

### 字号阶梯（CJK 友好）

中文是全角密排，需要**更大行高、且不能沿用拉丁文的负字距**。
Tailwind 从 `text-5xl` 起的默认值（`leading-none`、`-0.025em`）会让中文标题互相顶到。
所以把修正值一次性编码成 token，而不是在每个调用点重复写 `leading-*`：

| token | 字号 | 行高 | 字距 | 字重 |
| --- | --- | --- | --- | --- |
| `text-display` | 2.75rem | 1.18 | -0.01em | 900 |
| `text-headline` | 2.125rem | 1.22 | -0.01em | 900 |
| `text-title` | 1.375rem | 1.4 | 0 | 800 |

### 动效分工（重要，别搞混）

- **入场动画用 CSS**（`animate-rise` / `animate-rule` / `animate-pop`）：不依赖 JS，静态站无 JS 也能看；
  服务端组件里也能用；顺带能被 `prefers-reduced-motion` 全局关掉。
- **交互动效用 Framer Motion**：滚动进度条、`whileHover`/`whileTap`、`layoutId` 滑动药丸、数字弹跳、
  卡片倾斜、滚动视差、页面过渡。这些本来就依赖 JS，不存在「没 JS 就废掉」的问题。
- **禁止**让 Framer Motion 给正文/列表内容设 `initial={{opacity:0}}` —— 那会被序列化进预渲染 HTML，
  无 JS 访客看到的是空白页。已加此保护的：`Tabs`（`hasSwitched`）、`PageTransition`（`hydrated`）、
  `PostList`（`AnimatePresence initial={false}`）。
- **禁止**用 `useReducedMotion()` 去分支 **props** —— 它在 SSR 返回 `null`、客户端返回布尔值，
  两端渲染结果不同 → hydration mismatch。统一走 `src/components/site/motion-provider.tsx`
  （`MotionConfig reducedMotion="user"`）。
  *例外*：仅用于在两**个初值相同**的 MotionValue 之间二选一时是安全的
  （`Counter` 的数字、文章页进度条、`TiltCard`、`Backdrop` 视差都属于这一类）。

### 主题系统（第二轮新增）

- 主题是**属性驱动**的：`data-theme`（已解析）管样式，`data-theme-choice`（原始选择）管按钮图标。
- 见 D8。改 `dark` 策略或存储键时，**`layout.tsx` 的脚本与 `theme-toggle.tsx` 必须同时改**
  （键名 `theme` 在两处各写了一份，脚本是无法 import 的纯字符串）。

### 动效组件一览

| 组件 | 作用 | 关键约束 |
| --- | --- | --- |
| `motion-provider.tsx` | 下发 `reducedMotion="user"` | 必须包住所有用到 Framer 的内容 |
| `page-transition.tsx` | 路由切换淡入 | 首屏不参与动画（`hydrated` 门控） |
| `tilt-card.tsx` | 卡片指针倾斜 + 悬停抬升 | **自己拥有 hover 位移**，卡片 className 里不能再写 `hover:-translate-y-*` |
| `backdrop.tsx` | 流动渐变背景 + 视差 | 视差必须包 wrapper，见 D10 |
| `theme-toggle.tsx` | 三态明暗切换 | 无 React state，图标由 CSS 决定 |
| `backdrop.tsx` 的水感 | CSS `translate` 缓漂 + 指针高斯扰动 | **必须留在 `MotionProvider` 内**，见 D16；`translate` 不能写成 `transform`，见 D15 |

---

## 二、待办清单

### P0 —— 用户直接提出 / 当前最短板

- [x] **背景几何图形改大、加渐变、缓慢流动**（用户建议 1）
      原先的图形偏小、偏淡、`blur-3xl` 之后糊成一片灰调。改为 38–62rem 饱和渐变图形 +
      `background-position` 流动（颜色真的在走）+ 缓慢自转/形变，周期 32–118s。
      ⚠️ `animate-*` 会覆盖 `animation` 简写属性，所以「既流动又自转」必须用合并
      token（`animate-flow-tumble` / `animate-flow-tumble-slow` / `animate-morph-flow`），
      否则其中一个动画会被静默丢掉。
- [x] **文章页去掉标题框和正文框**（用户建议 2）
      标题板 + 正文玻璃板两层框被移除，正文直接落在纸面上；关于页一并对齐。
      代价：背景图形是流动的，同一行字在不同时刻背景不同 —— 由竖向阅读带兜底（决策 D4/D5）。
- [x] **插画（三大支柱里最弱的一环）**
      原先只有抽象几何，没有真正的插画。已加一套手写 SVG 贴纸
      （`EmptyBox` / `LostPlane` / `SparkleCluster`）：粗描边 + 平涂 + 错位硬阴影，
      描边与填充全部走主题 token，深色模式不需要第二套图。
- [x] **404 页与空状态**
      `/_not-found` 之前是 Next 默认样式，是明显的断点；列表页/首页空状态也补了插画。
- [x] **字体系统（中英混排）**
      见下方「决策记录 D3」：**不引入 Web Font**，改为扩充 CJK 友好的字号/行高/字距阶梯。
- [x] **浅色模式对比度审计**
      见下方「决策记录 D4」与「对比度实测」小节。

### P1 —— 完成度

- [x] **动画背景的性能实测**（见 §7，结论修正了我自己的假设）
- [x] **显式明暗切换按钮**（见 D8）
      三态（浅色 / 深色 / 跟随系统）；`dark` 从 media 策略改成**属性策略**，
      首屏前由阻塞内联脚本写入，无闪烁、无 hydration mismatch。
      `src/components/site/theme-toggle.tsx` 是**无状态组件**。
- [x] **窄屏背景构图**
      手机端从 4 张重叠图形减到 2 张对角图形并重新定位，阅读带在窄屏放宽到 0.7。
      原来那片灰绿是四张半透明图形在 390px 里几乎完全重叠、色相被平均出来的。
- [x] **动效编排升级**
      - [x] 背景图形随滚动微视差（三档速度，包在外层 wrapper 上，见 D10）
      - [x] 卡片指针跟随倾斜（`src/components/site/tilt-card.tsx`，仅响应鼠标）
      - [x] 列表 layout 动画（`src/components/posts/post-list.tsx`：标签筛选 + 搜索，
            `AnimatePresence mode="popLayout"`）
      - [x] 页面切换过渡（`src/components/site/page-transition.tsx`，首屏不参与动画）
- [x] **毛玻璃的「厚度」**
      - [x] `feTurbulence` 噪点层（`.grain-overlay`，放在背景层内部，**不加 `mix-blend-mode`**，见 D11）
      - [x] `inset` 顶部高光（写进全部 `--shadow-brutal-*` / `--shadow-chalk-*` token，一处改动全站生效）
      - [x] 分层 `backdrop-saturate`：顶栏 150 / 抬升面板 150 + 亮度 105 / 卡片与内嵌组件 125
- [x] **启用彩色硬投影**
      `--shadow-brutal-iris/-blush/-sun/-mint` 用于：404 主 CTA（静止 iris，hover blush）、
      首页与列表卡片 hover（iris）。另新增四个 `-xs` 尺寸变体，让标签 chip 的硬投影
      与**自己的描边同色**。
- [x] **插画扩展**
      新增 `EmptySearch`（放大镜 + 空白页）。**这里原本是个死分支**：
      标签集由文章自身推导，选中任何标签都必然至少命中一篇，所以「无结果」永远不可达。
      为此补了搜索框，空态才成为真实状态（见 D9）。

### P2 —— 打磨
- [x] **prose 深度定制**
      - [x] 有序列表自定义序号（`counters` + 描边序号徽章；`::marker` 无法加背景/边框，只能走 `::before`）
      - [x] 表格横向滚动容器（覆写 `table` 节点，见 D13 —— **这里踩了一个大坑**）
      - [x] 图片灯箱（`src/components/mdx/zoomable-image.tsx`，`Figure` 与 markdown `img` 共用；
            Esc 关闭、焦点归还、锁滚动、点击图片本身不关闭）
- [x] **移动端**
      - [x] 文章卡「票根」横向滑动：首页最新 3 篇在窄屏变成 `snap-x mandatory` 横向轮播，
            卡片底部加虚线撕线 + 日期票根区（桌面仍是纵向堆叠，`/posts` 长列表不变）
      - [ ] **导航抽屉 —— 有意不做**。该条自己的前提是「链接变多之后」，
            而当前只有「文章 / 关于」两个链接 + 主题按钮，390px 下一行放得下（已截图确认）。
            给 2 个链接做抽屉是**更差**的体验。等导航项真的变多再做。
- [x] **性能：LazyMotion 减包**（见 D14）
      framer-motion 原本是**每个路由都加载**的 43.5 KB gzip 单块（Provider 在根布局里）。
      改成 `LazyMotion` + 动态 import `domMax` 后，动画引擎被拆到独立 chunk 并在 hydration 之后加载：
      - 首屏 JS：**203 KB gzip**（10 个 chunk）
      - 动画引擎特征包（41.8 KB）**已不在首屏 HTML 的 script 列表里**，实测运行时会被异步拉取
      - 必须用 `domMax` 而非 `domAnimation`：后者不含 layout 动画，而
        `PostList` 的 `layout` 与 `Tabs` 的 `layoutId` 都依赖它
- [ ] **视差与页面过渡的真机成本 —— 无法完成**
      需要真实 Android / iOS 设备。当前所有性能数据都来自桌面 Chrome + CPU 降频，
      GPU 是 RTX 5080，**光栅化成本被严重低估**。已在 §7 记录。
      因为 R1 禁掉了移动端全部动效，这个缺口对手机不构成风险；但若以后真要给手机加动效，**必须先真机验证**。
- [x] **RSS / sitemap 的样式化**
      `public/rss.xsl` + `<?xml-stylesheet?>` 处理指令。裸 XML 在浏览器里是一堵墙，
      现在会渲染成与站点同语言的页面（含深色模式）。**订阅器会忽略该指令**，不会影响订阅。
- [x] **打印样式**
      背景层/顶栏/页脚/进度条加 `print:hidden`；`@media print` 把两套主题都压平成白底黑字、
      去掉所有硬投影与毛玻璃、在外部链接后打印 URL、块级元素避免跨页断裂。
      实测打印预览干净可读。
- [ ] **草稿态 / 加载态插画 —— 有意不做**
      该条自己的说明就是「静态站目前没有这两个状态，等真有对应 UI 再加，
      **不要为了凑数发明装饰**」。公开访客看不到草稿（草稿 404），静态站也没有加载态。
      本轮的插画产出是 `EmptySearch`（筛选/搜索无结果），那个状态是**真实可达**的。

---

## 三、决策记录

### D1 —— 为什么背景图形不再用重度 `blur`？

第一版用 `blur-3xl`（64px）把四个饱和色相糊开，结果在纸色底上平均成一片**浑浊的橄榄灰**，
既不像「几何图形」，又拉低了文字对比度。

现在只保留**轻中度模糊**（`blur-xl` 24px / `blur-2xl` 40px），并且：

- 图形的**尺寸越大，需要的模糊就越小** —— 40px 的模糊在 736px 的图形上只占 5%，
  边缘依然是一条可辨识的曲线（这才是「几何图形」）；在 200px 的图形上却会糊掉整个形状。
- 「柔和」主要由覆盖其上的毛玻璃层折射提供，而不是把图形本身毁掉。
- 反过来说，**太大又模糊不足**会出现另一种问题：图形边缘在浅色纸底上呈现为一条硬直线。
  所以 `46rem` 那张形变图形用的是 `blur-2xl` 而不是 `blur-xl`。

### D2 —— 为什么用 `background-position` 而不是 `transform` 做「流动」？

- `transform` 只能让图形**整体位移/旋转**，颜色本身不流动。
- `background-position` 在**超出元素尺寸**的渐变上缓慢平移，**颜色是真的在流动**。
  元素必须同时带 `bg-[size:220%_220%]`：渐变若正好铺满盒子，就没有可平移的余量，
  动画会完全看不见（这是最容易白写的一条）。
- 两者叠加效果最好：`flow` 让颜色走，`tumble` 让整个图形带着渐变一起缓慢自转。
- 两者都只动 `background-position` / `transform`，不触发 layout。

为了「缓慢」，周期取 **32s–118s**（不是 3–5s）。

> ⚠️ 实现坑：`animate-*` 写的是 `animation` **简写属性**，所以
> `class="animate-flow animate-tumble"` 会静默丢掉其中一个（后定义者胜）。
> 必须用合并 token：`animate-flow-tumble` / `animate-flow-tumble-slow` / `animate-morph-flow`。
> 好在 `flow` 与 `tumble` 动的是不同属性，可以安全地写在同一个简写里。

### D3 —— 为什么不引入 Web Font？

站点是**中文为主**的：

- 一款 Latin display 字体（Archivo Black / Space Grotesk 之类）只能影响
  `TinaCMS`、`Next.js`、`MDX` 这几个拉丁词，对「我的博客」「文章」这些标题毫无作用。
- 真正能改变中文标题观感的是一款**中文** display 字体，而 CJK 字库动辄 3–10MB，
  全量内嵌会让首屏直接崩掉；做子集化又需要把字体构建流程接进 CI，属于另一个工程。
- 引入 `next/font/google` 还会给构建加一个**网络依赖**，与项目「离线可构建」的取向冲突。

**决定**：不引入 Web Font。改为把现有的系统字体栈用足 ——
扩充 `--text-*` 阶梯，给中文标题专门调**行高与字距**（中文需要比拉丁文更大的行高、
且不能沿用拉丁文的负字距），用字重与排版层级而不是换字体来建立层级感。

> 如果以后真的很想要中文 display 字体，正确路径是：选一款开源字体 → 用
> `fonttools` 按站内实际用字做子集 → `next/font/local` 自托管 → 在 CI 里加一步子集化。

### D4 —— 对比度：审计结果与三处真实修复

用 WCAG 2.1 相对亮度公式逐个实测了实际使用的配色对（结果见 §4）。
不是估算 —— 是脚本按「前景色 / 透明度合成后的实际背景色」算出来的。

**发现三处真实不达标**（都是我第一版留下的）：

| 问题 | 原值 | 实测 | 改为 | 实测 |
| --- | --- | --- | --- | --- |
| 正文链接 `text-iris` | `#6d5cff` | **4.14:1** ✗ | `--color-iris-text` `#4f3ce0` | 6.26:1 ✓ |
| 链接 hover `text-blush` | `#ff6b9d` | **2.44:1** ✗ | `--color-blush-text` `#c2185b` | 5.35:1 ✓ |
| 标签 chip（blush 色） | `rose-600` | **3.85:1** ✗ | `rose-700` `#be123c` | 5.15:1 ✓ |
| 标签 chip（sun 色） | `amber-700` | **4.25:1** ✗ | `amber-800` `#92400e` | 6.00:1 ✓ |
| 标签 chip（mint 色） | `emerald-700` | 4.64:1（勉强） | `emerald-800` `#065f46` | 6.50:1 ✓ |

**关键认识**：`--color-iris` 这种「品牌色」是按**填充/描边/渐变**挑的，
直接拿来当**正文颜色**用往往不达标。所以现在拆成两套：
基础色只用于填充与描边，文字一律走 `-text` 后缀的深色变体。

**另一条决定**：正文不再依赖「背景恰好够亮」。因为文章页去掉了玻璃框（D5），
正文直接落在背景图形上，而图形是流动的 —— 同一行字在不同时刻的背景并不相同。
所以在 `backdrop.tsx` 里加了一条**竖向阅读带**（`linear-gradient(to right, …)`，
非椭圆），把文字列下方的有效背景恒定在浅色端。用竖向带而不是居中椭圆，
是因为椭圆在中心上下会衰减 —— 长文章会出现「顶部有掩护、中间没有」的情况。

### D5 —— 为什么文章页去掉了框（用户建议 2）

原来标题一块玻璃板、正文又一块玻璃板，等于在读者和文字之间塞了两层矩形，
而且正文在里面还有内边距与滚动，读起来很挤。

**新的规则**：

> **框用来标记「组件」，不用来标记「页面正文」。**

- 要框的：列表卡片、Callout、Tabs、代码块、Figure/Video、计数器 ——
  这些是嵌在正文里的**异物**，框是它们的边界。
- 不要框的：文章标题与正文、关于页正文、404 页 —— 这些**就是**页面本身，
  再加框只是重复了一次页面边界。

为了让这条规则视觉上成立，正文的可读性改由背景层的**竖向阅读带**保证（见 D4），
而不是靠玻璃板兜底。

> 关于页也一并去框了。用户只点名了文章页，但两者是同一类「页面级正文」，
> 留着框会让规则自相矛盾。如果更想要关于页保留卡片感，改回
> `src/app/about/page.tsx` 的 `<article>` 包裹即可（一处）。

### D6 —— 插画为什么是手写 SVG，而不是引入插画库

- 插画库（unDraw / Storyset 之类）的配色与描边粗细和 Neo-Brutalism 对不上，
  强行改色比重画还慢。
- 需要的只是「粗描边 + 平涂 + 零模糊错位阴影」这一种语言，
  用 `sparklePath()` 这样的几何构造函数就能生成，且**天然跟随主题色**：
  描边走 `stroke-ink dark:stroke-chalk`，填充走四个 accent token，
  深色模式不需要单独一套图。
- 体积接近零，没有额外依赖，也不会在 `check:runtime` 里引入新的客户端包。

目前四张：`EmptyBox`（空状态）、`EmptySearch`（筛选无结果）、`LostPlane`（404）、
`SparkleCluster`（首页 hero 角标）。

### D7 —— 为什么环境动画在 `md` 以下被关掉

§7 的实测结论是：**只要页面在动，代价就是恒定的**，与动几个图形、动什么属性基本无关。
在 4x CPU 降频下，桌面端持续消耗约 **190–217 ms/s** 的主线程时间；
390px 视口的手机端也有 **136–148 ms/s** —— 尽管它的像素只有桌面的 6%。
把任何**单个**动画关掉，变化都在噪声范围内（关模糊甚至毫无收益）。

也就是说：**没有「少动一点」这个选项，只有「动 / 不动」。**

所以用 `max-md:animate-none` 把大图形的动画在 768px 以下全部停掉：

- 图形**还在**，配色和构图完整保留，只是静止 —— 设计语言没有丢。
- 手机端连续开销从 ~140 ms/s 降到 **3 ms/s**（= 完全不动时的基线）。
- 桌面端保留完整效果：4x 降频下约 190 ms/s ≈ **单核的 5%**（1x 下约 56 ms/s ≈ 5.6%），
  对一台正常笔记本是可以接受的环境动效成本。
- `prefers-reduced-motion: reduce` 的用户在任何尺寸下都是 0（全局 CSS 规则）。

**如果以后想让手机也有动效**，正确的做法不是「少放几个图形」（没用），
而是给窄屏单独设计一套更简单的动画，或者用更精细的设备判据
（例如 `navigator.hardwareConcurrency` / `navigator.deviceMemory`）。
**不要**只是把 `max-md:animate-none` 删掉 —— 那会让手机重新背上 ~140 ms/s。

### D8 —— 明暗切换：属性策略 + 阻塞脚本 + 无状态按钮

**问题**：Tailwind v4 的 `dark:` 默认跟随 `prefers-color-scheme`，用户无法覆盖。
而站点是静态预渲染的，服务端**不可能**知道访客存了什么偏好。

**做法**（三段，缺一不可）：

1. `globals.css` 里把变体重定义为属性选择器：
   ```css
   @custom-variant dark (&:where([data-theme='dark'], [data-theme='dark'] *));
   ```
   用 `:where()` 把特异性压到 0，`dark:` 工具类的层叠行为与原来完全一致。

2. `layout.tsx` 里把一段**阻塞式内联脚本放在 `<body>` 的第一个元素**，首屏绘制前写入：
   - `data-theme` —— `light|dark`，**样式和按钮图标都读它**

   > **2026-09 变更：按钮从三态（浅/深/跟随系统）改成两态，显示器图标已删。**
   > 因此不再需要 `data-theme-choice` 这个第二属性 —— 图标直接读 `data-theme`。
   > 但**首次访问仍然跟随系统**：脚本在没有存储值时读 `prefers-color-scheme`，
   > 且**用户不点击就不写 localStorage**。所以没碰过按钮的访客每次访问都跟随系统，
   > 点一次之后选择被固定（这就是两态开关的语义）。
   > 原来的三段式结构（属性策略 + 阻塞脚本 + 无状态按钮）完全保留，只是少了一态。

   放在 effect 里做会先画浅色再翻成深色 —— 每次加载整页闪一下，不可接受。

3. 按钮**完全没有 React state**：两个图标全部渲染，由 CSS 决定显示哪一个；
   点击时直接从 DOM 读当前主题并取反。服务端与客户端渲染出**逐字节相同**的标记，
   所以既没有 hydration mismatch，也没有「图标先显示错的再跳一下」。

**代价**：`<html>` 上需要 `suppressHydrationWarning`。
这是必须的 —— 脚本故意写了 React 没渲染的属性。它只覆盖该元素自身的属性，
子树里真正的 mismatch 依然会报出来。

**另一个代价**：禁用 JavaScript 时永远是浅色。这是刻意的取舍：
没有 JS 就无法知道偏好，而 `data-theme` 缺席时样式默认走浅色。

### D9 —— 筛选的「无结果」原本是个死分支

标签筛选第一版是这样推导标签集的：从全部文章里收集标签。
于是**选中任何标签都必然至少命中一篇**（贡献该标签的那篇），
`visible.length === 0` 恒为假 —— 空状态和 `EmptySearch` 插画是**证明不可达**的死代码。

修法不是删掉空状态，而是补一个**搜索框**：标题/摘要匹配可以是任意字符串，
「无结果」于是成为真实可达的状态，插图也才有了意义。

> 教训：写空状态时先问「这个条件什么时候为真」，而不是「看起来是否完整」。

### D10 —— 视差为什么必须包一层 wrapper

背景图形自身已经用 `animate-tumble` 在动 `transform`。
CSS 动画在层叠中**高于行内样式**，所以 Framer 写到同一个元素上的
`translateY` 会被动画值直接覆盖 —— 视差会**静默失效**，而且看起来"代码没问题"。

因此每个要做视差的图形都套了一层 `motion.div`：
**外层负责平移，内层负责自转**，一个元素只干一件事。

三档速度（70 / -110 / 46 px per 1400px 滚动）是为了让它读起来像"深度"，
而不是"整块背景在滑"。数值刻意取小：背景是 `fixed` 的，
位移大了会和页面内容明显脱开。

### D11 —— 噪点为什么不加 `mix-blend-mode`

全屏叠一层 `mix-blend-overlay` 的噪点会**强制合成器在每一帧对下方内容做一次混合**。
而 §7 的实测结论恰恰是：这个页面的开销几乎全部来自"每帧的合成工作"。

所以噪点做了两个让步：

- **放进背景层内部**（在阅读带之下、在所有内容之下），而不是盖在页面上。
  顺带的好处是文字上永远不会有噪点，不会白白牺牲可读性。
- **只用普通 `opacity`**，不做混合。普通半透明叠加只是一次廉价合成。

另外 `feColorMatrix type="saturate" values="0"` 是必需的：
`feTurbulence` 默认输出**彩色**噪点，不脱色的话会像电视雪花。

### D12 —— 移动端零动效为什么需要四处改动而不是一处

最直觉的做法是「在 CSS 里写一条 `@media (max-width: 768px) { * { animation: none } }` 就完事」。
**不够**，因为页面上的动效有三个来源，CSS 只能管住一个：

| 来源 | 谁管 |
| --- | --- |
| Tailwind `animate-*` / `transition-*` | CSS 媒体查询 |
| Framer 的 `animate` / `whileHover` / `layout` | `MotionConfig reducedMotion="always"` |
| **直接被驱动的 MotionValue**（`useSpring`） | **两者都管不到**，必须靠 `useNoMotion()` 换常量 |

第三条是最容易漏的：`MotionConfig` 的 `reducedMotion` 只影响 Framer 自己调度的动画，
而 `useSpring(scrollYProgress)` 这类是**我们自己**在推值。第 3 节 §7 的
`prefers-reduced-motion` 实验也出现过同款现象 —— 当时中和视差的 MotionValue 写入后开销没有变化，
说明那条路径确实独立于 `MotionConfig`。

所以 `use-no-motion.ts` 是唯一的判据来源，**新增动效组件必须用它**。

### D13 —— Tina 的 `table` 类型定义与实现不一致（会静默删掉所有表格）

`Components['table']` 的声明是：

```ts
table?: { align?: ...; tableRows: { tableCells: { value: TinaMarkdownContent }[] }[] };
```

照这个签名写覆写，结果**整站的表格全部消失**，而且 `tsc` 不报错。

实际实现在 `tinacms/dist/rich-text/index.js` 的 `case "table"`：

```js
return React.createElement(TableComponent, null,
  headerRow && React.createElement("thead", ...),
  React.createElement("tbody", ...));
```

它传的是 **`children`**，`tableRows` 根本没出现。两个代码路径
（`type: "table"` 与编辑器产生的 `mdxJsxFlowElement`）都是传 children。

**教训**：给 Tina 的内置节点写覆写时，**先去 `node_modules/tinacms/dist/rich-text/` 读实现**，
不要相信 `.d.ts`。`satisfies` 也拦不住 —— 类型和运行时本来就不一致。
现在的覆写两条路都兼容，并在注释里写清了这件事。

### D14 —— LazyMotion 的两个必要细节

1. **`features` 必须写成返回 `import()` 的函数**。
   `features={domMax}` 是静态引用，会被打进同一个 chunk，**一点都省不下来**；
   只有 `() => import('framer-motion').then(m => m.domMax)` 才会拆成独立 chunk。

2. **`domMax` 而不是 `domAnimation`**。
   `domAnimation` 不含 layout 动画，而本站 `PostList` 用 `layout`、
   `Tabs` 用 `layoutId`，选小的会**静默失效**（不报错，只是不animate）。

配套加了 `strict`：一旦有人在 `LazyMotion` 里写了 `motion.*`，
它会**直接抛错**而不是悄悄把整个特征包同步拉回来 —— 把性能回归变成响亮的失败。
所以全部 `motion.*` 已迁移为 `m.*`。

实测结果：动画引擎特征包（41.8 KB gzip）不在首屏 HTML 的 script 列表里，
运行时会被异步拉取；首屏 JS 总计 **203 KB gzip / 10 个 chunk**。

---

### D15 —— 水感动效：为什么动 `translate` 而不是 `transform`，以及一个被它揪出来的老 bug

**需求**：背景几何图形像在水里一样缓漂；鼠标划过时被轻轻扰动。

**漂流**用 CSS 完成，但**必须动独立的 `translate` 属性**，不能动 `transform`：

- `animation` 是**单一简写属性**。`water` 和 `tumble` 都想动 `transform` 的话，
  后定义的那个会把前一个**整个覆盖掉**（这正是 D2 记过的坑）。
- 把旋转写进同一组关键帧可以绕开覆盖，但两者就再也无法独立计时了。
- `translate` / `rotate` / `scale` 是**各自独立**的属性，彼此叠加，
  所以每个动画只拥有一个属性，互不干扰。
- 位移用**百分比**：按元素自身尺寸解析，一套关键帧同时适配 46rem 和 62rem 的图形。
- 用 `[animation-delay:-7s]` 之类的**负延迟**打散相位 —— 两个 token 的周期不同（43s / 61s），
  负延迟再打散共用同一 token 的两个图形，否则它们会同步摆动，看起来像机械装置。

**扰动**用 Framer 完成：每个图形按到光标的距离做**高斯衰减**，被推离光标。
关键在于必须有一个明确的 `strength` 信号表示「有没有光标」：

- 初版用 `pointerX === 0 && pointerY === 0` 当哨兵。**这是错的**，而且错两次：
  弹簧只会停在 `restDelta` 之内、不会正好落在 0，所以离开后哨兵永不触发；
  而推力大小来自高斯衰减、**与光标离原点的距离无关** ——
  于是残留的 0.03 仍然代表「光标在左上角」，照样推出满额 ~57px。
  结果是**动效永远不释放**，四个图形永久偏着。
- 改成 0..1 的 `strength`（离开时用弹簧淡出，像水慢慢静下来），
  并在末端做 `v < 0.01 ? 0 : v` 吸附，让 wrapper 的 transform 能**精确回到 `none`** ——
  否则 0.05px 的残留会把它永久钉成一个合成图层。

### D16 —— Backdrop 必须留在 MotionProvider 内部（一个从 P2 起就静默失效的 bug）

做这个动效时探针显示：MotionValue **算得完全正确**
（`push1: [-36.4, -25.8]`、`lagged` 也在跟随），但 DOM 上始终是 `transform: none`。
顺手一测滚动，**连视差也没有任何 transform**。

根因：`layout.tsx` 里 `<Backdrop />` 渲染在 `<MotionProvider>` **外面**。
`m.*` 组件的能力来自外层的 `<LazyMotion>`；在外面它们**照常渲染标记，但从不绑定 MotionValue**，
所有 transform 静默塌缩成 `none`。

**这意味着 P2 引入 LazyMotion 的那一刻起，滚动视差就已经死了**，一直没人发现 ——
因为当初那条断言只检查「`style` 属性里含有 `transform`」，
而 `transform: none` 恰好满足这个条件。**又一个「断言错了对象」的例子。**

修法：把 `Backdrop` 移进 `MotionProvider`。`MotionConfig` / `LazyMotion`
都是**不渲染 DOM 的 context provider**，所以 DOM 结构完全不变，`fixed inset-0` 定位不受影响
（已实测确认：`backdropParent=BODY`、`position=fixed`、`z-index=-10`）。

修好之后视差**才第一次真正生效**，也就是说 §7 里那些测量是在「视差实际没跑」的状态下做的。

---
## 四、对比度实测

> ⚠️ **下表是「从 token 手算」的结果，只对纯色背景有效。**
> 这个站的面板都是毛玻璃，`backdrop-filter` 会把背后的流动渐变采样进来，
> **真实背景比下表假设的亮得多**。§8 的第二轮审查改用**渲染像素**采样后，
> 又抓出两个下表没有覆盖的问题（B7 渐变药丸、B8 深色次要文字随时间跌破 AA）。
> **要判断毛玻璃上的对比度，以下表为起点，以 §8 的像素实测为准。**

按 WCAG 2.1 计算（AA 正文要求 ≥ 4.5:1，大字/非文本 ≥ 3:1）。
带 `/n` 的前景是 Tailwind 透明度修饰符**合成后**的实际颜色，不是原色。

| 前景 | 背景 | 对比度 | 判断 |
| --- | --- | --- | --- |
| `ink` `#0b1221` | `paper` `#f7f4ee` | 17.04:1 | AAA |
| `ink` /75 | `paper` | 7.99:1 | AAA |
| `ink` /70 | `paper` | 6.70:1 | AAA |
| `ink` /65（导航） | `paper` | 5.64:1 | AA |
| `ink` /60 | `paper` | 4.79:1 | AA（余量小 → 已全面收紧到 /70 或 /75） |
| `iris-text` `#4f3ce0` | `paper` | 6.26:1 | AAA |
| `iris-text` | 玻璃面板（`white/60` 合成） | 6.64:1 | AAA |
| `blush-text` `#c2185b` | `paper` | 5.35:1 | AA |
| `slate-200` | `midnight` `#060a12` | 16.07:1 | AAA |
| `slate-300` | `midnight` | 13.34:1 | AAA |
| `slate-400` | `midnight` | 7.73:1 | AAA |
| `indigo-300`（深色链接） | `midnight` | 9.94:1 | AAA |
| `rose-700` | blush chip 合成色 `#f8e4e4` | 5.15:1 | AA |
| `amber-800` | sun chip 合成色 `#f9ebcc` | 6.00:1 | AA |
| `emerald-800` | mint chip 合成色 `#ddf1e2` | 6.50:1 | AA |

**已废弃、不要再使用的组合**：

| 废弃 | 原因 |
| --- | --- |
| `text-iris` 当正文色 | 4.14:1 |
| `text-blush` 当正文色 / hover 色 | 2.44:1 |
| 深色模式 `text-iris` | 4.36:1 → 用 `dark:text-indigo-300` |
| `slate-500` 当深色正文 | 4.16:1 |

> 复算方式：把 §4 表格的两列喂给任意 WCAG 对比度计算器即可。
> 改动配色后请重跑这张表 —— 尤其是「品牌色直接当文字色」这种改动。

---

## 五、硬约束（改样式时不要碰坏）

这些是**测试脚本硬编码的契约**，破坏了不会编译报错，但会让 smoke 失败：

| 契约 | 位置 | 谁在依赖 |
| --- | --- | --- |
| `<aside>` 必须带字面量 `border-sky-300`（info）/ `border-amber-300`（warning） | `src/components/mdx/callout-styles.ts` | `scripts/interaction-smoke.mjs` 用 `aside.border-sky-300` 选择 |
| 计数器数值必须是**唯一**的 `strong.tabular-nums`，且不能被 `AnimatePresence` 包住 | `src/components/mdx/counter.tsx` | 同上，`.first()` 会读到正在退场的旧值 |
| 计数器按钮 `aria-label` 必须是 `增加` / `减少` | `src/components/mdx/counter.tsx` | 同上 |
| 标签页面板只能有**一个** `role="tabpanel"` | `src/components/mdx/tabs.tsx` | 同上 |
| `figure` 内必须有 `figcaption` 且文本非空 | `src/components/mdx/figure.tsx` | 同上 |
| 客户端 bundle 里**不能出现** `relativePath` / `postConnection` / `pageConnection` / `content.tinajs.io` / `X-API-KEY` | 任何 `'use client'` 文件 | `scripts/runtime-independence-smoke.mjs`（会让构建失败） |
| `[data-tina-field]` 必须挂在**HTML 元素**上，不能挂在 React 组件上 | `src/components/tina-markdown.tsx` | 可视化编辑 |
| 新增可插入组件必须同步 **4 处**（`tina/config.ts`、`tina-markdown.tsx`、`validate-content.mjs`、组件本体） | 见 `AGENTS.md` 第二节 | 内容门禁 |
| 主题存储键 `theme` 在两处各写一份（`layout.tsx` 的阻塞脚本无法 import） | `src/app/layout.tsx` + `src/components/site/theme-toggle.tsx` | 主题切换 || `<html>` 上的 `suppressHydrationWarning` **不能删** | `src/app/layout.tsx` | 阻塞脚本故意写了 React 没渲染的属性 |
| 用了 `TiltCard` 的卡片**不能**再带 `hover:-translate-y-*` | `src/app/page.tsx`、`src/components/posts/post-list.tsx` | 行内 transform 会覆盖 class，抬升会静默失效 |
| 背景图形的滚动视差必须加在**外层 wrapper** 上 | `src/components/site/backdrop.tsx` | CSS 动画优先级高于行内样式，加在内层会静默失效 |
| `PostList` 的 props 只能传扁平字段（`slug` / `dateIso` / `dateLabel`），不能传 `PostSummary` | `src/app/posts/page.tsx` | 传 `relativePath` 会让 `check:runtime` 失败 |
| `AnimatePresence` 必须是 `initial={false}` | `src/components/posts/post-list.tsx` | 否则静态 HTML 里每张卡都是 `opacity:0` |

---

## 六、验证方式

```bash
npm run typecheck
npm run build:local     # 需要 npm run dev 正在跑
npm run smoke           # admin / visual / interaction / save / http
node scripts/verify-prod.mjs 3100   # 生产模式全量（避开 dev server 占用的 3000）
```

> 本机注意：浏览器测试与构建需要**命名管道**，在受限沙箱下会 `spawn EPERM`。
> 另外 `npm install` 会清掉 `--no-save` 装的 playwright，用之前重装一次
> （可用 `--cache .npm-cache` 让缓存写在仓库内）。

### 本轮（第二轮）验证结果

| 检查 | 结果 |
| --- | --- |
| `npm run typecheck` | 0 错误 |
| `npm run build:local` | 全静态路由；`check:runtime` **13/13**、`check:routes` **7/7** |
| `npm run smoke` | http **10/10**、admin **20/20**、visual **5/5**、interaction **17/17**、save **6/6** |
| 浏览器控制台 | **0 error / 0 warning**（只有一条无关的 favicon 404） |
| `content/` `tina/` `scripts/` | **无 diff**（内容、schema、门禁脚本一行未改） |

### 第三轮（P1 全部）附加验证

| 检查 | 结果 |
| --- | --- |
| 主题切换功能测试 | **14/14** —— 三态轮转、图标跟随、跨刷新持久化、`system` 跟随系统切换、显式选择覆盖系统、脚本内联且位于内容之前、**0 console error** |
| 筛选 / layout 动画 | 10/10 —— 标签筛选、搜索、`aria-pressed`、**静态 HTML 含全部文章且无 `opacity:0`**、首屏 opacity=1、倾斜 transform 生效 |
| 搜索空态 | 可达并正确渲染（无匹配 → 0 条 + 插画） |
| `npm run build:local` | `check:runtime` **13/13**（客户端 bundle 13 → **16** 个文件，全部干净） |
| `npm run smoke` | 与上表一致，全绿 |

### 第四轮（P2 全部）附加验证

| 检查 | 结果 |
| --- | --- |
| prose 功能测试 | **14/14** —— 表格 `thead/tbody` 结构完整（2 列 × 4 行）、表格在滚动容器内、图片仍在 `figure` 里且能加载、灯箱打开/显示图注/**Esc 关闭**/**焦点归还触发按钮**/滚动锁释放、0 console error |
| P2 生产环境验证 | **19/19** —— RSS 样式表指令位置正确且 `rss.xsl` 可访问、打印隐藏背景/顶栏/页脚、打印强制白底黑字、移动端**全页零 CSS 动画零过渡**、移动端内容仍可见、移动端视差为常量 |
| LazyMotion 真实性检查 | **6/6** —— 特征包**不在首屏 HTML**、运行时**确实被异步拉取**、`layoutId` 药丸被抓到飞行中（`matrix(1.13577, 0, 0, 1, -13.9426, 0)`）后落定、tab 面板切换正常 |
| 移动端轮播（克隆卡片测） | 6/7 —— 横向 `flex` + `snap-x mandatory`、可滚动（scrollWidth 1564 > 390，`scrollLeft` 0→587）、桌面回到 `block` 且不横滚、卡片宽度 294/358 = **82% 精确命中**。第 7 项是我断言写错（用了 border box 而非 content box），**不是代码问题** |
| `npm run build:local` | `check:runtime` **13/13**、`check:routes` **7/7**，全静态 |
| `npm run smoke` | http 10/10、admin 20/20、visual 5/5、interaction 17/17、save 6/6 |

> **未做**：
> 1. **真机验证**（Android / iOS）—— 无设备。所有性能数据都来自桌面 Chrome，GPU 偏差会低估光栅化成本。
> 2. 悬停场景的干净归因（测试驱动的 CDP 往返占了大头，倾斜的真实成本未分离出来）。
> 3. 页面切换过渡在导航时的成本未单独测量。
> 4. `useNoMotion()` 目前**没有自动化测试守住** —— 它靠上述运行时断言覆盖，
>    但如果以后新增动效组件忘了用它，没有门禁会拦。这是一个已知缺口。

---

## 七、动画背景性能实测

> 共测了三轮：**第二轮**（初版背景）、**第四轮**（P1 全部做完后复测）、
> **第四轮 + 修复**（本轮最终状态）。第四轮复测发现并修掉了一处真实开销。

### 方法

必须跑在**生产构建**上（`next start`），dev server 带 HMR 与 React DevTools 开销会淹没信号。
两个独立信号同时采：

1. **主线程归因** —— CDP `Performance.getMetrics`（Task / RecalcStyle / Layout）
2. **合成器归因** —— CDP Tracing，统计 `Paint` / `PrePaint` / `RasterTask` / `Commit` / `UpdateLayer`

外加**消融矩阵**：用注入的样式表逐个关掉单个动画，把成本归因到具体属性而不是靠猜。
数值单位统一为「每 1 秒真实时间消耗的毫秒数」，越小越好。

测试机：NVIDIA RTX 5080 Laptop / D3D11 / `gpu_compositing: enabled`（真 GPU，非 SwiftShader）。

**误差范围**：同一场景两次运行通常相差 2–5%，但不同 harness 之间可以差到 **15%**
（第二轮的 195 与 216 就是同一状态的两套测法）。所以**小于 ~15% 的差异不能当结论**。

### 结果一：初版背景（第二轮，4x 降频）

| 场景 | task | style | layout | paint | prePaint | commit | raster |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 桌面 1280×900 动画开 | **190–217** | 38–43 | **0** | 38–52 | 19–26 | 27–31 | 7.5–8.0 |
| 桌面 1280×900 动画关 | **3** | 0 | 0 | 0 | 0.3 | 0.4 | 0 |
| 手机 390×844 动画开（**改前**） | **136–148** | 31–32 | **0** | 29–32 | 15–17 | 19–20 | **20–21** |
| 手机 390×844 动画开（**改后**） | **3** | 0 | 0 | 0 | 0.3 | 0.4 | 0 |
| 桌面 6x 降频（阶段一） | **385** | 94 | 0 | — | — | — | — |

### 结果二：P1 做完后复测（第四轮）

P1 新增的三样东西**成本发生在不同时机**，所以只测 idle 会得出"没有变化"的错误结论。
分 idle / 滚动 / 悬停三种动作分别测：

| 场景（4x 降频） | task | style | layout | paint | commit | raster | 掉帧 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| idle 桌面 | 236–262 | 42–46 | 0 | 52–56 | 36–40 | 8.2 | — |
| idle 手机 | **4** | 0 | 0 | 0 | 0.5 | 0 | — |
| idle 桌面（隐藏背景，对照） | **4** | 0 | 0 | 0 | 0.4 | 0 | — |
| 滚动 桌面 | 399–464 | 52–59 | **0.1** | 57–64 | 40–48 | 8.6 | p95 **7.1ms**，最多 3/575 帧 >20ms |
| 滚动 桌面（隐藏背景） | 345–374 | 55–60 | 0 | 8 | 45–51 | 1.0 | 0/577 |
| 滚动 桌面（减少动效） | 465–508 | 102–110 | 0 | 7–9 | 38–44 | 2.7 | 0/576 |
| 滚动 手机 | 367–396 | 45–48 | 0.1 | 10.6 | 40–46 | 6.1 | 0/575 |
| 悬停 桌面（倾斜） | 456–538 | 107–128 | 0.1 | 51–58 | 41–55 | 7.8 | — |
| 悬停 桌面（隐藏背景） | 381–498 | 74–112 | 0.1 | 5.2 | 37–47 | 0.3 | — |

**P1 的三个新东西全部免费。** 逐个消融：

| 消掉什么 | task 变化 | 结论 |
| --- | --- | --- |
| 噪点层 | 236 → 247 | 无节省（噪声内） |
| `page-transition` 的 transform | 236 → 248 | 无节省 |
| 视差 wrapper 的 transform | 236 → **317（更差）** | 见下 |
| 阅读带 | 236 → 245 | 无节省 |

> ⚠️ **反直觉但重要**：把视差 wrapper 的 `transform` 强行设成 `none` 会让开销**暴涨**
> （236 → 317，style 42 → 117）。因为巨大的模糊图形一旦没有 transform，
> 就无法作为稳定图层被复用，**每帧都要重新光栅化整块图形**。
> 换句话说：让它保持一个（哪怕静止的）transform 反而更便宜。
> 这也解释了为什么 `will-change:transform` 是**有害**的（243 → 265，layerUpd 1780 → 2190）。

### 结果三：找到并修掉了一处真实开销

消融 `border-radius` 形变是唯一稳定复现的节省：

| 候选状态（4x 降频） | task | style | paint | raster |
| --- | --- | --- | --- | --- |
| A 原状（4 色块 + 形变） | **251–255** | 44–47 | 55–58 | 8.1–8.5 |
| B 形变完全静止 | **220–223** | 40–41 | 53–55 | 7.2 |
| E 形变改为「只自转」 | **224–229** | 44 | 53–54 | 7.1–7.4 |
| F 形变改为「自转 + 渐变流动」 | **224–229** | 41–45 | 58–60 | 8.3–8.5 |

**结论：只要去掉 `border-radius` 动画就拿回了几乎全部节省**，
而保留自转 + 渐变流动（F）与完全静止（B）在噪声范围内没有区别。

**所以最终改法是**：给有机图形一个**固定的**有机圆角
（`rounded-[42%_58%_55%_45%]`），把 `animate-morph-flow` 换成 `animate-flow-tumble-slow` ——
**动效一点没少，只去掉了最贵的那个属性**。
`--animate-morph*` token 与 `morph` 关键帧已随之删除。

**效果**：idle 桌面 **260 → 227 ms/s（−13%）**，手机仍是 0。

### 减少色块数量确实是杠杆（修正第二轮的结论）

第二轮曾写下「一个图形 ≈ 四个图形，所以减数量没用」。**这条是错的**：

| 状态 | task | layerUpd /s |
| --- | --- | --- |
| 4 色块 + 形变 | 242–245 | 1766–1779 |
| 2 色块 | 189–191 | 1458–1463 |
| 1 色块 | 179–185 | 1379–1388 |

每个动画图层大约值 **20–30 ms/s**。第二轮之所以没测出来，是因为当时只做了
「关掉某个动画」的消融；**关掉动画不等于移除图层** —— 元素还在、还在渲染。
正确的表述是：

> **页面只要在动就有一笔固定的每帧开销（约 180 ms/s @4x），
> 在此之上每个动画图层再加 20–30 ms/s。**

### 关于 `prefers-reduced-motion` 的一个意外

减少动效的用户滚动时代价**更高**（488 vs 432，style 翻倍到 103）。查下来：

| 状态 | task | style |
| --- | --- | --- |
| 正常动效 | 431–434 | 53–56 |
| 减少动效（现状） | 477–499 | 103–104 |
| 减少动效 + 中和视差的 MotionValue 写入 | 495–514 | 99–105 |
| 减少动效 + 隐藏背景 | 359–362 | 63 |
| **减少动效 + 去掉全局覆盖规则** | **646–649** | **185–187** |

两个结论：

1. **视差的 MotionValue 写入不是原因**（中和后没有改善）。
2. **全局那条 `*, *::before, *::after` 的 reduced-motion 覆盖规则是净赚的** ——
   删掉它开销从 499 涨到 **649**，因为动画会照常跑。多出来的那 ~13% 是
   「通用选择器 + `!important` 让浏览器无法走样式失效快速路径」的代价，
   但**替代方案明显更差**，所以保留。这条已作为已知取舍记录下来。

### 仍然成立的结论

1. **`filter: blur()` 是免费的。** 把 `blur-xl/2xl` 全部去掉，开销**没有任何下降**
   （甚至略升，在噪声内）。我在 D1 里担心的「大面积模糊很贵」是**错的**。
   —— 第二轮和第四轮都复现了这一点。
2. **`layout` 在任何场景下都是 0 ms/s** —— 没有任何一处动画触发重排。
   这验证了 D2 里「只动 `background-position` / `transform`」的选择是对的。
3. **滚动不掉帧。** 所有滚动场景 rAF 间隔 p95 都是 **7.1ms**（144Hz 显示器的帧预算），
   最多 3/575 帧超过 20ms。
4. **手机端连续开销为 0**（`max-md:animate-none` 生效）。

### 被后续测量推翻的结论

| 第二轮的结论 | 第四轮的修正 |
| --- | --- |
| 「成本是每帧的，不是每图形的；减图形数量没用」 | ❌ **错**。每个动画图层值 20–30 ms/s；4 色块 242 → 1 色块 179。第二轮只做了「关动画」的消融，而**关动画 ≠ 移除图层** |
| 「`border-radius` 形变只占 ~13%，不是主要问题」 | ⚠️ **半对**。它确实是「单项最贵」，去掉稳定省 13%；只是它不是**全部**成本 |
| 「`background-position` 流动只影响 paint/raster，主线程不变」 | ✅ 仍然成立，但第四轮发现去掉它只省 paint/raster 而不省 task，所以**保留它是划算的** |

### 采取的行动（累计）

| 行动 | 依据 | 收益 |
| --- | --- | --- |
| `max-md:animate-none` | D7 / 第二轮 | 手机端 140 → **3 ms/s** |
| 有机图形改用固定圆角 + 自转/流动，删掉 `morph` 关键帧与 token | 第四轮 | 桌面 idle **260 → 227 ms/s（−13%）** |

**明确不做的事**：不加 `will-change`（实测有害）；不把视差 transform 设成 `none`（实测有害）；
不删全局的 reduced-motion 覆盖规则（实测有害）。

> **未做**：
> 1. 真机（Android / iOS）实测。全部是桌面 Chrome + CPU 降频模拟，GPU 是 RTX 5080，
>    所以**光栅化成本被严重低估**（手机 GPU 弱得多）。手机端现在不动了，
>    这个偏差不影响当前结论；但如果以后要在手机上加回动效，**必须真机验证**。
> 2. 悬停场景的干净归因：`hover -backdrop` 仍有 ~380–500 ms/s，说明**测试驱动本身**
>    （`page.mouse.move` 的 CDP 往返）占了大头，倾斜的真实成本没有从里面分离出来。
> 3. 页面切换过渡（导航时）的成本未单独测量。

---

## 七·补、水感动效性能评估（第六轮）

需求是「图形像在水里缓漂 + 鼠标划过被扰动」，所以成本分三块，
而且**必须分开测**，因为它们花的不是同一笔钱。

### 结果（4x CPU 降频）

| 场景 | task ms/s | style | paint | commit | raster | 帧间隔 |
| --- | --- | --- | --- | --- | --- | --- |
| idle 桌面（漂流 + 视差 + 指针系统就绪） | **276–290** | 49–56 | 58–59 | 38–39 | 9.0 | — |
| idle 桌面 · 隐藏背景（对照） | **2–5** | 0 | 0 | 0.4 | 0 | — |
| 指针扫过桌面 | — | 144–147 | 65–67 | 45–46 | 8.5 | **p50 6.9 / p95 7.1 / max 27.9 ms，>33ms 共 0/349** |
| 指针扫过 · 隐藏背景（对照） | — | 116 | 6.5–7.1 | 40–41 | 0.6 | — |
| 滚动桌面（视差**首次真正生效**） | 456–509 | 58–61 | 61 | 42–45 | 8.7–9.1 | — |
| 滚动桌面 · 隐藏背景 | 373–386 | 60–62 | 8.5–9.0 | 47–48 | 1.1 | — |
| idle 手机 | **1–2** | 0 | 0 | 0 | 0 | — |

### 三条结论

1. **漂流本身几乎免费。** idle 从改动前的 241–254 变成 276–290，
   落在本 harness ±15% 的波动带内；而且这几个元素**本来就在动**
   （`flow` 动 background-position、`tumble` 动 transform），
   再加一个可合成的独立属性 `translate` 不产生新的重绘。
   `idle · 隐藏背景` 仍是 2–5 ms/s，说明成本完全来自背景层，没有泄漏到别处。

2. **指针扰动的 JS 成本测不出来。** 扫过时 `script` 是 109–111 ms/s，
   而**隐藏背景的对照组是 134**（对照组反而更高，因为空闲余量更多）。
   这项开销落在噪声里 —— 2 个弹簧 + 8 个纯 `useTransform` 数学，
   并用 rAF 把 pointermove 合并成每帧一次。

3. **动效干净释放。** 指针离开并静置后，四个 wrapper 的 transform 全部**精确回到 `none`**
   （不是 0.05px 残留），所以不会留下永久合成图层。
   扫过之后 task 会短暂抬高（+33 ms/s），但**把背景整个隐藏、让动效根本无法运行时，
   同样的扫过抬高得更多（+112 ms/s）** —— 那是指针事件管线在消化几百条合成 mousemove，
   不是水感动效。两种情况都在 ~6s 内回到基线。

> ⚠️ **一个必须写下来的前提**：D16 修好之前视差根本没生效，
> 所以**本节之前所有滚动数据都是在「视差没跑」的状态下测的**。
> 上表的滚动数字（456–509）才是视差真正工作后的第一次测量。

---

## 八、全站样式审查（2026-09，第五轮）

在 P0–P2 全部做完之后回头通查了一遍自己写的样式。方法不是「再看一遍代码」，而是：

1. **类名有效性扫描** —— 在 5 个路由 × 2 个断点下，抓取每个元素的所有 class，
   再去掉转义反斜杠后的样式表文本里逐一查找。**找出「写在 markup 里但没有任何规则」的类**
   （拼错、token 名写错、这个 Tailwind 版本没有该工具类）——这类错误类型检查和 smoke 都抓不到。
   结果：**0 个**。
2. **冲突工具类扫描** —— 同一元素上出现两个设置同一 CSS 属性的类（如 `block` + `flex`）。
   结果：**0 个**。
3. **假设驱动的验证** —— 重读代码后列出 3 个可疑点，写脚本逐条证实/证伪（见下表）。

### 找到并修复的 Bug

| # | 严重度 | Bug | 根因 | 修法 |
| --- | --- | --- | --- | --- |
| **B1** | 高 | **图片灯箱被卡在 figure 里**：实测只有 `730x418 @ (275,290)`，而不是铺满 1280×900 视口 | `position: fixed` 只在没有祖先建立包含块时才相对视口。`Figure` 的外框用了 `backdrop-blur`，而 `backdrop-filter` 会建立包含块 | 灯箱改用 `createPortal` 挂到 `document.body`。这样对**现在和将来**任何包含块都免疫，而不是要求每个包装层都不能有 filter |
| **B2** | 高 | **每个 `animate-rise` 元素永久残留一个 transform** | `animation-fill-mode: both` 会把**最后一个关键帧永久保留**。而动画出来的 transform 永远解析成矩阵 —— 把关键帧写成 `transform: none` **也没用**，计算值仍是 `matrix(1,0,0,1,0,0)` | 把 `rise`/`pop`/`rule` 的 fill-mode 从 `both` 改成 **`backwards`**：`from` 帧照样立即生效（含 stagger 的 delay 期间），动画结束后回到干净的基样式。实测确认计算值回到 `none` |
| **B3** | 中 | **灯箱不接管也不困住焦点**，尽管写了 `aria-modal="true"`：焦点留在背后的触发按钮上，Tab 能走到页面里去 | 无 | 打开时把焦点移进对话框（关闭按钮），Tab 在对话框内循环，关闭后归还焦点 |
| **B4** | 中 | **同一标签在不同位置显示不同颜色** | 卡片 chip 用 `post.tags` 的下标，筛选 chip 用全局 `tags` 的下标 —— 两个数组顺序不同就串色。**当前只有一篇文章，两个顺序恰好一致，所以一直看不出来** | 两处都改成查全局 `tags` 的下标（`toneFor(tag)`） |
| **B5** | 中 | **4 个元素的持续动画在手机上照跑** | P1.3 重写 `backdrop.tsx` 时把 `max-md:animate-none` 丢了；另外首页 hero 的插画 `animate-bob` 从一开始就漏了 | 补上。其中首页那张是**内容**不是背景，影响更明显 |
| **B6** | 中 | **RSS 的 XSL 在浏览器里完全不生效** | Chrome 把订阅类 MIME（`application/rss+xml`、`application/atom+xml`）当纯文本处理：`document.contentType` 变成 `text/plain`，`<?xml-stylesheet?>` 永远不被执行 | 响应头改成 `application/xml`。**实测对照**：`application/rss+xml` → RAW、`application/atom+xml` → RAW、`application/xml` → 应用样式、`text/xml` → 应用样式。订阅器解析正文，两种都收 |

### 第二轮审查（同一轮内，改用**渲染像素**而不是 token 再查一遍对比度）

第一次对比度审计（§4 那张表）是**从 token 手算**的，方法上有个根本缺陷：
它按「祖先 background-color 链」合成背景，而**这个站每个面板都是毛玻璃**。
`backdrop-filter` 会把背后的流动渐变采样进来，所以**真实背景比链式推导亮得多**
（列表卡日期胶囊下面实测是 `rgb(59,51,69)`，而不是我算的近黑 `#101419`）。

改成从截图采样真实像素后 —— 裁剪区要**排除边框**，否则描边会被当成背景，
把 6:1 的东西量成 14.8:1 —— 又抓到两个：

| # | 严重度 | Bug | 根因 | 修法 |
| --- | --- | --- | --- | --- |
| **B7** | 中 | **激活标签页文字对比度不足** | 药丸是 `from-iris to-blush` 的**渐变**，而渐变要走完整个区间 —— 文字必须通过**最差的那一端**，不是平均值：白字在 `--color-iris` 上 4.54:1（勉强过），在 `--color-blush` 上只有 **2.68:1（不达标）**；深色模式的 `dark:text-ink` 在深色端也只有 2.66:1 | 药丸改用 `from-iris-text to-blush-text`（文字专用深色变体），文字**两套主题统一白色**。实测 **6.59–6.61:1** |
| **B8** | 中 | **深色模式次要文字在玻璃上不稳定**：列表页日期胶囊一度掉到 **4.39:1** | `dark:text-slate-400` 在中性底色上算出来 7.73:1，但玻璃把流动渐变透上来，实际背景亮得多。**而且渐变在动** —— 同一元素连续采样 7 次得到 4.58 → 4.39 的下降趋势，也就是说它**会随时间跌破 AA** | 全域统一规则：**深色模式次要文字用 `slate-300`，不用 `slate-400`**（5 处）。修复后同一元素 7 次采样 min **7.78**，全部 `STABLE-PASS` |

> **B8 的方法论意义**：在一个「背景一直在动」的设计里，对比度**不是一个数值，而是一个区间**。
> 单次采样证明不了任何事 —— 必须沿动画周期多次采样，看**最小值**。
> 现在 8 个代表元素各 7 次采样全部 `STABLE-PASS`（min 5.07 ~ 12.18）。

### 两个"以为有 bug、实测没问题"的

诚实记下来，避免以后又去"修"：

| 怀疑 | 实测结论 |
| --- | --- |
| `Counter` / `CopyButton` 用了 `initial={false}`，会把 keyed 重挂载的关键帧动画压掉 | **没问题**。抓到了非恒等 transform，弹跳正常 |
| 减少动效时 framer 会写 `translateY(0px)`，让大模糊图形退化成每帧重光栅化 | **猜错了**。恒等值下 framer 写的是 **`transform: none`**。已在 `backdrop.tsx` 的注释里更正 |
| 给 Tina 的 `table` 写覆写 | 见 **D13** —— 类型声明与实现不一致是真 bug，已修 |
| DOM 扫描报「激活标签 1.1:1」 | **是扫描方法的假阳性**：药丸是标签的**兄弟节点**，祖先链既看不到它、也处理不了渐变。以像素实测为准（6.59:1） |

### 一条方法论上的教训

**验证脚本自己也会错，而且错得和代码一样安静。**

这一轮里我自己的测试写错了五次：选择器选到了不存在的元素（`.not-prose code` 而不是复制按钮里的 span）、
断言用了 border box 而 `w-[82%]` 是相对 content box（把正确的 82.1% 判成失败）、
统计变量名拼错、`getComputedStyle(...).dataset`（CSSStyleDeclaration 没有这个属性）、
以及把卡片角落的装饰性光斑当成了标签 chip（**输出里的 16px 字号是唯一线索** —— chip 是 12px）。

所以每个"失败"都先怀疑测试而不是代码 —— 但**每个"通过"也要怀疑**：
B1 最初的 P2 验证是**通过**的（只断言了对话框存在），而灯箱当时其实是坏的。
断言要断言到**渲染结果**，不要断言到"元素存在"；涉及渐变或毛玻璃时，
要断言到**像素**，不要断言到"计算样式里的颜色"。**五次我自己犯的错里，四次都是这个毛病。**

