// 插件内共享的常量与枚举。

// 设置项 key
export const ICON_SEARCH_TYPE = "iconSearchType";
export const YESICON_LANGUAGE = "yesiconLanguage";
export const ICON_SEARCH_LIMIT = "iconSearchLimit";
export const ICON_SEARCH_DEBOUNCE = "iconSearchDebounce";
export const ENABLE_ICON_HINT = "enableIconHint";
export const NEW_ICON_HINT_DELAY = "newIconHintDelay";

export enum IconSearchTypeEnum {
    iconify = "iconify",
    yesicon = "yesicon",
}

/** icon 面板 / 提示两种插入来源 */
export type IconAddMode = "search" | "hint";
