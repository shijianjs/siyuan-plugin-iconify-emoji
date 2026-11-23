import { debounce } from "es-toolkit";
import type { IProtyle } from "siyuan";

import { InsertionTarget, type IconifyResultsPanel, PanelRegistry } from "./emoji-panel";
import type { IconifyServices } from "./services";

/** 思源提示面板的类型（`IProtyle.hint`）。 */
type HintPanel = NonNullable<IProtyle["hint"]>;

/**
 * 一个编辑器实例上的 `:` 提示接线：输入时检索并注入结果，Enter 时先落盘再插入。
 * 状态跟着 protyle 走，编辑器销毁时 `stop()` 清干净。
 */
export class HintBinding {
    /** 落点描述：提示面板把选中的图标插进这个编辑器。 */
    private readonly insertion: InsertionTarget;
    /** 输入停顿后再检索；同一个编辑器共用一个防抖实例。 */
    private readonly refresh: () => void;
    /** 已挂上的监听清理函数。 */
    private readonly detachers: (() => void)[] = [];

    constructor(
        private readonly services: IconifyServices,
        private readonly protyle: IProtyle,
        private readonly panels: PanelRegistry,
    ) {
        this.insertion = new InsertionTarget("hint", protyle);
        this.refresh = debounce(() => void this.searchHint(), services.settings.searchDebounce);
    }

    /** 编辑器正文元素；protyle 还没渲染出来时为空。 */
    private get editor(): HTMLElement | undefined {
        return this.protyle.wysiwyg?.element;
    }

    /** 开始监听；重复调用无副作用。 */
    start(): void {
        const editor = this.editor;
        if (!editor || this.detachers.length > 0) {
            return;
        }
        editor.addEventListener("input", this.refresh);
        this.detachers.push(() => editor.removeEventListener("input", this.refresh));
        this.detachers.push(this.guardEnter());
    }

    /** 停止监听。 */
    stop(): void {
        this.detachers.forEach(detacher => detacher());
        this.detachers.length = 0;
    }

    /** 输入后：算出光标前的 `:关键字`，交给这个提示里的结果面板检索。 */
    private async searchHint(): Promise<void> {
        if (!this.editor?.isConnected) {
            return;
        }
        const key = this.currentKey();
        if (!key) {
            return;
        }
        await this.panel()?.search(key);
    }

    /** 光标前的 `:关键字`；不在 `:` 提示、没开提示功能、或关键字带空白时为空串。 */
    private currentKey(): string {
        const hint = this.protyle.hint;
        if (!hint || hint.splitChar !== ":" || !this.services.settings.enableIconHint) {
            return "";
        }
        const key = this.keyAtCaret(hint);
        return key && !/\s/.test(key) ? key : "";
    }

    /** 用思源自己的 hint.getKey 解析关键字，`:` 提示的语法变化会自动跟上。 */
    private keyAtCaret(hint: HintPanel): string {
        // 签名是 (currentLineValue, textAfterCaret, extend)，第三个参数 extend 必须传，
        // 否则内部 extend.forEach 会抛错、整个提示失效；textAfterCaret 只服务块引提示，emoji 传空串。
        // @ts-ignore 内核把 getKey 声明成 private
        return hint.getKey(this.lineBeforeCaret(), "", this.protyle.options.hint.extend);
    }

    /** 光标所在节点的文本、光标之前的部分。 */
    private lineBeforeCaret(): string {
        const editor = this.editor;
        const container = this.protyle.toolbar.range.startContainer;
        if (!editor?.contains(container)) {
            return "";
        }
        return (container.textContent ?? "").substring(0, this.caretOffset(container, editor));
    }

    /**
     * 光标在 container 内的字符偏移，累加软换行 `<br>` 的长度（复刻 `getSelectionOffset` 的语义）。
     * 只在当前选区确实落在编辑器内时计算，否则返回 0。
     */
    private caretOffset(container: Node, editor: HTMLElement): number {
        const selection = getSelection();
        if (!selection?.rangeCount) {
            return 0;
        }
        const range = selection.getRangeAt(0);
        if (!editor.contains(range.commonAncestorContainer)) {
            return 0;
        }
        const before = range.cloneRange();
        // 第一个孙节点存在时从它起算，避开容器自身的标记节点；否则整段内容都是基准
        const firstGrandchild = (container as Element).childNodes?.[0]?.childNodes?.[0];
        if (firstGrandchild) {
            before.setStart(firstGrandchild, 0);
        } else {
            before.selectNodeContents(container);
        }
        before.setEnd(range.startContainer, range.startOffset);
        return before.toString().length + before.cloneContents().querySelectorAll("br").length;
    }

    /** 提示里的结果面板；`.emojis` 还没渲染出来时为空。 */
    private panel(): IconifyResultsPanel | undefined {
        const container = this.protyle.hint?.element.querySelector<HTMLElement>(".emojis");
        return container ? this.panels.get(container, this.insertion) : undefined;
    }

    /** 提示面板当前展示的是不是 emoji 面板（`/`、`[[` 等其它提示不碰）。 */
    private showsEmojiHint(): boolean {
        const hint = this.protyle.hint;
        return !!hint && !hint.element.classList.contains("fn__none") &&
            !!hint.element.firstElementChild?.classList.contains("emojis");
    }

    /**
     * 在 `.protyle` 的捕获阶段拦 Enter。
     * 思源的 keydown 监听挂在 `protyle.wysiwyg.element` 上，同一元素上后注册的监听会被它先执行，
     * 所以必须挂到它的祖先上。
     */
    private guardEnter(): () => void {
        const root = this.protyle.element;
        const listener = (event: KeyboardEvent) => this.handleEnter(event);
        root.addEventListener("keydown", listener, true);
        return () => root.removeEventListener("keydown", listener, true);
    }

    /** 只处理编辑器里、emoji 提示打开时的 Enter。 */
    private handleEnter(event: KeyboardEvent): void {
        if (!this.editor?.contains(event.target as Node) || !this.showsEmojiHint()) {
            return;
        }
        this.panel()?.interceptEnter(event);
    }
}
