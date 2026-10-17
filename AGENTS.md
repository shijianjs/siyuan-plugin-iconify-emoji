# AGENTS.md

思源 iconify emoji 插件的开发与集成测试约定。跨上下文需要知道的事实集中在这里，具体实现见代码。

## 1. 项目与命令

- pnpm + Vite + Svelte 模板插件；插件名 `siyuan-plugin-iconify-emoji`（`plugin.json` 里的 `name` 是内核识别的唯一键）。
- `pnpm dev`：watch 开发构建，产物在 `dev/`，livereload 只在 `WATCH=1` 时启用（见 `vite.config.ts`）。
- `pnpm build:dev`：一次性开发构建，产物同样写入 `dev/`，进程会正常结束；`build:dev` **不**打 `package.zip`。
- `pnpm build`：生产构建并打包 `package.zip`（zip 只在 `NODE_ENV=production` 时启用）。
- `pnpm test` = `build:dev` + `playwright test`；`pnpm test:only` 跳过构建；`pnpm test:typecheck` 只做类型检查。

## 2. 本地开发环境

- 本地思源内核：`http://127.0.0.1:6806`（工作空间 `S:\my\siyuan\siyuan-debug`）。可用 `SIYUAN_BASE_URL` 覆盖。
- 工作空间里的插件目录是指向本仓库 `dev/` 的**符号链接**（`pnpm make-link`），所以本地改代码后要 `pnpm dev` 或 `pnpm build:dev` 才能生效。
- 前端入口固定用 `/stage/build/desktop/`，不要改成浏览器版资源（原因见第 4 节）。

## 3. 集成测试（Playwright）

- 用例在 `tests/`，配置 `playwright.config.ts`，风格参考 `S:\workspace\github\siyuan-note\siyuan-testing`（不要直接依赖它）。
- 串行执行（`workers: 1`）：emoji 面板、设置面板都是全局 UI 状态。
- 所有文档建在 `Iconify E2E Testing` 笔记本，标题带功能前缀 + 随机后缀；通过用例会删除自己创建的文档，失败/超时则保留并作为附件写入报告。
- `tests/helpers/` 放复用逻辑：`siyuanAPI.ts`（内核 API）、`runtime.ts`（打开工作空间 / 弹窗）、`plugin.ts`（emoji 面板与设置面板定位）、`settings.ts`（设置面板，按当前界面语言定位，避免写死中英文）、`iconifyApi.ts`（拦截 iconify/yesicon 外部请求的本地桩）。
- `global-setup` / `global-teardown` 负责：校验内核、准备笔记本、**打开集市信任与全局插件开关**、启用插件，并在结束后原样还原。
- **本地工作空间可能装了别的 emoji 插件**（`siyuan-plugin-emoji-market` / `siyuan-plugin-emoji-enhance`），它们会往 emoji 提示面板注入内容并重渲染面板，把本插件注入的分组清掉，导致提示类用例偶发失败。`global-setup` 会在测试期间临时禁用它们、结束后恢复（CI 的全新工作空间只有本插件，不会触发）。新增测试时若还发现其它干扰插件，加进 `tests/global-setup.ts` 的 `CONFLICTING_PLUGINS`。

### 内核侧必须知道的事实

- 插件设置保存在 `data/storage/petal/<plugin>/settings.json`（思源 3.8 已从 `data/plugins/<name>/` 迁走）。`/api/file/getFile` 成功时返回的是**原始文件内容**，不是 `{code,msg,data}` 包装。
- `Setting` 对话框底部有「保存」按钮，插件设置只有点保存才会落盘并生效；UI 上的输入本身不会自动保存（`SettingUtils` 没给这些项绑 `action.callback`），这是既有设计，不要在测试里假设自动保存。
- 关闭对话框统一用 `Escape`；`b3-dialog__close` 常被 `fn__none` 隐藏。
- **emoji 面板的 `data-key` 挂在 Dialog 的**最外层**包装 `div` 上，不是内部的 `.b3-dialog`**。所以定位要用 `[data-key="dialog-emojis"]`，再往下找 `.b3-dialog__container` / `.emojis`。
- emoji 面板通过文档题头的「添加图标」按钮打开：`.protyle-background__action [data-type="icon"]`（先 hover `.protyle-top`）。面板里 `.emojis` 下有多个 `.b3-text-field`，插件的搜索监听只挂在**第一个**（搜索框）上，标记属性是 `input.hasIconifyListener`。
- 文档正文里的 `:关键字` 提示（hint）由 `.protyle-hint .emojis` 承载，插件把结果分组追加进去；判断插件是否生效看 `.protyle-hint .iconify-result-group` 的 `.emojis__item`。
- 插件把 iconify 图标保存为自定义 emoji，落到 `data/emojis/iconify/<prefix>--<name>.svg`；`readDir` / `removeFile` 都用工作空间绝对路径（`/data/emojis/iconify/...`）。

### 走过的弯路，不要再走

- **一开始用的是 `b3log/siyuan` 官方 Docker 镜像，跑不通**。原因：Docker 镜像提供的是浏览器前端资源，`app/src/util/hostCapabilities.ts` 的 `plugins: !remoteKernel || trustedExtensions` 直接为 false，前端**完全不加载任何插件**。现象是页面能渲染但插件 UI/行为都不存在，`/api/petal/loadPetals` 返回空数组。已改为官方桌面版内核，**不要再退回 docker 镜像**。
- 新版内核在容器模式下强制要求 `SIYUAN_ACCESS_AUTH_CODE`（或 OIDC），否则拒绝启动；桌面版 kernel 二进制不需要该变量。
- AppImage 资源名不带 `v` 前缀：`siyuan-<版本>-linux.AppImage`；解压后内核在 `resources/kernel/SiYuan-Kernel`，前端资源在 `resources/stage/build/desktop/`（不是 `app/stage/...`）。工作流里用 `find` 定位，别写死路径。
- **真正的根因**：`kernel/model/plugin.go` 的 `petalsEnabled()` 在 `container == std | docker` 时要求 `conf.bazaar.trust === true`，否则内核静默不加载任何插件。全新工作空间默认 `trust=false`，所以 CI 里必须由 `global-setup` 打开集市信任（同时确保 `petalDisabled=false`），否则所有用例都会因为找不到插件 UI 而失败。
- `setup-node` 的 `cache: pnpm` 要求先装 pnpm；且 `pnpm-lock.yaml` 必须在版本控制里，否则 CI 装依赖直接失败。
- YAML 文件写入要避免 UTF-8 BOM：带 BOM 的 workflow 会被 GitHub 判为「workflow file issue」而整个 run 失败。workflow 内统一用英文注释。
- **提示（hint）功能曾经整个失效**：源码里把 `hint.getKey(currentLineValue, protyle.options.hint.extend)` 当成了两参调用，实际签名是 `getKey(currentLineValue, textAfterCaret, extend)`，导致内部 `extend.forEach` 抛 `Cannot read properties of undefined`。修复是补齐第三个参数（`textAfterCaret` 只服务块引提示，emoji 提示传空串即可）。`tests/iconify-hint.spec.ts` 覆盖了这条回归。
- **Linux 上从提示插入“新保存”的图标会变成纯文本**：插件用 `putFile` 直接写 `data/emojis/iconify/*.svg`，不走思源「添加自定义表情」的前端流程，因此不会调用 `putEmojis` 刷新 Lute；而内核的 emojis 目录监听（`kernel/model/emojis_watcher.go`）只 watch `data/emojis` 根目录，**Linux 的 inotify 不递归**，写子目录不会触发 `reloadEmojiConf`。结果：提示插入时 Lute 不认识该表情，`genEmojiInsertHTML` 生成的 `:iconify/xxx:` 被当普通文本插入（Windows 因为 ReadDirectoryChangesW 递归监听而恰好正常，所以本地测不出来）。修复：保存后显式拉一次 `/api/system/getEmojiConf` 并 `protyle.lute.PutEmojis(...)` 重建自定义表情表（见 `reloadIconifyEmojis`）。`tests/iconify-hint.spec.ts` 的插入用例就是这条回归的守门测试。

### 外部依赖用本地桩

- 搜索与图标数据都走外网（`api.iconify.design`、`yesicon.app`），用例必须用 `tests/helpers/iconifyApi.ts` 的 `mockIconifyApis(page, ...)` 拦截，不能用真外网，否则 CI 会受第三方限流/可用性影响。
- iconify-icon 组件渲染图标时还会请求 `https://api.iconify.design/<prefix>.json?icons=<name>`，桩必须一并返回该格式的图标数据，否则 `getIcon` 拿不到数据、点击保存路径会失败。

## 4. CI 流水线（`.github/workflows/e2e.yml`）

push / PR 到 `main` 自动运行；`gh workflow run e2e.yml -f spec=tests/xxx.spec.ts` 可只跑单个文件。

- 流程：`pnpm install` → `build:dev` → 复制 `dev/` 到 `ci-workspace/data/plugins/<name>` → 下载官方**桌面版 AppImage** → `--appimage-extract` → `SiYuan-Kernel serve --wd=<appdir> --workspace=ci-workspace --port=6806` → `playwright install --with-deps chrome` → 跑 Playwright。
- 失败上传 `playwright-report` / `test-results` / `siyuan-kernel.log`；始终打印内核的 petal/plugin 日志。

### 持续集成（Dependabot 与自动合并）

- `.github/dependabot.yml`：每周一检查 npm 依赖与 GitHub Actions，上限 5 个并发 PR，打 `dependencies` 标签，commit 前缀 `chore(deps)` / `chore(ci)`。
- `.github/workflows/auto-merge.yml`：在 PR 的 E2E 全部通过后 squash 合并。
  - 触发：`pull_request_target`（opened / reopened / synchronize / ready_for_review），也支持 `workflow_dispatch -f pr=<编号>` 手动补跑。
  - **等待时必须忽略本工作流自己的 check**（`Merge when checks pass`），否则它永远处于 in_progress，任务会自锁到超时。
  - **有 check 明确失败时直接退出**，不要傻等：失败态（FAILURE/CANCELLED/TIMED_OUT/ACTION_REQUIRED）不会变成 SUCCESS，原本会一直等到 45 分钟超时。
  - `concurrency` 组要用 `${{ github.event.inputs.pr || github.event.pull_request.number }}`：`workflow_dispatch` 没有 `pull_request` 负载，否则所有手动触发的 run 会互相取消。
  - GitHub 异步计算 mergeable，会先返回 `UNKNOWN`，需要轮询重试几次。
  - `GITHUB_TOKEN` **没有 `workflows` 权限**（写进 `permissions:` 会直接让 workflow 解析失败），因此修改 `.github/workflows/**` 的 PR（例如 Dependabot 升级 actions）默认跳过，留给人工合并。判断「有没有配置 PAT」要用 `HAS_PAT: ${{ secrets.GH_PAT != '' }}`，**不要**用 `[ "$GH_TOKEN" = "${GITHUB_TOKEN:-}" ]`：GITHUB_TOKEN 不会作为环境变量导出，该比较恒为 false，会退化成硬合并并报 `refusing to allow a GitHub App to create or update workflow ... without workflows permission`。若配置了细粒度 PAT 密钥 `GH_PAT`（contents + pull requests write），则用 `GH_PAT` 合并，这类 PR 也能自动合。
- 改动 CI 后建议用 `gh run view <id>` 复核线上结果；workflow 文件不能带 UTF-8 BOM。

## 5. 提交约定

- 除非用户明确要求，不要自行 commit / push。
- 涉及测试或 CI 的改动请实际跑一次：本地 `npx playwright test`，并用 `gh run view <id>` 确认线上流水线状态。
