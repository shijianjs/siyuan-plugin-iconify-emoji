import { IconSearchTypeEnum } from "./constants";
import { IconRef } from "./icon-ref";
import type { PluginSettings } from "./settings";

/** yesicon 服务端允许的单页上限；超过会直接 400。 */
const MAX_YESICON_SIZE = 160;

/** 图标检索：按当前设置的来源查图标名，并把名字包成 {@link IconRef}。 */
export class IconSearch {
    /** 来源、数量、yesicon 的语言都直接读插件设置，不在这里另存一份。 */
    constructor(private readonly settings: PluginSettings) {}

    /** 按设置里的来源检索；任何异常都降级为空结果，面板把分组藏起来即可。 */
    async find(query: string): Promise<IconRef[]> {
        try {
            const names = this.settings.searchType === IconSearchTypeEnum.yesicon
                ? await this.fromYesicon(query)
                : await this.fromIconify(query);
            return names.map(name => new IconRef(name));
        } catch (err) {
            console.warn("Iconify 搜索失败", err);
            return [];
        }
    }

    /** iconify 官方搜索：只支持英文的图标原名检索。 */
    private async fromIconify(query: string): Promise<string[]> {
        const res = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(query)}` +
            `&limit=${this.settings.searchLimit}`);
        const data = await res.json();
        return data.icons || [];
    }

    /** yesicon 搜索：支持按本地化语言检索（中英等）。 */
    private async fromYesicon(query: string): Promise<string[]> {
        // 不带 includeFacets：插件用不到 facets（分类计数），带上会让响应大出好几倍
        const res = await fetch(`https://yesicon.app/api/explorer/ui?query=${encodeURIComponent(query)}` +
            `&locale=${this.settings.yesiconLanguage}&page=1&size=${this.yesiconSize()}`);
        const data = await res.json();
        return data.icons?.map((icon: { id: string }) => icon.id) || [];
    }

    /** 本次向 yesicon 请求的条数：夹在服务端单页上限内，设置写再大也不会 400。 */
    private yesiconSize(): number {
        return Math.min(this.settings.searchLimit, MAX_YESICON_SIZE);
    }
}
