import {expect, test} from "./fixtures";
import {
    EMOJI_DIR,
    emojiFileName,
    emojiFilePath,
    getActiveProtyle,
    getBodyWysiwyg,
    typeIconHint,
} from "./helpers/plugin";
import {mockIconifyApis} from "./helpers/iconifyApi";

/** 用例独享的图标名，避免命中工作空间里已经保存过的图标。 */
const UNIQUE_ICON = "mdi:e2e-hint-insert";
/** 键盘用例单独一个图标名与关键字，保证 Enter 时 svg 还没落盘、也没有原生命中。 */
const ENTER_ICON = "mdi:kbdenter-hint";
const ENTER_QUERY = "kbdenter";

test.describe("editor icon hint", () => {
    test("typing ':' shows the mocked iconify results", async ({createTestDocument, page}) => {
        await mockIconifyApis(page, {searchIcons: ["mdi:home", "mdi:cat"]});
        await createTestDocument("iconify-hint-search", "hint");

        const group = await typeIconHint(page, "home");

        expect(await group.locator(".emojis__item").evaluateAll(items =>
            items.map(item => item.getAttribute("aria-label")))).toEqual(["mdi:home", "mdi:cat"]);
    });

    test("inserting from the hint adds the icon to the document", async ({
        createTestDocument, page, siyuanAPI,
    }) => {
        await mockIconifyApis(page, {searchIcons: [UNIQUE_ICON]});
        await siyuanAPI.removeWorkspaceFile(`/${emojiFilePath(UNIQUE_ICON)}`);
        await createTestDocument("iconify-hint-insert", "hint insert");

        try {
            const group = await typeIconHint(page, "e2e");
            await group.locator(".emojis__item").first().click();

            await expect.poll(async () => (await siyuanAPI.readDir(`/${EMOJI_DIR}`))
                .map(file => file.name), {timeout: 10000}).toContain(emojiFileName(UNIQUE_ICON));

            const editor = getBodyWysiwyg(getActiveProtyle(page));
            await expect(editor.locator(`img[src$="${emojiFileName(UNIQUE_ICON)}"]`)).toHaveCount(1);
        } finally {
            await siyuanAPI.removeWorkspaceFile(`/${emojiFilePath(UNIQUE_ICON)}`);
        }
    });

    // issue #36：提示面板里按 Enter 时，思源直接 fill(data-unicode)，不触发插件的保存逻辑，
    // 未落盘的图标会被当成普通文本 `:iconify/xxx:` 插入。
    test("pressing Enter on a new iconify hint saves and inserts it", async ({
        createTestDocument, page, siyuanAPI,
    }) => {
        await mockIconifyApis(page, {searchIcons: [ENTER_ICON]});
        await siyuanAPI.removeWorkspaceFile(`/${emojiFilePath(ENTER_ICON)}`);
        await createTestDocument("iconify-hint-enter", "hint enter");

        try {
            const group = await typeIconHint(page, ENTER_QUERY);
            // 没有原生命中的表情时，插件会把第一个 Iconify 结果标为当前项
            await expect(group.locator(".emojis__item").first())
                .toHaveClass(/emojis__item--current/);
            await page.keyboard.press("Enter");

            await expect.poll(async () => (await siyuanAPI.readDir(`/${EMOJI_DIR}`))
                .map(file => file.name), {timeout: 10000}).toContain(emojiFileName(ENTER_ICON));

            const editor = getBodyWysiwyg(getActiveProtyle(page));
            await expect(editor.locator(`img[src$="${emojiFileName(ENTER_ICON)}"]`)).toHaveCount(1);
            // 不应退化成 `:iconify/xxx:` 纯文本
            await expect(editor).not.toContainText("iconify/");
        } finally {
            await siyuanAPI.removeWorkspaceFile(`/${emojiFilePath(ENTER_ICON)}`);
        }
    });
});
