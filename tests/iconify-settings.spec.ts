import {expect, test} from "./fixtures";
import {openPluginSettings} from "./helpers/plugin";
import {readPluginSettings, settingRow, withSetting} from "./helpers/settings";

/** 插件内置默认值，用于在工作空间尚未保存设置时比对面板取值。 */
const PLUGIN_DEFAULTS: Record<string, string | number | boolean> = {
    iconSearchType: "iconify",
    yesiconLanguage: "zh-hans",
    iconSearchLimit: 50,
    iconSearchDebounce: 300,
    enableIconHint: true,
    newIconHintDelay: 300,
};

const NUMBER_KEYS = ["iconSearchLimit", "iconSearchDebounce", "newIconHintDelay"] as const;
const SELECT_KEYS = ["iconSearchType", "yesiconLanguage"] as const;

test.describe("plugin settings", () => {
    test("shows every option with its effective value", async ({
        createTestDocument, page, siyuanAPI,
    }) => {
        await createTestDocument("iconify-settings-panel", "settings panel");
        const saved = await readPluginSettings(siyuanAPI);

        const dialog = await openPluginSettings(page);
        for (const key of SELECT_KEYS) {
            const expected = String(saved[key] ?? PLUGIN_DEFAULTS[key]);
            await expect((await settingRow(page, dialog, key)).locator("select").first())
                .toHaveValue(expected);
        }
        for (const key of NUMBER_KEYS) {
            const expected = String(saved[key] ?? PLUGIN_DEFAULTS[key]);
            await expect((await settingRow(page, dialog, key)).locator("input[type='number']").first())
                .toHaveValue(expected);
        }
        const expectedHint = saved.enableIconHint ?? PLUGIN_DEFAULTS.enableIconHint;
        await expect((await settingRow(page, dialog, "enableIconHint"))
            .locator("input[type='checkbox']").first())
            .toBeChecked({checked: Boolean(expectedHint)});

        await page.keyboard.press("Escape");
    });

    test("search type offers iconify and yesicon, yesicon offers nine languages", async ({
        createTestDocument, page,
    }) => {
        await createTestDocument("iconify-settings-options", "settings options");

        const dialog = await openPluginSettings(page);

        const typeOptions = (await settingRow(page, dialog, "iconSearchType")).locator("select option");
        await expect(typeOptions).toHaveCount(2);
        expect(await typeOptions.evaluateAll(elements =>
            elements.map(element => (element as HTMLOptionElement).value))).toEqual(
            ["iconify", "yesicon"]);

        const langOptions = (await settingRow(page, dialog, "yesiconLanguage")).locator("select option");
        await expect(langOptions).toHaveCount(9);
        const langValues = await langOptions.evaluateAll(elements =>
            elements.map(element => element.textContent?.trim() ?? ""));
        expect(langValues).toContain("简体中文");
        expect(langValues).toContain("English");

        await page.keyboard.press("Escape");
    });

    test("saving the panel persists the value", async ({
        createTestDocument, page, siyuanAPI,
    }) => {
        await createTestDocument("iconify-settings-save", "settings save");

        const restore = await withSetting(page, siyuanAPI, "iconSearchLimit", 234);
        try {
            expect((await readPluginSettings(siyuanAPI)).iconSearchLimit).toBe(234);

            // 重新打开面板应显示最新保存值
            const dialog = await openPluginSettings(page);
            await expect((await settingRow(page, dialog, "iconSearchLimit"))
                .locator("input[type='number']").first()).toHaveValue("234");
            await page.keyboard.press("Escape");
        } finally {
            await restore();
        }
    });

    test("cancelling the panel keeps the saved value", async ({
        createTestDocument, page, siyuanAPI,
    }) => {
        await createTestDocument("iconify-settings-cancel", "settings cancel");
        const before = await readPluginSettings(siyuanAPI);

        const dialog = await openPluginSettings(page);
        const input = (await settingRow(page, dialog, "iconSearchLimit"))
            .locator("input[type='number']").first();
        const original = await input.inputValue();
        await input.fill(original === "77" ? "78" : "77");
        await dialog.locator(".b3-dialog__action .b3-button--cancel").click();
        await expect(dialog).toHaveCount(0);

        expect(await readPluginSettings(siyuanAPI)).toEqual(before);
    });
});
