import { debounce } from "es-toolkit";
import type { IProtyle } from "siyuan";

import { getSelectionOffset } from "@/SiyuanUtils";

import { updateIconifyContainer } from "./emoji-panel";
import type IconifyPlugin from "./index";

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
    return () => element?.removeEventListener("input", listener);
}
