import {request} from "@playwright/test";
import fs from "node:fs";
import {getBaseURL, PLUGIN_NAME, validateTestTarget} from "./helpers/runtime";
import {IBazaarConf, SiyuanAPI} from "./helpers/siyuanAPI";
import {ensureTestNotebook} from "./testNotebook";

const STATE_FILE = "tests/.plugin-state.json";

/**
 * 本地开发工作空间可能同时装有其它 emoji 插件（emoji-market / emoji-enhance），
 * 它们会往 emoji 提示面板注入内容并重渲染面板，把本插件注入的分组清掉，导致提示类
 * 用例偶发失败。CI 的全新工作空间只装本插件，不存在这个问题。测试期间临时禁用、
 * 结束后恢复，保证本地与 CI 行为一致。
 */
const CONFLICTING_PLUGINS = ["siyuan-plugin-emoji-market", "siyuan-plugin-emoji-enhance"];

interface ISetupState {
    pluginEnabled: boolean;
    pluginStateChanged: boolean;
    bazaarConf?: IBazaarConf;
    bazaarChanged: boolean;
    disabledPlugins: string[];
}

/** 运行测试前校验内核、准备笔记本，并确保插件与全局插件开关都处于可用状态。 */
export default async function globalSetup() {
    const baseURL = getBaseURL();
    const context = await request.newContext({baseURL});
    try {
        const api = new SiyuanAPI(context, baseURL);
        await validateTestTarget(api, baseURL);
        await ensureTestNotebook(api);

        const state: ISetupState = {
            pluginEnabled: true,
            pluginStateChanged: false,
            bazaarChanged: false,
            disabledPlugins: [],
        };

        // A fresh workspace has trust=false, and the kernel refuses to load petals until the user
        // confirms the marketplace trust. petalDisabled is the global plugin switch.
        const bazaar = await api.getBazaarConf();
        if (bazaar.petalDisabled !== false || bazaar.trust !== true) {
            state.bazaarConf = bazaar;
            await api.setBazaarConf({...bazaar, petalDisabled: false, trust: true});
            state.bazaarChanged = true;
            console.log("[iconify-e2e] 已临时打开集市信任与全局插件开关");
        }

        const plugin = await api.getInstalledPlugin(PLUGIN_NAME);
        if (!plugin) {
            throw new Error(`插件 ${PLUGIN_NAME} 未安装到测试工作空间，请先执行 pnpm make-link 并重启内核。`);
        }
        state.pluginEnabled = Boolean(plugin.enabled);
        if (!plugin.enabled) {
            await api.setPluginEnabled(PLUGIN_NAME, true);
            state.pluginStateChanged = true;
            console.log(`[iconify-e2e] 已临时启用插件 ${PLUGIN_NAME}`);
        }

        const loaded = await api.getLoadedPetals();
        if (!loaded.includes(PLUGIN_NAME)) {
            throw new Error(
                `内核未加载插件 ${PLUGIN_NAME}，已加载：${loaded.join(", ") || "（空）"}。`,
            );
        }

        // 临时禁用会干扰 emoji 提示面板的其它插件（本地开发工作空间里可能存在）
        for (const name of CONFLICTING_PLUGINS) {
            if (name === PLUGIN_NAME) {
                continue;
            }
            const conflicting = await api.getInstalledPlugin(name);
            if (conflicting?.enabled) {
                await api.setPluginEnabled(name, false);
                state.disabledPlugins.push(name);
            }
        }
        if (state.disabledPlugins.length > 0) {
            console.log(`[iconify-e2e] 已临时禁用干扰插件：${state.disabledPlugins.join(", ")}`);
        }

        fs.writeFileSync(STATE_FILE, JSON.stringify(state));
    } finally {
        await context.dispose();
    }
}
