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

/** 一个设置项的标题与说明，取 i18n 里的同名字段。 */
interface ISettingText {
    title: string;
    description: string;
}

/** 插件设置的 i18n 文案（即 i18n json 的结构）。 */
type PluginI18n = typeof zh_CN;

/** 检索防抖低于这个值只会白等，读取时抬到它。 */
const MIN_SEARCH_DEBOUNCE = 200;
/** 插入新图标前留给 Lute 的最短等待，毫秒。 */
const MIN_HINT_DELAY = 100;
/** yesicon 支持的检索语言：值同时用作 locale 与下拉文案。 */
const YESICON_LANGUAGES: Record<string, string> = {
    en: "English",
    "zh-hans": "简体中文",
    es: "Español",
    "zh-hant": "正體中文",
    de: "Deutsch",
    ja: "日本語",
    fr: "Français",
    ko: "한국어",
    pt: "Português",
};

/**
 * 插件设置：注册设置项、加载配置，并把取值收成 getter。
 * 取值与注册项住在同一个对象里，不再散成插件类上的 getter。
 */
export class PluginSettings {
    private constructor(private readonly utils: SettingUtils) {}

    /** 注册设置项并从配置文件加载。 */
    static async load(plugin: Plugin, i18n: PluginI18n): Promise<PluginSettings> {
        const settings = new PluginSettings(new SettingUtils({ plugin }));
        settings.register(i18n);
        await settings.utils.load();
        return settings;
    }

    /** 检索来源：iconify 或 yesicon。 */
    get searchType(): IconSearchTypeEnum {
        return this.utils.get(ICON_SEARCH_TYPE) ?? IconSearchTypeEnum.iconify;
    }

    /** yesicon 检索使用的语言。 */
    get yesiconLanguage(): string {
        return this.utils.get(YESICON_LANGUAGE) ?? "zh-hans";
    }

    /** 一次检索最多返回多少个图标。 */
    get searchLimit(): number {
        return this.utils.get(ICON_SEARCH_LIMIT);
    }

    /** 输入停顿多久后才发起检索，毫秒。 */
    get searchDebounce(): number {
        return Math.max(this.utils.get(ICON_SEARCH_DEBOUNCE), MIN_SEARCH_DEBOUNCE);
    }

    /** 是否在编辑器 `:` 提示里追加 Iconify 结果。 */
    get enableIconHint(): boolean {
        return this.utils.get(ENABLE_ICON_HINT);
    }

    /** 提示里插入新图标前的最小等待，毫秒（等 Lute 拿到新表情）。 */
    get newIconHintDelay(): number {
        return Math.max(this.utils.get(NEW_ICON_HINT_DELAY), MIN_HINT_DELAY);
    }

    /** 按分组注册设置项，顺序即面板里的显示顺序。 */
    private register(i18n: PluginI18n): void {
        this.registerSearchSource(i18n);
        this.registerSearchBehavior(i18n);
        this.registerHintBehavior(i18n);
    }

    /** 检索来源：iconify 或 yesicon，以及 yesicon 的检索语言。 */
    private registerSearchSource(i18n: PluginI18n): void {
        this.select(ICON_SEARCH_TYPE, IconSearchTypeEnum.iconify, i18n.iconSearchType, {
            [IconSearchTypeEnum.iconify]: IconSearchTypeEnum.iconify,
            [IconSearchTypeEnum.yesicon]: IconSearchTypeEnum.yesicon,
        });
        this.select(YESICON_LANGUAGE, "zh-hans", i18n.yesiconLanguage, YESICON_LANGUAGES);
    }

    /** 检索行为：结果数量与输入防抖。 */
    private registerSearchBehavior(i18n: PluginI18n): void {
        this.number(ICON_SEARCH_LIMIT, 50, i18n.iconSearchLimit);
        this.number(ICON_SEARCH_DEBOUNCE, 300, i18n.iconSearchDebounce);
    }

    /** 提示行为：是否注入结果、插入前的等待时间。 */
    private registerHintBehavior(i18n: PluginI18n): void {
        this.checkbox(ENABLE_ICON_HINT, true, i18n.enableIconHint);
        this.number(NEW_ICON_HINT_DELAY, 300, i18n.newIconHintDelay);
    }

    /** 下拉选择项。 */
    private select(key: string, value: string, text: ISettingText, options: Record<string, string>): void {
        this.utils.addItem({
            key, value, type: "select", title: text.title, description: text.description, options,
        });
    }

    /** 数字输入项。 */
    private number(key: string, value: number, text: ISettingText): void {
        this.utils.addItem({
            key, value, type: "number", title: text.title, description: text.description,
        });
    }

    /** 开关项。 */
    private checkbox(key: string, value: boolean, text: ISettingText): void {
        this.utils.addItem({
            key, value, type: "checkbox", title: text.title, description: text.description,
        });
    }
}
