import {Page} from "@playwright/test";

export interface IIconifyMockOptions {
    /** `/search` 返回的图标全名（prefix:name）。 */
    searchIcons?: string[];
    /** yesicon 搜索返回的图标 id。 */
    yesiconIcons?: string[];
}

/** 一个足够简单、iconify-icon 能正常渲染的图标 body。 */
const ICON_BODY = '<path d="M0 0h24v24H0z" fill="currentColor"/>';

/**
 * 拦截 iconify 相关的外部请求，让搜索与图标数据都来自本地桩，
 * 这样用例既不依赖外网，也不会受第三方接口限流影响。
 *
 * - `https://api.iconify.design/search` -> 搜索桩
 * - `https://api.iconify.design/<prefix>.json` -> 图标数据桩（iconify-icon 组件渲染时需要）
 * - `https://yesicon.app/api/search` -> yesicon 搜索桩
 */
export const mockIconifyApis = async (page: Page, options: IIconifyMockOptions = {}) => {
    const searchIcons = options.searchIcons ?? ["mdi:home", "mdi:home-outline", "mdi:cat"];
    const yesiconIcons = options.yesiconIcons ?? ["mdi:home", "mdi:cat"];

    await page.route(/https:\/\/api\.iconify\.design\//, async route => {
        const url = new URL(route.request().url());
        if (url.pathname.endsWith("/search")) {
            await route.fulfill({json: {icons: searchIcons}});
            return;
        }
        const prefix = url.pathname.replace(/^\//, "").replace(/\.json$/, "");
        const names = (url.searchParams.get("icons") ?? "").split(",").filter(Boolean);
        const icons: Record<string, {body: string}> = {};
        for (const name of names) {
            icons[name] = {body: ICON_BODY};
        }
        await route.fulfill({json: {prefix, width: 24, height: 24, icons}});
    });

    await page.route(/https:\/\/yesicon\.app\/api\//, async route => {
        await route.fulfill({json: {icons: yesiconIcons.map(id => ({id}))}});
    });
};
