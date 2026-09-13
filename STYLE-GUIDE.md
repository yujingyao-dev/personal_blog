# 样式项目文档（STYLE-GUIDE）

> **给接手这个项目的 agent 的精炼指引。** 先读 `AGENTS.md`，再读这份。
> 这份只讲**样式**：视觉语言、改哪里、不能碰什么、怎么验证。
> 完整决策理由与实测数据在 `STYLE-DIRECTIONS.md`（长，当附录查）。
> **本文件是结论，不是过程。**

---

## 一、视觉语言：三根支柱

| 支柱 | 做法 | 落点 |
| --- | --- | --- |
| **毛玻璃** | `bg-white/60` + `backdrop-blur-xl` + `backdrop-saturate-125/150`；高光来自阴影 token 里的 `inset` | 各面板组件 |
| **大尺寸流动渐变几何** | 46–62rem 图形 + 四色渐变 + 缓慢自转/漂流 | `src/components/site/backdrop.tsx` |
| **Neo-Brutalism** | 硬描边 `--color-ink`/`--color-chalk` + 零模糊硬偏移投影 + `font-black` + 手绘 SVG 插画 | 全站 className；`illustrations.tsx` |

**一条划分规则（别破坏它）**：

> **框用来标记「组件」，不用来标记「页面正文」。**
> 卡片 / Callout / Tabs / 代码块 / Figure / 计数器要框；
> 文章正文、关于页、404 **不套框**（可读性由背景层的「竖向阅读带」保证）。

---

## 二、改样式的入口

**`src/app/globals.css` 的 `@theme` 块是唯一来源。** 改颜色/阴影/动效前先看那里。

### 颜色角色

| token | 用途 |
| --- | --- |
| `--color-ink` / `--color-chalk` | 浅色/深色模式的描边与正文 |
| `--color-paper` / `--color-midnight` | 浅色/深色模式的底色 |
| `--color-iris` `--color-blush` `--color-sun` `--color-mint` | 四个强调色 —— **只用于填充 / 描边 / 渐变** |
| `--color-iris-text` `--color-blush-text` | **文字专用**深色变体 |

> ⚠️ **最容易犯的错**：品牌色是按「填充」挑的，直接当正文色**不达标**（`#6d5cff` 在纸底上只有 4.14:1）。
> 文字一律走 `-text` 后缀。

### 常用组合

```
玻璃面板   rounded-2xl border-[3px] border-ink/85 bg-white/60
           shadow-brutal backdrop-blur-xl backdrop-saturate-125
           dark:border-chalk/20 dark:bg-white/[0.04] dark:shadow-chalk

次级文字   text-ink/75 dark:text-slate-300      ← 深色模式不要用 slate-400，见 L2

标题字号   text-display / text-headline / text-title   ← CJK 友好，别用 text-5xl 之类
```

### 深色模式策略

**属性驱动，不是媒体查询**：`@custom-variant dark (&:where([data-theme='dark'], [data-theme='dark'] *))`。
`layout.tsx` 里一段**阻塞内联脚本**在首屏绘制前把 `data-theme` 写到 `<html>` 上。

主题按钮是**两态**（浅 ↔ 深），`src/components/site/theme-toggle.tsx`，**无 React state**：
两个图标都在 DOM 里，由 `[[data-theme=dark]_&]:hidden` 决定显示哪个。

> 存储键 `theme` 在 `layout.tsx` 的脚本与 `theme-toggle.tsx` 里**各写了一份**（脚本是无法 import 的纯字符串）。**改一处必须改另一处。**
> 没有点击过的访客仍然跟随系统：脚本会在没有存储值时读 `prefers-color-scheme`。

---

## 三、铁律（R1：移动端一律不加动效）

**768px 以下：没有动画、没有过渡、没有视差。** 这是性能结论驱动的硬规则，不是偏好。

改动它需要**同时动四处**，缺一处就漏：

| # | 位置 | 管什么 |
| --- | --- | --- |
| 1 | `globals.css` 的 `@media (width < 48rem)` | 所有 CSS 动效 |
| 2 | `motion-provider.tsx` | Framer 的动画（`reducedMotion="always"`） |
| 3 | `use-no-motion.ts` | **唯一判据来源**；新增动效组件必须用它，不能用 `useReducedMotion()` |
| 4 | 各组件里的 `max-md:animate-none` | 持续动画的元素 |

**为什么需要 2 和 3 两套**：`MotionConfig` 管不到**直接被驱动的 MotionValue**（`useSpring`）。
阅读进度条和背景视差都属于这一类，靠 `useNoMotion()` 换成常量才真停。

### 动效分工

- **入场动画用 CSS**（`animate-rise` / `animate-rule` / `animate-pop`）：不依赖 JS，服务端组件里也能用
- **交互动效用 Framer**：`whileHover`、`layoutId`、滚动视差、页面过渡、指针扰动
- **禁止**给正文/列表内容设 `initial={{opacity:0}}` —— 会被序列化进预渲染 HTML，无 JS 访客看到空白页
- **禁止**用 `useReducedMotion()` 分支 **props**（SSR 返回 `null` → hydration mismatch）

### 已知的 CSS 陷阱

```css
/* ❌ animation 是单一简写属性，后定义的会整个覆盖前一个 */
class="animate-flow animate-tumble"

/* ✅ 用合并 token，且两个动画必须动不同的 CSS 属性 */
--animate-flow-tumble: water 43s …, flow 32s …, tumble 78s …

/* ❌ fill-mode: both 会把最后一个关键帧永久保留 —— 动画出来的 transform
      永远解析成矩阵，把关键帧写成 `transform: none` 也没用 */
--animate-rise: rise 0.75s … both;

/* ✅ backwards 让 from 帧立即生效（含 stagger 的 delay），结束后回到干净基样式 */
--animate-rise: rise 0.75s … backwards;
```

---

## 四、硬约束（破坏了不会编译报错，但会让门禁失败）

| 契约 | 位置 | 谁在依赖 |
| --- | --- | --- |
| `<aside>` 必须带字面量 `border-sky-300` / `border-amber-300` | `callout-styles.ts` | `interaction-smoke` 用 `aside.border-sky-300` 选择 |
| 计数器数值必须是**唯一**的 `strong.tabular-nums`，不能被 `AnimatePresence` 包住 | `counter.tsx` | 同上，`.first()` 会读到退场中的旧值 |
| 标签页面板只能有**一个** `role="tabpanel"` | `tabs.tsx` | 同上 |
| 客户端 bundle 里**不能出现** `relativePath` / `postConnection` / `pageConnection` | 任何 `'use client'` 文件 | `check:runtime`（会让**构建失败**） |
| `AnimatePresence` 必须是 `initial={false}` | `post-list.tsx` | 否则静态 HTML 里每张卡都是 `opacity:0` |
| `<html>` 上的 `suppressHydrationWarning` 不能删 | `layout.tsx` | 阻塞脚本故意写了 React 没渲染的属性 |
| `<Backdrop />` 必须留在 `<MotionProvider>` **内部** | `layout.tsx` | `m.*` 在 LazyMotion 外**不绑定 MotionValue**，transform 会静默塌缩成 `none` |
| 用了 `TiltCard` 的卡片不能再写 `hover:-translate-y-*` | `page.tsx`、`post-list.tsx` | 行内 transform 会覆盖 class |
| 视差/push 必须加在 **wrapper** 上 | `backdrop.tsx` | CSS 动画优先级高于行内样式 |
| 新增可插入组件必须同步 **4 处** | 见 `AGENTS.md` 第二节 | 内容门禁 |

---

## 五、常见任务

**加一个可插入组件** → 严格按 `AGENTS.md` 第二节的 4 处同步。样式用第二节的常用组合。

**加一个动效组件** → 必须 `useNoMotion()` 门控；持续动画的元素必须带 `max-md:animate-none`；
Framer 用 `m.*`（不是 `motion.*`，`LazyMotion strict` 会抛错）。

**改颜色** → 先改 `@theme` token；改完**必须重跑对比度像素测量**（见 L2），不要只算 token。

**加插画** → `src/components/site/illustrations.tsx`，粗描边 + 平涂 + 偏移硬阴影，
描边填充全走主题 token（深色模式不需要第二套图）。**不要为了凑数发明装饰** —— 只画真实存在的状态。

**加远程图床** → `src/lib/image-hosts.ts` 的 `ALLOWED_IMAGE_HOSTS`。

---

## 六、验证

```bash
npm run typecheck        # 必须 0
npm run test:unit        # 离线门禁（含移动端零动效的 9 条规则）
npm run build:local      # 需要 npm run dev 在跑：内容校验 + next build + runtime + routes
npm run smoke            # http / admin / visual / interaction / motion / save
```

**只改样式也必须跑前两条 + `build:local`。** 涉及交互/布局的再跑 `smoke`。

> `check:runtime` 与 `check:routes` 会读构建产物，**看到 `content/`、`tina/` 有 diff 就该警惕** ——
> 样式改动不应该改动它们。

---

## 七、我犯过的错误（请不要再犯）

### L1 —— 断言要断言到**渲染结果**，不是「元素存在」

**这是我最主要的失败模式，出现了 4 次：**

| 我写的断言 | 实际发生 |
| --- | --- |
| 「`[role=dialog]` 存在」 | 灯箱**真实尺寸只有 730×418**，被 `backdrop-filter` 困在 figure 里 —— 断言通过，功能是坏的 |
| 「wrapper 的 `style` 属性含 `transform`」 | `transform: none` 也含这三个字 → **滚动视差死了整整两轮没人发现** |
| 用 border box 算 `w-[82%]` | 该值是相对 content box 的，正确的 82.1% 被我判成失败 |
| `li span.rounded-full` 取标签 chip | 先匹配到卡片角落的**装饰光斑**，量了个假元素（输出里的 16px 字号是唯一线索 —— chip 是 12px） |

**做法**：断言到**尺寸、颜色、位置、像素**这些渲染结果。
涉及"应该不动"的东西，就用**定格比对**（拍两张快照断言完全相同），并配一个**反向对照**
（断言桌面**必须**看到变化）—— 否则一个永远比较两个空字符串的坏测试也会显示"通过"。

### L2 —— 有毛玻璃和渐变时，**token 计算不算数**

我第一版对比度表是**从 token 手算**的。它有两个根本缺陷：

1. **`backdrop-filter` 会把背后的流动渐变采样进来** —— 玻璃上的真实背景比我算的亮得多
   （列表卡日期胶囊底下实测 `rgb(59,51,69)`，不是近黑的 `#101419`）。
   漏掉的两个真 bug：渐变药丸的白字在 blush 端只有 **2.68:1**；深色次要文字
   **会随时间跌破 AA**（7 次采样 4.58 → 4.39 单调下降）。
2. **渐变要走完整个区间，文字必须通过最差的那一端**，不是平均值。
3. 像素采样**必须排除边框**，否则描边会被当成背景（我把 6:1 量成了 14.84:1）。

**做法**：涉及渐变或毛玻璃时，**从截图采样真实像素**；
并且**沿动画周期多次采样看最小值** —— 背景一直在动时，对比度**不是一个数值，而是一个区间**。
深色模式次要文字统一用 `slate-300`，不用 `slate-400`。

### L3 —— **先读实现，别信 `.d.ts`**

Tina 的 `Components['table']` 类型声明是 `{ tableRows }`，但实现（`case "table"`）传的是 **`children`**。
照类型写覆写 → **整站表格消失，`tsc` 不报错**（`satisfies` 也拦不住，因为类型和运行时本来就不一致）。

**做法**：给第三方库的内置节点写覆写前，去 `node_modules/<pkg>/dist/` **读实现**。

### L4 —— 零值哨兵要用**显式信号**，不要用 `=== 0`

我用 `pointerX === 0 && pointerY === 0` 表示「没有光标」。**错两次**：

- 弹簧只停在 `restDelta` 之内、不会正好落在 0，哨兵永不触发；
- 推力大小来自高斯衰减、**与光标离原点的距离无关** —— 残留的 0.03 仍代表「光标在左上角」，
  照样推出满额 ~57px。结果**动效永不释放**，四个图形永久偏着。

**做法**：用独立的 0..1 `strength` 信号表示"激活"，并在末端吸附
（`v < 0.01 ? 0 : v`）让 wrapper 能**精确回到 `transform: none`**，不留 0.05px 残影。

### L5 —— `animation` 是简写属性；`both` 会永久留痕

- 两个 `animate-*` 放一个元素上 → 后定义的**整个覆盖**前一个（静默）。
  解法：合并 token，且**每个动画只动一个 CSS 属性**（`translate` / `rotate` / `background-position`）。
- `fill-mode: both` 会**永久保留最后一个关键帧**。而动画出来的 `transform` 永远解析成矩阵 ——
  **把关键帧写成 `transform: none` 也没用**，计算值仍是 `matrix(1,0,0,1,0,0)`。
  后果：每个 `animate-rise` 元素永久残留 transform，成为 `position: fixed` 的包含块
  （灯箱就是这么被困住的），还白占一个合成图层。解法：用 `backwards`。

### L6 —— `m.*` 在 `LazyMotion` 外面**静默失效**

`<Backdrop />` 一度被放在 `<MotionProvider>` **外面**。`m.*` 的能力来自外层 `<LazyMotion>`；
在外面它照常渲染标记但**从不绑定 MotionValue**，所有 transform 塌缩成 `none` —— **不报错**。
这个 bug 被 L1 里那条坏断言掩盖了两轮。

### L7 —— 我看不出我以为我看得出的东西

我把一张 900px 缩略图上的深色截图误读成"内容发灰"，一度以为改坏了。
**实测推翻了它**：h1 区域最亮像素 231/255、计算色 `lab(91.7…)` 接近白，
整页统计与旧预览几乎一致（最亮 238 vs 255，均值 44 vs 42）。

**做法**：视觉判断有疑问时，**量像素**，不要靠看缩略图下结论。

---

## 八、经验（方法论）

### E1 —— 测试自己也会错，而且错得和代码一样安静

上面 4 次「断言错对象」+ 1 次「相信拦截能代表真实导航」+ 1 次「变量名拼错」都是**我的测试**出错，
不是代码出错。所以：**每个「失败」先怀疑测试** —— 但**每个「通过」也要怀疑**。
L1 那条灯箱断言就是"通过"的，而功能是坏的。

> **一次真实教训**：我用 Playwright 的 `route.fulfill` 测 RSS 的 XSL，
> 它绕过 Chrome 的订阅 MIME 检测，报了个假"通过"。
> 换成真实源站逐个 MIME 测才拿到真相（Chrome 把 `application/rss+xml` 当纯文本，XSL 永不执行）。

### E2 —— 先量化工具的误差，再下结论

同一状态在不同 harness 之间可以差 **15%**。所以**小于 ~15% 的差异不能当结论**。
给动效做性能评估时，**每个场景都要配一个对照**（隐藏背景 / 关闭特性 / 不同宽度），
只报**差值**，不要报绝对值。悬停场景里 `page.mouse.move` 的 CDP 往返本身就吃掉了几百 ms/s，
不设对照就会把测试驱动的开销算到代码头上。

### E3 —— 性能：成本是「每帧」的，不是「每图形」的

实测结论：页面**只要在动**就有一笔恒定的每帧开销（4x 降频约 180 ms/s 主线程），
**在此之上每个动画图层再加 20–30 ms/s**。

- **`filter: blur()` 几乎免费** —— 去掉它没有任何收益
- **`layout` 永远是 0** —— 只动 `transform` / `background-position` / `translate` 就不会触发重排
- **`border-radius` 动画最贵**（每帧重新光栅化），已用固定圆角 + 旋转替代
- **不要加 `will-change`**（实测有害）；**不要**把 wrapper 的 transform 设成 `none`（实测更差，
  大模糊图形会退化成每帧重光栅化）

### E4 —— 新增动效的成本几乎为零，只要它**本来就在动**

背景那几个元素本来就在动（`flow` 动 background-position、`tumble` 动 transform），
再加一个可合成的 `translate` **不产生新的重绘**。同理，指针扰动用
「2 个弹簧 + N 个纯 `useTransform` 数学 + rAF 合并 pointermove」，开销落在噪声里。

**先问「这个页面本来就在动吗」，再决定要不要担心成本。**

### E5 —— 遇到"看起来像渲染问题"的现象，先做假设驱动的排查

我这一轮最有效的做法不是"再看一遍代码"，而是：
**重读代码 → 列出可疑点 → 写脚本逐条证实/证伪**。
`Backdrop` 那个 bug 就是这样挖出来的：探针显示 MotionValue 算得完全正确
（`push1: [-36.4, -25.8]`）而 DOM 是 `none`，一步就把范围缩到了绑定层。

### E6 —— 一个审查方法值得复用

**类名有效性扫描**：在多个路由 × 断点下抓取每个元素的所有 class，
去掉转义反斜杠后在样式表文本里逐一查找，找出**「写在 markup 里但没有任何规则」的类**
（拼错、token 名写错、这个 Tailwind 版本没有该工具类）。
这类错误**类型检查和 smoke 都抓不到**。顺带扫**冲突工具类**（同一元素两个设置同一属性的类）。

### E7 —— 记录「事实」和「推断」的区别

`STYLE-DIRECTIONS.md` 里我把**实测数据**、**被推翻的假设**、**已知盲区**分开写。
这份文档里也保留了「以为有 bug、实测没问题」的条目 ——
**不写下来，下一轮会有人去"修"一个不是问题的问题。**

---

## 九、已知局限（不要假装它们不存在）

1. **没有真机验证**。全部性能数据来自桌面 Chrome + CPU 降频，GPU 是 RTX 5080，
   **光栅化成本被严重低估**。手机端现在不动，所以不受影响；**但若要在手机加回动效，必须先真机验证**。
2. **源码门禁有盲区**：它只能发现「整个文件没有 `useNoMotion()`」，
   无法判断某个**具体**动画是否真被门控。那类问题由运行时门禁（`motion-smoke`，定格比对）兜底。
3. **页面切换过渡、悬停倾斜**的真实成本没有干净归因（被测试驱动淹没）。
4. **只有一篇文章**：文章列表的筛选、标签配色、分页、空态在真实数据量下**未经检验**。
   B4（同一标签两个颜色）就是被这一点掩盖的 —— 修了，但成因提醒我们：**单条数据测不出顺序相关的问题**。
