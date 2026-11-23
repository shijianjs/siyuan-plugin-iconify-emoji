import { Client } from "@siyuan-community/siyuan-sdk";
import { Plugin } from "siyuan";

import "./index.scss";

import type zh_CN from "../public/i18n/zh_CN.json";
import { IconSearch } from "./icon-search";
import { IconStore } from "./icon-store";
import type { IconifyServices } from "./services";
import { PluginSettings } from "./settings";
import { IconifyUi } from "./ui";

/**
 * 插件本体：只做装配与生命周期。设置、检索、存储、界面接线各自是独立对象，
 * 由这里一次性创建并互相注入，不再把状态摊在插件字段和模块级变量上。
 */
export default class IconifyPlugin extends Plugin implements IconifyServices {
    /** 插件设置：检索来源、结果数量、提示行为等。 */
    settings: PluginSettings;
    /** 图标检索。 */
    search: IconSearch;
    /** 图标落盘仓库。 */
    store: IconStore;
    /** 界面接线（emoji 对话框、`:` 提示），布局就绪后才创建。 */
    private ui?: IconifyUi;
    /** 与 public/i18n 对齐的 i18n 类型。 */
    typedI18n: typeof zh_CN;

    async onload(): Promise<void> {
        this.typedI18n = this.i18n as any;
        this.settings = await PluginSettings.load(this, this.typedI18n);
        this.store = new IconStore(new Client({}));
        this.search = new IconSearch(this.settings);
        await this.store.ensureDirectory();
    }

    onLayoutReady(): void {
        this.ui = new IconifyUi(this, this.eventBus);
        this.ui.start();
    }

    async onunload(): Promise<void> {
        this.ui?.stop();
    }

    uninstall(): void {
        // 无需额外清理
    }
}
