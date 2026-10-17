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

    test("clicking a hint result inserts the icon into the document", async ({
        createTestDocument, page, siyuanAPI,
    }) => {
        await mockIconifyApis(page, {searchIcons: [UNIQUE_ICON]});
        await createTestDocument("iconify-hint-insert", "hint insert");
        // 预先创建 emoji 文件：已存在的图标走思源原生插入逻辑，不经过插件「保存新图标」的延时重派发，
        // 这样断言只反映「点击提示结果会插入 emoji」，不会因为延时竞态而偶发失败。
        // （「保存新图标」的路径由 iconify-emoji-dialog.spec.ts 覆盖。）
        // 注意先打开文档，让插件 onload 建好 /data/emojis/iconify 目录。
        await siyuanAPI.writeWorkspaceFile(`/${EMOJI_DIR}`, emojiFileName(UNIQUE_ICON),
            '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect width="24" height="24"/></svg>',
            "image/svg+xml");

        try {
            const group = await typeIconHint(page, "e2e");
            await group.locator(".emojis__item").first().click();

            const editor = getActiveProtyle(page).locator(".protyle-wysiwyg").first();
            await expect(editor.locator(`img[src$="${emojiFileName(UNIQUE_ICON)}"]`)).toHaveCount(1);
        } finally {
            await siyuanAPI.removeWorkspaceFile(`/${emojiFilePath(UNIQUE_ICON)}`);
        }
    });
});
