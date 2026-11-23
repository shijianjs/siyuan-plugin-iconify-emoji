import type { EventBus, IEventBusMap, IProtyle } from "siyuan";

import { InsertionTarget, PanelRegistry } from "./emoji-panel";
import { HintBinding } from "./hint";
import type { IconifyServices } from "./services";

/** emoji 对话框最外层包装节点上的标记。 */
const EMOJI_DIALOG_KEY = "dialog-emojis";

/**
 * 插件对思源界面事件的接线：emoji 对话框出现时挂上结果面板，
 * 编辑器加载时挂上提示绑定，编辑器销毁 / 插件卸载时逐个清理。
 */
export class IconifyUi {
    /** 容器 → 结果面板的注册表，对话框与提示共用。 */
    private readonly panels: PanelRegistry;
    /** 编辑器 → 提示绑定；WeakMap 不阻止 protyle 被回收。 */
    private readonly bindings = new WeakMap<IProtyle, HintBinding>();
    /** 卸载时需要逐个 stop 的绑定（WeakMap 不可遍历，用 Set 记一份）。 */
    private readonly boundProtyles = new Set<IProtyle>();
    /** 已挂上的监听清理函数。 */
    private readonly detachers: (() => void)[] = [];

    constructor(private readonly services: IconifyServices, private readonly events: EventBus) {
        this.panels = new PanelRegistry(services);
    }

    /** 开始监听对话框与编辑器事件。 */
    start(): void {
        this.watchDialogs();
        this.events.on("loaded-protyle-static", this.onProtyleLoaded);
        this.events.on("destroy-protyle", this.onProtyleDestroyed);
        this.detachers.push(() => this.events.off("loaded-protyle-static", this.onProtyleLoaded));
        this.detachers.push(() => this.events.off("destroy-protyle", this.onProtyleDestroyed));
    }

    /** 停止监听，并停掉所有提示绑定。 */
    stop(): void {
        this.detachers.forEach(detacher => detacher());
        this.detachers.length = 0;
        this.boundProtyles.forEach(protyle => this.bindings.get(protyle)?.stop());
        this.boundProtyles.clear();
    }

    /** emoji 对话框的包装节点插到 body 时，给它的搜索面板挂上监听。 */
    private watchDialogs(): void {
        const observer = new MutationObserver(list => list.forEach(mutation => this.mountDialog(mutation.addedNodes)));
        // data-key 挂在直接追加到 body 的包装 div 上，不需要往下遍历
        observer.observe(document.body, { childList: true });
        this.detachers.push(() => observer.disconnect());
    }

    /** 从新增节点里挑出 emoji 对话框，并用它的 `.emojis` 建结果面板。 */
    private mountDialog(nodes: NodeList): void {
        nodes.forEach(node => {
            const element = node as HTMLElement;
            if (element.getAttribute?.("data-key") !== EMOJI_DIALOG_KEY) {
                return;
            }
            const container = element.querySelector<HTMLElement>(".emojis");
            if (container) {
                this.panels.get(container, new InsertionTarget("search"));
            }
        });
    }

    /** 编辑器加载：给它的 `:` 提示挂上绑定；同一 protyle 只绑一次。 */
    private onProtyleLoaded = (event: CustomEvent<IEventBusMap["loaded-protyle-static"]>): void => {
        const protyle = event.detail.protyle;
        if (!protyle.hint || !protyle.wysiwyg || this.bindings.has(protyle)) {
            return;
        }
        const binding = new HintBinding(this.services, protyle, this.panels);
        binding.start();
        this.bindings.set(protyle, binding);
        this.boundProtyles.add(protyle);
    };

    /** 编辑器销毁：停掉它的提示绑定。 */
    private onProtyleDestroyed = (event: CustomEvent<IEventBusMap["destroy-protyle"]>): void => {
        const protyle = event.detail.protyle;
        this.bindings.get(protyle)?.stop();
        this.bindings.delete(protyle);
        this.boundProtyles.delete(protyle);
    };
}
