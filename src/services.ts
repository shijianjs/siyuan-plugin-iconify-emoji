import type { IconSearch } from "./icon-search";
import type { IconStore } from "./icon-store";
import type { PluginSettings } from "./settings";

/**
 * 面板与提示绑定共用的三个协作者：设置、检索、存储。
 * 由插件实例一次性创建、随插件生灭；下层对象只读这三者，不自己造副本。
 */
export interface IconifyServices {
    readonly settings: PluginSettings;
    readonly search: IconSearch;
    readonly store: IconStore;
}
