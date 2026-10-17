import type { Plugin } from "siyuan";
import type zh_CN from "../public/i18n/zh_CN.json";

import { SettingUtils } from "@/libs/setting-utils";
import {
    ENABLE_ICON_HINT,
    ICON_SEARCH_DEBOUNCE,
    ICON_SEARCH_LIMIT,
    ICON_SEARCH_TYPE,
    IconSearchTypeEnum,
    NEW_ICON_HINT_DELAY,
    YESICON_LANGUAGE,
} from "./constants";

/**
 * 注册并加载插件设置项，返回可读写的 SettingUtils 实例。
 */
export async function initSettings(plugin: Plugin, i18n: typeof zh_CN): Promise<SettingUtils> {
    const settingUtils = new SettingUtils({ plugin });

    settingUtils.addItem({
        key: ICON_SEARCH_TYPE,
        value: IconSearchTypeEnum.iconify,
        type: "select",
        title: i18n.iconSearchType.title,
        description: i18n.iconSearchType.description,
        options: {
            [IconSearchTypeEnum.iconify]: IconSearchTypeEnum.iconify,
            [IconSearchTypeEnum.yesicon]: IconSearchTypeEnum.yesicon,
        },
    });
    // yesicon 支持的检索语言：
    // - English / 简体中文 / Español / 正體中文 / Deutsch / 日本語 / Français / 한국어 / Português
    settingUtils.addItem({
        key: YESICON_LANGUAGE,
        value: "zh-hans",
        type: "select",
        title: i18n.yesiconLanguage.title,
        description: i18n.yesiconLanguage.description,
        options: {
            en: "English",
            "zh-hans": "简体中文",
            es: "Español",
            "zh-hant": "正體中文",
            de: "Deutsch",
            ja: "日本語",
            fr: "Français",
            ko: "한국어",
            pt: "Português",
        },
    });
    settingUtils.addItem({
        key: ICON_SEARCH_LIMIT,
        value: 50,
        type: "number",
        title: i18n.iconSearchLimit.title,
        description: i18n.iconSearchLimit.description,
    });
    settingUtils.addItem({
        key: ICON_SEARCH_DEBOUNCE,
        value: 300,
        type: "number",
        title: i18n.iconSearchDebounce.title,
        description: i18n.iconSearchDebounce.description,
    });
    settingUtils.addItem({
        key: ENABLE_ICON_HINT,
        value: true,
        type: "checkbox",
        title: i18n.enableIconHint.title,
        description: i18n.enableIconHint.description,
    });
    settingUtils.addItem({
        key: NEW_ICON_HINT_DELAY,
        value: 300,
        type: "number",
        title: i18n.newIconHintDelay.title,
        description: i18n.newIconHintDelay.description,
    });

    await settingUtils.load(); // 导入配置并合并
    return settingUtils;
}
