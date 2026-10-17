import { buildIcon, getIcon, iconToHTML } from "iconify-icon";
import { delay } from "es-toolkit";
import stringHash from "string-hash";
import { TinyColor } from "@ctrl/tinycolor";
import { fetchSyncPost, IProtyle } from "siyuan";

/**
 * 把新保存的图标同步进前端 Lute 的表情表。
 *
 * 插件是直接 putFile 写文件的，不经过思源「添加自定义表情」的前端流程，
 * 因此不会调用 putEmojis 刷新 Lute。内核的 emojis 目录监听在 Linux 上不递归，
 * 写进 iconify/ 子目录也不会触发 reloadEmojiConf。结果是：在 Linux 里从 `:` 提示
 * 插入新图标时，Lute 不认识该表情，会把 `:iconify/xxx:` 当成普通文本插入。
 * 这里主动重建一次自定义表情表，保证各平台行为一致。
 */
export async function reloadIconifyEmojis(protyle?: IProtyle): Promise<void> {
    const lute = protyle?.lute;
    if (!lute) return;
    try {
        const resp = await fetchSyncPost("/api/system/getEmojiConf", {});
        if (resp.code !== 0 || !Array.isArray(resp.data)) return;
        window.siyuan.emojis = resp.data;
        const emojiPath = (protyle.options as any)?.hint?.emojiPath ?? "/emojis";
        const custom = (resp.data as any[]).find(category => category.id === "custom");
        if (!custom?.items?.length) return;
        const emojis: Record<string, string> = {};
        custom.items.forEach((item: any) => {
            emojis[item.keywords] = `${emojiPath}/${item.unicode}`;
        });
        lute.PutEmojis(emojis);
    } catch (err) {
        console.warn("Iconify 表情配置刷新失败", err);
    }
}

/** 依据图标名生成一个稳定的颜色（同色相哈希）。 */
export function calcColor(iconName: string): string {
    const hash = stringHash(iconName);
    return new TinyColor({ h: hash % 360, s: 0.7, l: 0.5 }).toHexString();
}

/**
 * 获取图标的 svg 字符串，并把颜色通过 style 注入到 svg 标签上
 * （iconify 图标内部使用 fill="currentColor"，设置 color 即可生效）。
 * 避免直接请求 api.iconify.design 被 Cloudflare 403 拦截。
 *
 * 优先使用 iconify-icon 官方导出的 getIcon + buildIcon + iconToHTML：
 * 图标已被组件渲染过，数据在缓存中，不会发起新的网络请求。
 */
export async function getIconSvg(icon: HTMLElement, color: string): Promise<string> {
    const iconName = icon.getAttribute("icon");
    const data = iconName ? getIcon(iconName) : undefined;
    if (data) {
        const { body, attributes } = buildIcon(data);
        return iconToHTML(body, { ...attributes, style: `color: ${color}` });
    }
    // 兜底：直接从 shadowRoot 取组件已渲染好的 svg
    const timeout = 1000;
    const start = Date.now();
    let rawSvg = "";
    while (Date.now() - start < timeout) {
        rawSvg = (icon.shadowRoot?.innerHTML || "").trim();
        if (rawSvg.includes("<svg")) {
            break;
        }
        await delay(50);
    }
    if (!rawSvg.includes("<svg")) {
        throw new Error(`无法获取 iconify 图标 svg: ${iconName}`);
    }
    const wrapper = document.createElement("div");
    wrapper.innerHTML = rawSvg;
    const svg = wrapper.querySelector("svg");
    if (!svg) {
        throw new Error(`iconify 图标 svg 解析失败: ${iconName}`);
    }
    svg.style.color = color;
    return svg.outerHTML;
}
