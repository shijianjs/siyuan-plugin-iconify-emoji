import {expect, Locator, Page} from "@playwright/test";
import {PLUGIN_NAME} from "./runtime";

/** 插件设置文件在工作空间中的相对路径（相对 /data）。 */
export const SETTINGS_FILE = "storage/petal/siyuan-plugin-iconify-emoji/settings.json";
/** 插件把 iconify 图标保存为自定义 emoji 的目录。 */
export const EMOJI_DIR = "data/emojis/iconify";
/** iconify 搜索结果分组的标记类名。 */
export const ICONIFY_GROUP = ".iconify-result-group";

/** 打开文档，等待编辑器加载完成并返回正文区域。 */
export const getDocumentEditor = async (page: Page, docID: string) => {
    const titleSelector = `.protyle-title[data-node-id="${docID}"]`;
    await expect(page.locator(`${titleSelector}:visible`).last()).toBeVisible({timeout: 15000});
    const titleElement = page.locator(`${titleSelector}:visible`).last();
    const visibleProtyle = titleElement.locator(
        "xpath=ancestor::*[contains(concat(' ', normalize-space(@class), ' '), ' protyle ')][1]",
    );
    const tabID = await visibleProtyle.getAttribute("data-id");
    const protyle = tabID ? page.locator(`.protyle[data-id="${tabID}"]`) : visibleProtyle;
    await expect(protyle).toHaveAttribute("data-loading", "finished", {timeout: 15000});
    const editor = protyle.locator(".protyle-wysiwyg").first();
    await expect(editor).toBeVisible({timeout: 10000});
    return editor;
};

/** 当前激活的 protyle（标签页可能同时存在多个）。 */
export const getActiveProtyle = (page: Page) => page.locator(".protyle:visible").last();

/**
 * 打开文档图标选择器（emoji 面板）。
 * 面板由文档题头的「添加图标」按钮打开，插件会在面板搜索框上挂载搜索监听。
 */
export const openEmojiDialog = async (page: Page) => {
    const protyle = getActiveProtyle(page);
    await protyle.locator(".protyle-top").hover();
    await protyle.locator('.protyle-background__action [data-type="icon"]').click();
    // data-key 挂在 Dialog 的最外层包装元素上，而不是内部的 .b3-dialog
    const dialog = page.locator('[data-key="dialog-emojis"]').last();
    await expect(dialog.locator(".b3-dialog__container")).toBeVisible({timeout: 15000});
    await expect(dialog.locator(".emojis .b3-text-field").first()).toBeVisible({timeout: 10000});
    return dialog;
};

/** 返回 emoji 面板中的插件搜索输入框。 */
export const emojiSearchInput = (dialog: Locator) => dialog.locator(".emojis .b3-text-field").first();

/** 在 emoji 面板中输入关键字并等待 Iconify 结果分组出现。 */
export const searchEmoji = async (dialog: Locator, query: string) => {
    await emojiSearchInput(dialog).fill(query);
    const group = dialog.locator(ICONIFY_GROUP);
    await expect(group).toHaveCount(1, {timeout: 15000});
    await expect(group.locator(".emojis__item").first()).toBeAttached({timeout: 15000});
    return group;
};

/** 在文档正文中输入 `:关键字` 触发 emoji 提示，返回提示中的 Iconify 结果分组。 */
export const typeIconHint = async (page: Page, query: string) => {
    const editor = getActiveProtyle(page).locator(".protyle-wysiwyg").first();
    await editor.click();
    await page.keyboard.press("Control+End");
    await page.keyboard.press("Enter");
    const group = page.locator(`.protyle-hint ${ICONIFY_GROUP}`).last();
    // 本地工作空间可能同时还装有其它的 emoji 插件（例如 emoji-market），
    // 它们会重渲染提示面板并把我们注入的分组清掉；此时再触发一次输入即可。
    // CI 的全新工作空间只有本插件，不会走到重试分支。
    for (let attempt = 0; attempt < 3; attempt++) {
        await page.keyboard.type(`:${query}`);
        try {
            await expect(group.locator(".emojis__item").first()).toBeAttached({timeout: 6000});
            return group;
        } catch {
            await page.keyboard.press("Escape");
            await page.keyboard.press("Control+a");
            await page.keyboard.press("Backspace");
        }
    }
    await expect(group.locator(".emojis__item").first()).toBeAttached({timeout: 15000});
    return group;
};

/** 打开插件设置面板（点击顶栏插件菜单中的插件名）。 */
export const openPluginSettings = async (page: Page) => {
    await page.locator("#barPlugins").click();
    const menu = page.locator('.b3-menu[data-name="topBarPlugin"]:not(.fn__none)');
    await expect(menu).toBeVisible();
    await menu.locator(`[data-id="${PLUGIN_NAME}"]`).first().click();
    // SettingUtils 使用 `new Setting()`，面板是一个独立的 b3-dialog，其内含 .b3-label.config-item
    const dialog = page.locator(".b3-dialog__container")
        .filter({has: page.locator(".b3-label.config-item")}).last();
    await expect(dialog.locator(".b3-label.config-item").first()).toBeVisible({timeout: 15000});
    return dialog;
};

/** 某个 iconify 图标对应的 emoji 文件名，例如 `mdi:home` -> `mdi--home.svg`。 */
export const emojiFileName = (iconName: string) => `${iconName.replace(":", "--")}.svg`;

/** 某个 iconify 图标在 emoji 目录中的工作空间路径。 */
export const emojiFilePath = (iconName: string) => `${EMOJI_DIR}/${emojiFileName(iconName)}`;
