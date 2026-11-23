import type {Locator} from "@playwright/test";
import {expect, test} from "./fixtures";
import {
    EMOJI_DIR,
    emojiFilePath,
    emojiFileName,
    emojiSearchInput,
    openEmojiDialog,
    searchEmoji,
} from "./helpers/plugin";
import {mockIconifyApis} from "./helpers/iconifyApi";
import {withSetting} from "./helpers/settings";

/** 用例独享的图标名，避免命中工作空间里已经保存过的图标。 */
const UNIQUE_ICON = "mdi:e2e-dialog-insert";
/** 键盘用例单独一个图标名，保证按下 Enter 时 svg 确实还没落盘。 */
const ENTER_ICON = "mdi:e2e-dialog-enter";

const iconLabels = (group: Locator) =>
    group.locator(".emojis__item").evaluateAll(items =>
        items.map(item => item.getAttribute("aria-label")));

test.describe("emoji panel integration", () => {
    test("opening the emoji panel attaches the plugin search handler", async ({
        createTestDocument, page,
    }) => {
        await createTestDocument("iconify-dialog-attach", "attach");

        const dialog = await openEmojiDialog(page);
        await expect.poll(() => emojiSearchInput(dialog)
            .evaluate(element => (element as HTMLElement & {hasIconifyListener?: boolean}).hasIconifyListener === true))
            .toBe(true);

        // 少于两个字符不搜索，面板里不会出现 Iconify 分组
        await emojiSearchInput(dialog).fill("h");
        await expect(dialog.locator(".iconify-result-group")).toHaveCount(0);
    });

    test("searching renders the mocked iconify results", async ({createTestDocument, page}) => {
        await mockIconifyApis(page, {searchIcons: ["mdi:home", "mdi:home-outline"]});
        await createTestDocument("iconify-dialog-search", "search");

        const dialog = await openEmojiDialog(page);
        const group = await searchEmoji(dialog, "home");

        expect(await iconLabels(group)).toEqual(["mdi:home", "mdi:home-outline"]);
        await expect(group.locator(".emojis__item").first())
            .toHaveAttribute("data-unicode", "iconify/mdi--home.svg");
    });

    test("yesicon search type queries the yesicon api", async ({
        createTestDocument, page, siyuanAPI,
    }) => {
        await mockIconifyApis(page, {yesiconIcons: ["mdi:home", "mdi:cat"]});
        await createTestDocument("iconify-dialog-yesicon", "yesicon");

        const restore = await withSetting(page, siyuanAPI, "iconSearchType", "yesicon");
        try {
            const dialog = await openEmojiDialog(page);
            const group = await searchEmoji(dialog, "home");
            expect(await iconLabels(group)).toEqual(["mdi:home", "mdi:cat"]);
            await page.keyboard.press("Escape");
        } finally {
            await page.keyboard.press("Escape");
            await restore();
        }
    });

    test("clicking a new icon saves it and sets the document icon", async ({
        createTestDocument, page, siyuanAPI,
    }) => {
        await mockIconifyApis(page, {searchIcons: [UNIQUE_ICON]});
        await siyuanAPI.removeWorkspaceFile(`/${emojiFilePath(UNIQUE_ICON)}`);
        await createTestDocument("iconify-dialog-insert", "insert");

        try {
            const dialog = await openEmojiDialog(page);
            const group = await searchEmoji(dialog, "e2e");
            await group.locator(".emojis__item").first().click();

            await expect.poll(async () => (await siyuanAPI.readDir(`/${EMOJI_DIR}`))
                .map(file => file.name), {timeout: 10000}).toContain(emojiFileName(UNIQUE_ICON));
            await expect(page.locator(
                `.protyle-background__icon img[src$="${emojiFileName(UNIQUE_ICON)}"]`)).toHaveCount(1);
        } finally {
            await siyuanAPI.removeWorkspaceFile(`/${emojiFilePath(UNIQUE_ICON)}`);
        }
    });

    // issue #36：思源对 Enter 的处理只读 data-unicode，不会触发插件的保存逻辑，
    // 插件没做键盘响应时，未落盘的图标会被写成一串 `:iconify/xxx:` 文本。
    test("pressing Enter on a new icon saves it and sets the document icon", async ({
        createTestDocument, page, siyuanAPI,
    }) => {
        await mockIconifyApis(page, {searchIcons: [ENTER_ICON]});
        await siyuanAPI.removeWorkspaceFile(`/${emojiFilePath(ENTER_ICON)}`);
        await createTestDocument("iconify-dialog-enter", "enter");

        try {
            const dialog = await openEmojiDialog(page);
            const group = await searchEmoji(dialog, "nuenter");
            // 没有原生搜索结果时，插件会把第一个 Iconify 结果标为当前项
            await expect(group.locator(".emojis__item").first())
                .toHaveClass(/emojis__item--current/);
            await emojiSearchInput(dialog).press("Enter");

            await expect.poll(async () => (await siyuanAPI.readDir(`/${EMOJI_DIR}`))
                .map(file => file.name), {timeout: 10000}).toContain(emojiFileName(ENTER_ICON));
            await expect(page.locator(
                `.protyle-background__icon img[src$="${emojiFileName(ENTER_ICON)}"]`)).toHaveCount(1);
            // 面板在设置成功后应关闭
            await expect(page.locator('[data-key="dialog-emojis"]')).toHaveCount(0);
        } finally {
            await siyuanAPI.removeWorkspaceFile(`/${emojiFilePath(ENTER_ICON)}`);
        }
    });
});
