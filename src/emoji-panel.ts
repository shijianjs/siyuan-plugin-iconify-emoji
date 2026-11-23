import { debounce, delay } from "es-toolkit";
import type { IProtyle } from "siyuan";

import type { IconAddMode } from "./constants";
import { IconRef, IconSvgUnavailableError } from "./icon-ref";
import type { IconifyServices } from "./services";

/** 结果分组的标记类名；样式与测试都按它定位。 */
const GROUP_CLASS = "iconify-result-group";

/** 选中图标之后的落点：改文档图标（对话框）或插入正文（`:` 提示）。 */
export class InsertionTarget {
    constructor(readonly mode: IconAddMode, readonly protyle?: IProtyle) {}

    /** 提示插入走 Lute：落盘后要等一会儿再交给思源，让表情表生效。 */
    get isHint(): boolean {
        return this.mode === "hint";
    }
}

/**
 * 一个 emoji 面板（对话框或 `:` 提示）里的 Iconify 结果区。
 * 容器、落点、请求序号都是这个面板自己的状态，跟着面板对象生灭，
 * 不再挂到 DOM 元素上或塞进模块级变量。
 */
export class IconifyResultsPanel {
    /** 搜索框；提示面板没有独立输入框，这里为空。 */
    private readonly input: HTMLElement | null;
    /** 思源渲染结果的原生容器 `.emojis__panel`。 */
    private readonly panel: HTMLElement | null;
    /** 插件注入的结果分组；思源重渲染后会断开，用前重新确认。 */
    private group?: HTMLElement;
    /** 结果分组里的内容容器。 */
    private content?: HTMLElement;
    /** 最近一次检索的序号；用来丢弃过期请求的结果。 */
    private latestRequest = 0;
    /** 已挂上的监听清理函数。 */
    private readonly detachers: (() => void)[] = [];

    constructor(
        private readonly services: IconifyServices,
        private readonly container: HTMLElement,
        private readonly insertion: InsertionTarget,
    ) {
        this.input = container.querySelector(".b3-text-field");
        this.panel = container.querySelector(".emojis__panel");
    }

    /** 挂上搜索框的输入监听与 Enter 拦截；没有搜索框（提示面板）时什么都不做。 */
    attach(): void {
        if (!this.input || this.detachers.length > 0) {
            return;
        }
        const search = debounce(() => void this.search(this.inputValue()), this.services.settings.searchDebounce);
        this.input.addEventListener("input", search);
        this.detachers.push(() => this.input.removeEventListener("input", search));
        this.detachers.push(this.guardEnter(this.container, event => event.target === this.input));
    }

    /** 取消所有监听。 */
    detach(): void {
        this.detachers.forEach(detacher => detacher());
        this.detachers.length = 0;
    }

    /** 检索并渲染；查询不足两个字符时不发请求，也不动已有分组。 */
    async search(query: string): Promise<void> {
        const request = ++this.latestRequest;
        const trimmed = query.trim();
        if (trimmed.length < 2) {
            return;
        }
        const icons = await this.services.search.find(trimmed);
        if (request === this.latestRequest) {
            await this.paint(icons);
        }
    }

    /**
     * 在 listenOn 的捕获阶段拦 Enter：命中未落盘的 Iconify 条目时先保存，再交回思源。
     *
     * 思源的 emoji 面板 / 提示对 Enter 只读 `data-unicode`（applyLinkIcon / fill），不会触发 click，
     * 未落盘的图标因此会被写成 `:iconify/xxx:` 纯文本（issue #36）。
     * 必须挂在思源 keydown 监听节点的祖先上：同元素上的监听按注册顺序触发，后注册的会被思源先执行。
     *
     * @param listenOn 捕获监听的挂载点（对话框是 `.emojis`，提示是 `.protyle`）
     * @param belongs 判定这次按键是否属于本面板
     * @returns 取消监听的清理函数
     */
    guardEnter(listenOn: HTMLElement, belongs: (event: KeyboardEvent) => boolean): () => void {
        const listener = (event: KeyboardEvent) => {
            if (belongs(event)) {
                this.interceptEnter(event);
            }
        };
        listenOn.addEventListener("keydown", listener, true);
        return () => listenOn.removeEventListener("keydown", listener, true);
    }

    /** 尝试接管一次 Enter，返回是否接管；已落盘的条目交给思源自己处理。 */
    interceptEnter(event: KeyboardEvent): boolean {
        if (!IconifyResultsPanel.isPlainEnter(event)) {
            return false;
        }
        const item = this.currentItem();
        if (!item || item.dataset.iconifySaved === "1") {
            return false;
        }
        event.preventDefault();
        event.stopPropagation();
        void this.activate(item);
        return true;
    }

    /** 只处理真实、非输入法、无修饰键的 Enter；合成事件留给思源原生命令。 */
    private static isPlainEnter(event: KeyboardEvent): boolean {
        return event.isTrusted && !event.isComposing && event.key === "Enter" &&
            !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
    }

    /** 用检索结果重建结果分组。 */
    private async paint(icons: IconRef[]): Promise<void> {
        const content = this.ensureContent();
        if (!content) {
            return;
        }
        content.replaceChildren();
        this.group?.classList.toggle("fn__none", icons.length === 0);
        if (icons.length === 0) {
            return;
        }
        this.revealHint();
        const saved = await this.services.store.savedFiles();
        icons.forEach(icon => content.appendChild(this.renderItem(icon, saved.has(icon.fileName))));
        this.selectFirstIfNone(content);
    }

    /** 找到（必要时重建）结果分组的内容容器；原生面板里没有 `.emojis__panel` 时为空。 */
    private ensureContent(): HTMLElement | undefined {
        const panel = this.panel;
        if (!panel) {
            return;
        }
        // 思源每次搜索都会把 `.emojis__panel` 的内容整个重写，旧分组会脱离文档
        if (!this.group?.isConnected) {
            this.mount(panel);
        }
        return this.content;
    }

    /** 把结果分组重新挂到当前面板：存在就复用，不存在才新建。 */
    private mount(panel: HTMLElement): void {
        const group = panel.querySelector<HTMLElement>(`.${GROUP_CLASS}`) ?? panel.appendChild(this.createGroup());
        const content = group.querySelector<HTMLElement>(".emojis__content");
        if (!content) {
            return;
        }
        this.group = group;
        this.content = content;
    }

    /** 新建结果分组：标题 + 内容容器。 */
    private createGroup(): HTMLElement {
        const group = document.createElement("div");
        group.classList.add(GROUP_CLASS);

        const title = document.createElement("div");
        // 不能用 emojis__title：带上它之后思源会把结果当成输入内容一并处理
        title.classList.add("iconify_emojis__title");
        title.textContent = "Iconify";
        title.setAttribute("data-type", "iconify");

        const content = document.createElement("div");
        content.classList.add("emojis__content");
        group.append(title, content);
        return group;
    }

    /** 提示面板默认是 `fn__none`，有结果时显出来。 */
    private revealHint(): void {
        const parent = this.container.parentElement;
        if (parent?.classList.contains("protyle-hint") && parent.classList.contains("fn__none")) {
            parent.classList.remove("fn__none");
        }
    }

    /** 一个结果按钮：图标本体 + 数据 + 未落盘时的点击保存逻辑。 */
    private renderItem(icon: IconRef, saved: boolean): HTMLElement {
        const button = document.createElement("button");
        button.classList.add("emojis__item", "ariaLabel");
        button.dataset.unicode = icon.unicode;
        button.dataset.iconName = icon.name;
        button.setAttribute("aria-label", icon.name);
        button.appendChild(this.renderGlyph(icon));
        if (saved) {
            button.dataset.iconifySaved = "1";
        } else {
            button.onclick = (event: MouseEvent) => void this.onItemClick(event, button);
        }
        return button;
    }

    /** 图标本体：iconify-icon 组件 + 与图标名绑定的颜色。 */
    private renderGlyph(icon: IconRef): HTMLElement {
        const glyph = document.createElement("iconify-icon");
        glyph.setAttribute("icon", icon.name);
        glyph.style.color = icon.color;
        return glyph;
    }

    /** 真实点击：先落盘再重新派发 click，让思源的原生流程接手。 */
    private async onItemClick(event: MouseEvent, button: HTMLElement): Promise<void> {
        // 合成事件：文件已经落盘，这次点击就是交给思源的
        if (!event.isTrusted) {
            return;
        }
        // 阻止冒泡，避免思源在 svg 落盘前就把它设置进去
        event.stopPropagation();
        await this.activate(button);
    }

    /** 落盘（若需要）后让思源执行真正的设置 / 插入；鼠标与 Enter 共用这一条路径。 */
    private async activate(button: HTMLElement): Promise<void> {
        try {
            if (button.dataset.iconifySaved !== "1" && !await this.save(button)) {
                return;
            }
        } catch (err) {
            // 写盘 / 刷新失败：宁可不动，也不要把不存在的图标交给思源
            console.warn("Iconify 图标保存失败", err);
            return;
        }
        if (this.insertion.isHint) {
            await delay(this.services.settings.newIconHintDelay);
        }
        button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    }

    /** 把条目对应的图标写进 emoji 目录，并刷新 Lute 的表情表；svg 取不到时返回 false。 */
    private async save(button: HTMLElement): Promise<boolean> {
        const icon = IconRef.of(button.dataset.iconName);
        if (!icon) {
            return false;
        }
        try {
            const svg = await icon.svgFrom(button.querySelector<HTMLElement>("iconify-icon"));
            await this.services.store.save(icon, svg);
        } catch (err) {
            // 只有「取不到 svg」是可以降级的情况，其它异常照旧抛给调用方
            if (!(err instanceof IconSvgUnavailableError)) {
                throw err;
            }
            console.warn("Iconify 图标获取失败", err);
            return false;
        }
        button.dataset.iconifySaved = "1";
        await this.services.store.syncEmojiRegistry(this.insertion.protyle);
        return true;
    }

    /** 面板里没有原生选中项时，把第一个 Iconify 结果标为当前项，让键盘操作有可见焦点。 */
    private selectFirstIfNone(content: HTMLElement): void {
        if (this.panel?.querySelector(".emojis__item--current")) {
            return;
        }
        content.querySelector<HTMLElement>(".emojis__item")?.classList.add("emojis__item--current");
    }

    /** 面板里当前被键盘选中的 Iconify 条目；选中的是原生表情时为空。 */
    private currentItem(): HTMLElement | null {
        const current = this.panel?.querySelector<HTMLElement>(".emojis__item--current");
        return current?.closest(`.${GROUP_CLASS}`) ? current : null;
    }

    /** 搜索框里的当前内容。 */
    private inputValue(): string {
        return (this.input as HTMLInputElement | null)?.value ?? "";
    }
}

/** 容器到结果面板的注册表：同一个 `.emojis` 只建一个面板、只挂一次监听。 */
export class PanelRegistry {
    /** 按容器复用面板；容器被回收时面板跟着回收。 */
    private readonly panels = new WeakMap<HTMLElement, IconifyResultsPanel>();

    constructor(private readonly services: IconifyServices) {}

    /** 取容器对应的面板，不存在就创建并挂上监听。 */
    get(container: HTMLElement, insertion: InsertionTarget): IconifyResultsPanel {
        let panel = this.panels.get(container);
        if (!panel) {
            panel = new IconifyResultsPanel(this.services, container, insertion);
            this.panels.set(container, panel);
            panel.attach();
        }
        return panel;
    }
}
