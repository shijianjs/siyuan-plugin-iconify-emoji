import type { Client } from "@siyuan-community/siyuan-sdk";
import { fetchSyncPost, type IProtyle } from "siyuan";

import type { IconRef } from "./icon-ref";

/** getEmojiConf 里自定义表情分组的最小形状，只取插件要用的字段。 */
interface ICustomEmojiCategory {
    id: string;
    items?: { keywords: string; unicode: string }[];
}

/**
 * Iconify 图标的落盘仓库：目录、svg 文件，以及写盘后刷新前端 Lute 的表情表。
 * 文件读写与表情表同步都依赖内核 API，所以由它持有客户端。
 */
export class IconStore {
    /** 自定义表情目录，工作空间绝对路径。 */
    static readonly DIRECTORY = "/data/emojis/iconify";
    /** getEmojiConf 里自定义表情分组的 id。 */
    private static readonly CUSTOM_CATEGORY = "custom";

    /** 通过内核 API 读写工作空间文件。 */
    constructor(private readonly client: Client) {}

    /** 确保 emoji 目录存在；插件加载时调用一次。 */
    async ensureDirectory(): Promise<void> {
        await this.client.putFile({ path: IconStore.DIRECTORY, isDir: true });
    }

    /** 已落盘的图标文件名集合，用来判断条目是否需要先保存。 */
    async savedFiles(): Promise<Set<string>> {
        const resp = await this.client.readDir({ path: IconStore.DIRECTORY });
        return new Set(resp.data.map(file => file.name));
    }

    /** 写入一个图标的 svg。 */
    async save(icon: IconRef, svg: string): Promise<void> {
        await this.client.putFile({
            path: `${IconStore.DIRECTORY}/${icon.fileName}`,
            file: svg,
        });
    }

    /**
     * 把新保存的图标同步进前端 Lute 的表情表。
     *
     * 插件直接 putFile 写文件，不走思源「添加自定义表情」的前端流程，不会调用 putEmojis；
     * 而内核的 emojis 目录监听在 Linux 上不递归，写 iconify/ 子目录不会触发 reloadEmojiConf。
     * 不刷新时，从提示插入新图标会被 Lute 当成普通文本 `:iconify/xxx:`。
     *
     * @param protyle 目标编辑器；没有编辑器（例如只改文档图标）时无需刷新
     */
    async syncEmojiRegistry(protyle?: IProtyle): Promise<void> {
        const lute = protyle?.lute;
        if (!lute) {
            return;
        }
        try {
            const resp = await fetchSyncPost("/api/system/getEmojiConf", {});
            if (resp.code !== 0 || !Array.isArray(resp.data)) {
                return;
            }
            window.siyuan.emojis = resp.data;
            const table = this.emojiTable(resp.data, protyle);
            if (Object.keys(table).length > 0) {
                lute.PutEmojis(table);
            }
        } catch (err) {
            console.warn("Iconify 表情配置刷新失败", err);
        }
    }

    /** 把自定义表情分组转成 Lute 需要的「关键词 → 路径」表。 */
    private emojiTable(categories: ICustomEmojiCategory[], protyle: IProtyle): Record<string, string> {
        const emojiPath = (protyle.options as any)?.hint?.emojiPath ?? "/emojis";
        const custom = categories.find(category => category.id === IconStore.CUSTOM_CATEGORY);
        const table: Record<string, string> = {};
        custom?.items?.forEach(item => {
            table[item.keywords] = `${emojiPath}/${item.unicode}`;
        });
        return table;
    }
}
