import { debounce } from "es-toolkit";
import type { IProtyle } from "siyuan";

import { getSelectionOffset } from "@/SiyuanUtils";

import { activateIconifyItem, getCurrentIconifyItem, updateIconifyContainer } from "./emoji-panel";
import type IconifyPlugin from "./index";

/**
 * 提示面板里按 Enter 时，思源的 Hint.select 直接拿 `data-unicode` 去 fill
 * （app/src/protyle/hint/index.ts），不会触发插件「点击时下载 svg」的逻辑，
 * 文件还不存在时 Lute 就不认识这个表情，插入的是一串 `:iconify/xxx:` 纯文本（issue #36）。
 *
 * 所以在 `.protyle` 上捕获 Enter：先落盘，再派发 click 走思源自己的点击流程，
 * 与鼠标插入完全一致。捕获必须挂在编辑器 keydown 监听（`protyle.wysiwyg.element`）的祖先上，
 * 否则同一元素上后注册的监听会被思源先执行。
 */
function attachHintKeyboardHandler(plugin: IconifyPlugin, protyle: IProtyle): () => void {
    const element = protyle.wysiwyg?.element;
    const root: HTMLElement | undefined = protyle.element ?? element;
    if (!root || !element) {
        return () => { /* 无可挂载的根节点 */ };
    }
    const listener = (event: KeyboardEvent) => {
        if (!event.isTrusted || event.isComposing || event.key !== "Enter" ||
            event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
            return;
        }
        if (!element.contains(event.target as Node)) {
            return;
        }
        const hintElement = protyle.hint?.element;
        if (!hintElement || hintElement.classList.contains("fn__none")) {
            return;
        }
        // 只在提示内容确实是 emoji 面板时处理（`/`、`[[` 等其它提示不碰）
        if (!hintElement.firstElementChild?.classList.contains("emojis")) {
            return;
        }
        const item = getCurrentIconifyItem(hintElement);
        // 已经落盘的图标思源的 Enter 直接可用，不必改写事件流
        if (!item || item.dataset.iconifySaved === "1") {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        void activateIconifyItem(plugin, item, protyle, "hint");
    };
    root.addEventListener("keydown", listener, true);
    return () => root.removeEventListener("keydown", listener, true);
}

/**
 * 监听编辑器的输入，在 `:` 提示里注入 Iconify 搜索结果。
 * 返回取消监听的清理函数。
 */
export function initHintInputListener(plugin: IconifyPlugin, protyle: IProtyle): () => void {
    const hint = protyle.hint;
    const element = protyle.wysiwyg.element;
    const listener = debounce(async () => {
        if (hint.splitChar !== ":" || !plugin.enableIconHint) {
            return;
        }
        const start = getSelectionOffset(protyle.toolbar.range.startContainer, element).start;
        const currentLineValue = protyle.toolbar.range.startContainer.textContent.substring(0, start) || "";
        // hint.getKey 的签名是 (currentLineValue, textAfterCaret, extend)，
        // 第三个参数 extend 必须传入，否则内部 extend.forEach 会抛错导致提示失效；
        // textAfterCaret 只服务于块引提示（如 `[[`），emoji 提示用不到，传空串即可。
        // @ts-ignore
        const key: string = hint.getKey(currentLineValue, "", protyle.options.hint.extend);
        if (!key || /\s/.test(key)) {
            return;
        }
        const container: HTMLElement = hint.element.querySelector(".emojis");
        if (container) {
            await updateIconifyContainer(plugin, key, container, plugin.hintCurrentRequestId, "hint", protyle);
        }
    }, plugin.iconSearchDebounce);

    element.addEventListener("input", listener);
    const detachKeyboard = attachHintKeyboardHandler(plugin, protyle);
    return () => {
        element?.removeEventListener("input", listener);
        detachKeyboard();
    };
}
