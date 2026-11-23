import { debounce, delay } from "es-toolkit";
import type { IProtyle } from "siyuan";

import type { IconAddMode } from "./constants";
import { searchIcon } from "./icon-search";
import { calcColor, getIconSvg, reloadIconifyEmojis } from "./icon-svg";
import type IconifyPlugin from "./index";

const GROUP_CLASS = "iconify-result-group";
const EMOJI_DIR = "/data/emojis/iconify";

/** 该条目是否属于插件注入的 Iconify 结果分组。 */
export function isIconifyItem(element: Element | null | undefined): element is HTMLElement {
    return !!element && element.classList.contains("emojis__item") &&
        element.closest("." + GROUP_CLASS) !== null;
}

/** 面板里当前被键盘选中的 Iconify 条目；选中的是原生表情时返回 null。 */
export function getCurrentIconifyItem(scope: HTMLElement): HTMLElement | null {
    const current = scope.querySelector<HTMLElement>(".emojis__item--current");
    return isIconifyItem(current) ? current : null;
}

/** 给 emoji 面板的搜索框挂上 Iconify 搜索 */
export function setupContainer(plugin: IconifyPlugin, container: HTMLElement): void {
    const input = container.querySelector<HTMLElement & { hasIconifyListener?: boolean }>(".b3-text-field");
    if (input && !input.hasIconifyListener) {
        input.hasIconifyListener = true;
        attachSearchHandler(plugin, input, container);
        attachKeyboardHandler(plugin, input, container);
    }
}

function attachSearchHandler(plugin: IconifyPlugin, input: HTMLElement, container: HTMLElement): void {
    const currentRequestId = { id: 0 }; // 防止旧请求覆盖新结果

    input.addEventListener("input", debounce(async (e) => {
        const query: string = (e.target as HTMLInputElement).value.trim();
        await updateIconifyContainer(plugin, query, container, currentRequestId);
    }, plugin.iconSearchDebounce));
}

/**
 * 面板里按 Enter 时，思源只会把 `data-unicode` 直接写进文档或图标属性
 * （app/src/emoji/index.ts 的 keydown 分支），不会触发插件「点击时下载 svg」的逻辑，
 * 文件还不存在时 Lute 就把它当成普通文本 `:iconify/xxx:` 插入 —— 即 issue #36。
 *
 * 因此在容器的捕获阶段先拦下 Enter：先落盘，再派发一次 click 把选择交回思源的点击流程。
 * 拦在容器（而不是搜索框）上是因为思源的 keydown 监听挂在搜索框本身，
 * 同元素上的监听按注册顺序触发，晚注册的会被思源先执行。
 */
function attachKeyboardHandler(plugin: IconifyPlugin, input: HTMLElement, container: HTMLElement): void {
    container.addEventListener("keydown", (event: KeyboardEvent) => {
        // 只处理搜索框里的真实按键；合成事件由 activateIconifyItem 派发，交给思源原生流程
        if (!event.isTrusted || event.target !== input || event.isComposing || event.key !== "Enter" ||
            event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
            return;
        }
        const item = getCurrentIconifyItem(container);
        // 已经落盘的图标思源的 Enter 直接可用，不必改写事件流
        if (!item || item.dataset.iconifySaved === "1") {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        void activateIconifyItem(plugin, item, undefined, "search");
    }, true);
}

function emojiFileName(iconName: string): string {
    return iconName.replace(":", "--") + ".svg";
}

/** 把图标 svg 落盘，并刷新前端 Lute 的表情表。 */
async function saveIconifyIcon(plugin: IconifyPlugin, button: HTMLElement, protyle?: IProtyle): Promise<boolean> {
    const icon = button.querySelector<HTMLElement>("iconify-icon");
    const iconName = icon?.getAttribute("icon");
    if (!icon || !iconName) {
        return false;
    }
    let svgText: string;
    try {
        svgText = await getIconSvg(icon, calcColor(iconName));
    } catch (err) {
        console.warn("Iconify 图标获取失败", err);
        return false;
    }
    await plugin.client.putFile({
        path: `${EMOJI_DIR}/${emojiFileName(iconName)}`,
        file: svgText,
    });
    button.dataset.iconifySaved = "1";
    // 新图标写盘后先刷新 Lute 表情表，否则提示插入会退化成纯文本
    await reloadIconifyEmojis(protyle);
    return true;
}

/**
 * 选中一个 Iconify 条目：必要时先落盘，然后重新派发 click 让思源的原生流程接手。
 * 鼠标与键盘（Enter）共用这一条路径，保证两种操作写入的内容一致。
 */
export async function activateIconifyItem(
    plugin: IconifyPlugin,
    button: HTMLElement,
    protyle?: IProtyle,
    mode: IconAddMode = "search",
): Promise<void> {
    if (button.dataset.iconifySaved !== "1" && !(await saveIconifyIcon(plugin, button, protyle))) {
        return;
    }
    if (mode === "hint") {
        await delay(plugin.newIconHintDelay);
    }
    button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
}

export async function updateIconifyContainer(
    plugin: IconifyPlugin,
    query: string,
    container: HTMLElement,
    currentRequestId: { id: number },
    mode: IconAddMode = "search",
    protyle?: IProtyle,
): Promise<void> {
    const requestId = ++currentRequestId.id;
    if (query.length < 2) return;
    try {
        const icons = await searchIcon(query, {
            type: plugin.iconSearchType,
            limit: plugin.iconSearchLimit,
            yesiconLanguage: plugin.yesiconLanguage,
        });
        if (requestId !== currentRequestId.id) return; // 丢弃过期请求
        await injectIconifyResults(plugin, icons, container, mode, protyle);
    } catch (err) {
        console.warn("Iconify 搜索失败", err);
    }
}

export async function injectIconifyResults(
    plugin: IconifyPlugin,
    icons: string[],
    container: HTMLElement,
    mode: IconAddMode = "search",
    protyle?: IProtyle,
): Promise<void> {
    const panel: HTMLElement = container.querySelector(".emojis__panel");
    if (!panel) {
        return;
    }
    // 父容器存在则复用，不存在再插入：避免每次搜索都移除重建，
    // 导致和其他插件生成的分组相互挤压、位置不稳定
    let groupElement = panel.querySelector<HTMLElement>("." + GROUP_CLASS);
    if (!groupElement) {
        groupElement = document.createElement("div");
        groupElement.classList.add(GROUP_CLASS);

        const titleDiv = document.createElement("div");
        titleDiv.textContent = "Iconify";
        // titleDiv.className = 'emojis__title' //加了这个class后，结果会不删除原来输入的内容
        titleDiv.classList.add("iconify_emojis__title");
        titleDiv.setAttribute("data-type", "iconify");
        groupElement.appendChild(titleDiv);

        const contentElement = document.createElement("div");
        contentElement.classList.add("emojis__content");
        groupElement.appendChild(contentElement);

        panel.appendChild(groupElement);
    }

    // 清除旧的 Iconify 图标：只清空内容，父容器留在原位
    const contentDiv = groupElement.querySelector<HTMLElement>(".emojis__content");
    contentDiv.innerHTML = "";

    if (icons.length === 0) {
        groupElement.classList.add("fn__none");
        return;
    }
    groupElement.classList.remove("fn__none");

    const parentElementClassList = container.parentElement.classList;
    if (parentElementClassList.contains("protyle-hint") && parentElementClassList.contains("fn__none")) {
        parentElementClassList.remove("fn__none");
    }

    const filesResp = await plugin.client.readDir({ path: EMOJI_DIR });
    const existsFiles = filesResp.data.map(file => file.name);
    icons.forEach(iconName => {
        const button = document.createElement("button");
        button.classList.add("emojis__item", "ariaLabel");
        const svgFileName = emojiFileName(iconName);
        button.setAttribute("data-unicode", `iconify/${svgFileName}`);
        const icon = document.createElement("iconify-icon");
        icon.setAttribute("icon", iconName);
        const color = calcColor(iconName);
        icon.style.color = color;
        button.appendChild(icon);
        button.setAttribute("aria-label", iconName);
        contentDiv.appendChild(button);
        if (existsFiles.includes(svgFileName)) {
            button.dataset.iconifySaved = "1";
            return;
        }
        button.onclick = async (e) => {
            // 合成事件：文件已落盘，直接放行给思源的原生点击流程
            if (!e.isTrusted) {
                return;
            }
            // 阻止事件冒泡，避免思源在 svg 落盘前直接设置
            e.stopPropagation();
            await activateIconifyItem(plugin, button, protyle, mode);
        };
    });

    // 搜不到原生表情时主动标出第一个 Iconify 结果（面板没有选中项时思源的 Enter
    // 也会落到它上面），让键盘操作有可见的焦点
    if (!panel.querySelector(".emojis__item--current")) {
        contentDiv.querySelector<HTMLElement>(".emojis__item")?.classList.add("emojis__item--current");
    }
}
