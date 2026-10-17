import { IProtyle, Plugin } from "siyuan";
import { Client } from "@siyuan-community/siyuan-sdk";

import "./index.scss";

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
import { setupContainer } from "./emoji-panel";
import { initHintInputListener } from "./hint";
import { initSettings } from "./settings";

export default class IconifyPlugin extends Plugin {
    private settingUtils: SettingUtils;
    typedI18n: typeof zh_CN;

    unloadActions: (() => void)[] = [];
    protyleCleaners = new WeakMap<IProtyle, () => void>();
    protyleCleanersIndex = new Set<IProtyle>();
    client: Client;
    hintCurrentRequestId = { id: 0 };

    async onload() {
        this.typedI18n = this.i18n as any;
        this.settingUtils = await initSettings(this, this.typedI18n);
        this.client = new Client({});

        await this.client.putFile({
            path: `/data/emojis/iconify`,
            isDir: true,
        });
    }

    get iconSearchLimit(): number {
        return this.settingUtils.get(ICON_SEARCH_LIMIT);
    }
    get iconSearchDebounce(): number {
        return Math.max(this.settingUtils.get(ICON_SEARCH_DEBOUNCE), 200);
    }
    get newIconHintDelay(): number {
        return Math.max(this.settingUtils.get(NEW_ICON_HINT_DELAY), 100);
    }
    get enableIconHint(): boolean {
        return this.settingUtils.get(ENABLE_ICON_HINT);
    }
    get iconSearchType(): IconSearchTypeEnum {
        return this.settingUtils.get(ICON_SEARCH_TYPE) ?? IconSearchTypeEnum.iconify;
    }
    get yesiconLanguage(): string {
        return this.settingUtils.get(YESICON_LANGUAGE) ?? "zh-hans";
    }

    unloadListeners() {
        this.unloadActions.forEach((f) => f());
        this.protyleCleanersIndex.forEach(protyle => {
            this.protyleCleaners.get(protyle)?.();
        });
    }

    onLayoutReady() {
        const config = { attributes: false, childList: true, subtree: false };

        const rootObserver = new MutationObserver((mutationList) => {
            for (const mutation of mutationList) {
                if (!mutation.addedNodes.length) {
                    continue;
                }
                for (const node of mutation.addedNodes) {
                    const n = (node as HTMLElement);
                    if (n && n.getAttribute && n.getAttribute("data-key") === "dialog-emojis") {
                        const container = n.querySelector(".emojis");
                        setupContainer(this, container as HTMLElement);
                    }
                }
            }
        });
        rootObserver.observe(document.body, config);
        this.unloadActions.push(() => rootObserver.disconnect());

        const protyleObserver = new MutationObserver((mutationList) => {
            for (const mutation of mutationList) {
                for (const node of mutation.addedNodes) {
                    const n = (node as HTMLElement);
                    if (n.classList.contains("emojis")) {
                        setupContainer(this, n);
                    }
                }
            }
        });

        const loadProtyleListener = (event: any) => {
            const protyle: IProtyle = event.detail.protyle;
            const hint = protyle.hint;
            if (hint) {
                protyleObserver.observe(hint.element, config);
                this.unloadActions.push(() => protyleObserver.disconnect());
                this.initHintInputListener(protyle);
            }
        };
        this.eventBus.on("loaded-protyle-static", loadProtyleListener);
        this.unloadActions.push(() => this.eventBus.off("loaded-protyle-static", loadProtyleListener));

        const destroyProtyleListener = (event: any) => {
            this.protyleCleanersIndex.delete(event.detail.protyle);
            this.protyleCleaners.delete(event.detail.protyle);
        };
        this.eventBus.on("destroy-protyle", destroyProtyleListener);
        this.unloadActions.push(() => this.eventBus.off("destroy-protyle", destroyProtyleListener));
    }

    private initHintInputListener(protyle: IProtyle) {
        const cleanup = initHintInputListener(this, protyle);
        this.protyleCleaners.set(protyle, cleanup);
        this.protyleCleanersIndex.add(protyle);
    }

    async onunload() {
        this.unloadListeners();
    }

    uninstall() {
        // 无需额外清理
    }
}
