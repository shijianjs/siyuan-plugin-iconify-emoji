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
 * - `https://yesicon.app/api/explorer/ui` -> yesicon 搜索桩
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
        const url = new URL(route.request().url());
        // 只认新接口：路径写错（例如退回已下线的 /api/search）时让用例直接失败
        if (url.pathname !== "/api/explorer/ui") {
            await route.fulfill({status: 404, json: {}});
            return;
        }
        // 真接口缺 query 或 size 超过 160 都会 400，桩保持一致，免得插件参数写错时用例仍然绿
        if (!url.searchParams.get("query") || Number(url.searchParams.get("size")) > 160) {
            await route.fulfill({status: 400, json: {}});
            return;
        }
        await route.fulfill({json: {icons: yesiconIcons.map(id => ({id})), total: yesiconIcons.length}});
    });
};
