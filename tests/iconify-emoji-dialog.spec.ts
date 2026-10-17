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
});
