import {expect, Locator, Page} from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {PLUGIN_NAME} from "./runtime";
import {openPluginSettings, SETTINGS_FILE} from "./plugin";
import {SiyuanAPI} from "./siyuanAPI";

export type ISettingKey =
    "iconSearchType" | "yesiconLanguage" | "iconSearchLimit"
    | "iconSearchDebounce" | "enableIconHint" | "newIconHintDelay";

export type ISettingValue = string | number | boolean;

export type IPluginSettings = Partial<Record<ISettingKey, ISettingValue>>;

const readI18n = (lang: "en_US" | "zh_CN") => JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "public/i18n", `${lang}.json`), "utf-8"),
) as Record<string, {title: string}>;

/** 按当前界面语言返回设置项标题，避免依赖固定语言。 */
export const settingTitle = async (page: Page, key: ISettingKey) => {
    const lang = await page.evaluate(() => window.siyuan.config.appearance.lang);
    const i18n = readI18n(lang.toLowerCase().startsWith("zh") ? "zh_CN" : "en_US");
    const title = i18n[key]?.title;
    if (!title) {
        throw new Error(`unknown setting title for ${key}`);
    }
    return title;
};

/** 按设置项标题定位包含输入控件的设置行。 */
export const settingRow = async (page: Page, dialog: Locator, key: ISettingKey) => {
    const title = await settingTitle(page, key);
    const row = dialog.locator(".b3-label.config-item")
        .filter({has: page.locator(".config-name", {hasText: title})});
    await expect(row).toHaveCount(1);
    return row;
};

const settingsPath = `/data/${SETTINGS_FILE}`;

/** 读取插件设置文件；尚未持久化时返回空对象。 */
export const readPluginSettings = async (api: SiyuanAPI): Promise<IPluginSettings> => {
    const text = await api.readWorkspaceTextIfExists(settingsPath);
    return text ? JSON.parse(text) as IPluginSettings : {};
};

/** 点击设置对话框的保存按钮，把当前面板取值写入设置文件。 */
export const savePluginSettingsDialog = async (page: Page, dialog: Locator) => {
    const saveButton = dialog.locator(".b3-dialog__action .b3-button--text");
    await expect(saveButton).toBeVisible();
    await saveButton.click();
    await expect(dialog).toHaveCount(0);
};

/** 在设置行上写入取值，自动区分 select / checkbox / 文本输入。 */
const applySettingValue = async (row: Locator, value: ISettingValue) => {
    const control = row.locator("select, input").first();
    const tag = await control.evaluate(element => element.tagName);
    const type = await control.getAttribute("type");
    if (tag === "SELECT") {
        await control.selectOption(String(value));
    } else if (type === "checkbox") {
        await control.setChecked(Boolean(value));
    } else {
        await control.fill(String(value));
    }
};

/** 读取设置行当前取值，仅用于恢复现场。 */
const readSettingValue = async (row: Locator): Promise<ISettingValue> => {
    const control = row.locator("select, input").first();
    const type = await control.getAttribute("type");
    if (type === "checkbox") {
        return control.isChecked();
    }
    return control.inputValue();
};

/**
 * 通过设置面板修改并保存某个选项，使用例不依赖工作空间里已有的设置值。
 * 返回恢复该选项的函数。
 */
export const withSetting = async (
    page: Page,
    api: SiyuanAPI,
    key: ISettingKey,
    value: ISettingValue,
) => {
    const before = (await readPluginSettings(api))[key];
    const dialog = await openPluginSettings(page);
    const row = await settingRow(page, dialog, key);
    const original = await readSettingValue(row);
    await applySettingValue(row, value);
    await savePluginSettingsDialog(page, dialog);
    await expect.poll(async () => String((await readPluginSettings(api))[key]), {timeout: 10000})
        .toBe(String(value));

    return async () => {
        const restoreDialog = await openPluginSettings(page);
        const restoreRow = await settingRow(page, restoreDialog, key);
        await applySettingValue(restoreRow, original);
        await savePluginSettingsDialog(page, restoreDialog);
        if (before === undefined) {
            return;
        }
        await expect.poll(async () => String((await readPluginSettings(api))[key]), {timeout: 10000})
            .toBe(String(before));
    };
};

export {PLUGIN_NAME, SETTINGS_FILE};
