import fs from "node:fs";
import {request} from "@playwright/test";
import {getBaseURL, PLUGIN_NAME} from "./helpers/runtime";
import {SiyuanAPI} from "./helpers/siyuanAPI";

const STATE_FILE = "tests/.plugin-state.json";
const SETTINGS_PATH = `/data/storage/petal/siyuan-plugin-iconify-emoji/settings.json`;
const SETTINGS_DIRECTORY = SETTINGS_PATH.slice(0, SETTINGS_PATH.lastIndexOf("/"));
const SETTINGS_NAME = SETTINGS_PATH.slice(SETTINGS_PATH.lastIndexOf("/") + 1);

interface ISetupState {
    pluginEnabled: boolean;
    pluginStateChanged: boolean;
    bazaarConf?: Record<string, unknown>;
    bazaarChanged: boolean;
    disabledPlugins?: string[];
    /** 改写前的设置文件原文；null 表示原本没有这个文件。 */
    settingsOriginal?: string | null;
    /** 是否改写过设置文件。 */
    settingsChanged?: boolean;
}

/** 恢复 global-setup 中临时改动的插件启用状态、全局插件开关与插件设置。 */
export default async function globalTeardown() {
    if (!fs.existsSync(STATE_FILE)) {
        return;
    }
    const state = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8")) as ISetupState;
    fs.rmSync(STATE_FILE, {force: true});
    const disabledPlugins = state.disabledPlugins ?? [];
    if (!state.pluginStateChanged && !state.bazaarChanged && disabledPlugins.length === 0 &&
        !state.settingsChanged) {
        return;
    }

    const baseURL = getBaseURL();
    const context = await request.newContext({baseURL});
    try {
        const api = new SiyuanAPI(context, baseURL);
        if (state.pluginStateChanged) {
            await api.setPluginEnabled(PLUGIN_NAME, state.pluginEnabled);
            console.log(`[iconify-e2e] 已恢复插件 ${PLUGIN_NAME} 的启用状态：${state.pluginEnabled}`);
        }
        if (state.bazaarChanged && state.bazaarConf) {
            await api.setBazaarConf(state.bazaarConf);
            console.log("[iconify-e2e] 已恢复全局插件开关配置");
        }
        for (const name of disabledPlugins) {
            await api.setPluginEnabled(name, true);
            console.log(`[iconify-e2e] 已恢复插件 ${name} 的启用状态：true`);
        }
        if (state.settingsChanged) {
            if (state.settingsOriginal === null || state.settingsOriginal === undefined) {
                await api.removeWorkspaceFile(SETTINGS_PATH);
            } else {
                await api.writeWorkspaceFile(
                    SETTINGS_DIRECTORY,
                    SETTINGS_NAME,
                    state.settingsOriginal,
                    "application/json",
                );
            }
            console.log("[iconify-e2e] 已恢复工作空间里原有的插件设置");
        }
    } finally {
        await context.dispose();
    }
}
