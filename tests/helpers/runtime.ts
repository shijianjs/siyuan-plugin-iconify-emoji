import {expect, Page} from "@playwright/test";
import {SiyuanAPI} from "./siyuanAPI";

/** 本地思源测试内核地址，可用 SIYUAN_BASE_URL 覆盖。 */
export const DEFAULT_BASE_URL = "http://127.0.0.1:6806";

export const PLUGIN_NAME = "siyuan-plugin-iconify-emoji";

export const getBaseURL = () => process.env.SIYUAN_BASE_URL || DEFAULT_BASE_URL;

/** 校验目标内核可用，并打印工作空间信息；仅允许回环地址。 */
export const validateTestTarget = async (api: SiyuanAPI, baseURL: string) => {
    const target = new URL(baseURL);
    const isLoopback = ["127.0.0.1", "localhost", "::1"].includes(target.hostname);
    if (!isLoopback && process.env.SIYUAN_ALLOW_REMOTE !== "1") {
        throw new Error(
            `拒绝针对非回环地址 ${target.origin} 运行测试，只有显式设置 SIYUAN_ALLOW_REMOTE=1 时才允许。`,
        );
    }

    let workspaceInfo: Awaited<ReturnType<SiyuanAPI["getWorkspaceInfo"]>> | undefined;
    await expect.poll(async () => {
        try {
            workspaceInfo = await api.getWorkspaceInfo();
            return true;
        } catch {
            return false;
        }
    }, {message: `等待思源内核 ${target.origin} 启动`, timeout: 20000}).toBe(true);

    console.log(`[iconify-e2e] target ${target.origin}, workspace ${workspaceInfo!.workspaceDir}, ` +
        `version ${workspaceInfo!.siyuanVer}`);
    return workspaceInfo!;
};

/** 打开桌面工作空间并等待内核 WebSocket 就绪。 */
export const openWorkspace = async (page: Page, path = "/") => {
    await page.goto(path === "/" || path.startsWith("/?") ? `/stage/build/desktop/${path.slice(1)}` : path);
    await expect(page.locator("#barSearch")).toBeVisible({timeout: 30000});
    await expect.poll(() => page.evaluate(() => {
        const runtime = window.siyuan as typeof window.siyuan & {ws?: {ws?: WebSocket}};
        return runtime.ws?.ws?.readyState;
    }), {message: "等待内核 WebSocket", timeout: 15000}).toBe(1);

    const changelogDialog = page.locator('[data-key="dialog-changelog"]');
    if (await changelogDialog.count() > 0 && await changelogDialog.isVisible()) {
        await changelogDialog.locator(".b3-dialog__scrim").click({force: true});
        await expect(changelogDialog).toHaveCount(0);
    }
};

/** 关闭所有可能残留的插件弹窗，避免测试之间互相干扰。 */
export const closePluginDialogs = async (page: Page) => {
    const dialogs = page.locator(".b3-dialog").filter({has: page.locator(".b3-dialog__container")});
    for (let index = 0; index < 10; index++) {
        const count = await dialogs.count();
        if (count === 0) {
            return;
        }
        for (let dialogIndex = 0; dialogIndex < count; dialogIndex++) {
            const dialog = dialogs.nth(dialogIndex);
            if (await dialog.isVisible()) {
                // 思源对话框统一响应 Esc，关闭按钮常常被 fn__none 隐藏
                await page.keyboard.press("Escape");
            }
        }
    }
    await expect(dialogs).toHaveCount(0);
};
