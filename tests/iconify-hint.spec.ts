import {expect, test} from "./fixtures";
import {
    EMOJI_DIR,
    emojiFileName,
    emojiFilePath,
    getActiveProtyle,
    typeIconHint,
} from "./helpers/plugin";
import {mockIconifyApis} from "./helpers/iconifyApi";

/** 用例独享的图标名，避免命中工作空间里已经保存过的图标。 */
const UNIQUE_ICON = "mdi:e2e-hint-insert";

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

            const editor = getActiveProtyle(page).locator(".protyle-wysiwyg").first();
            await expect(editor.locator(`img[src$="${emojiFileName(UNIQUE_ICON)}"]`)).toHaveCount(1);
        } finally {
            await siyuanAPI.removeWorkspaceFile(`/${emojiFilePath(UNIQUE_ICON)}`);
        }
    });
});
