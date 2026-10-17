import {expect, test} from "./fixtures";
import {openWorkspace, PLUGIN_NAME} from "./helpers/runtime";
import {openPluginSettings} from "./helpers/plugin";

/**
 * 冒烟用例：确认内核真的加载了插件，并且插件注册的界面元素出现在前端。
 * 这条用例可以在任何 CI 环境中最早暴露「内核没有加载插件」的问题。
 */
test.describe("plugin loading", () => {
    test("the kernel serves the petal and exposes the plugin settings entry", async ({
        page, siyuanAPI,
    }) => {
        const petals = await siyuanAPI.getLoadedPetals();
        expect(petals, "内核应加载被测插件").toContain(PLUGIN_NAME);

        await openWorkspace(page);

        // 插件会注册到顶栏的插件菜单
        await page.locator("#barPlugins").click();
        const menu = page.locator('.b3-menu[data-name="topBarPlugin"]:not(.fn__none)');
        await expect(menu).toBeVisible();
        await expect(menu.locator(`[data-id="${PLUGIN_NAME}"]`)).toHaveCount(1);
        await page.keyboard.press("Escape");

        const dialog = await openPluginSettings(page);
        await expect(dialog.locator(".b3-label.config-item")).toHaveCount(6);
        await page.keyboard.press("Escape");

        const workspaceInfo = await siyuanAPI.getWorkspaceInfo();
        expect(workspaceInfo.workspaceDir).toBeTruthy();
    });
});
