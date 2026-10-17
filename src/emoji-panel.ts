import { debounce, delay } from "es-toolkit";
import type { IProtyle } from "siyuan";

import type { IconAddMode } from "./constants";
import { searchIcon } from "./icon-search";
import { calcColor, getIconSvg, reloadIconifyEmojis } from "./icon-svg";
import type IconifyPlugin from "./index";

const GROUP_CLASS = "iconify-result-group";

/** 给 emoji 面板的搜索框挂上 Iconify 搜索 */
export function setupContainer(plugin: IconifyPlugin, container: HTMLElement): void {
    const input = container.querySelector<HTMLElement & { hasIconifyListener?: boolean }>(".b3-text-field");
    if (input && !input.hasIconifyListener) {
        input.hasIconifyListener = true;
        attachSearchHandler(plugin, input, container);
    }
}

function attachSearchHandler(plugin: IconifyPlugin, input: HTMLElement, container: HTMLElement): void {
    const currentRequestId = { id: 0 }; // 防止旧请求覆盖新结果

    input.addEventListener("input", debounce(async (e) => {
        const query: string = (e.target as HTMLInputElement).value.trim();
        await updateIconifyContainer(plugin, query, container, currentRequestId);
    }, plugin.iconSearchDebounce));
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

    const filesResp = await plugin.client.readDir({ path: "/data/emojis/iconify" });
    const existsFiles = filesResp.data.map(file => file.name);
    icons.forEach(iconName => {
        const button = document.createElement("button");
        button.classList.add("emojis__item", "ariaLabel");
        const svgFileName = iconName.replace(":", "--") + ".svg";
        button.setAttribute("data-unicode", `iconify/${svgFileName}`);
        const icon = document.createElement("iconify-icon");
        icon.setAttribute("icon", iconName);
        const color = calcColor(iconName);
        icon.style.color = color;
        button.appendChild(icon);
        button.setAttribute("aria-label", iconName);
        contentDiv.appendChild(button);
        if (!existsFiles.includes(svgFileName)) {
            button.onclick = async (e) => {
                // 阻止事件冒泡，避免触发思源原生直接设置
                e.stopPropagation();
                let svgText: string;
                try {
                    svgText = await getIconSvg(icon, color);
                } catch (err) {
                    console.warn("Iconify 图标获取失败", err);
                    return;
                }
                await plugin.client.putFile({
                    path: `/data/emojis/iconify/${svgFileName}`,
                    file: svgText,
                });
                button.onclick = null;
                // 新图标写盘后先刷新 Lute 表情表，否则提示插入会退化成纯文本
                await reloadIconifyEmojis(protyle);
                // 创建一个与原始事件相同的指针事件
                const clonedEvent = new PointerEvent(e.type, e);
                if (mode === "hint") {
                    await delay(plugin.newIconHintDelay);
                }
                button.dispatchEvent(clonedEvent);
            };
        }
    });
}
