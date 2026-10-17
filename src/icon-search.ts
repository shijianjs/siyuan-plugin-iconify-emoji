import { IconSearchTypeEnum } from "./constants";

/** iconify 官方搜索：只支持英文的图标原名检索 */
export async function searchIconify(query: string, limit: number): Promise<string[]> {
    const res = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=${limit}`);
    const data = await res.json();
    return data.icons || [];
}

/** yesicon 搜索：支持本地化语言检索（中英等） */
export async function searchYesicon(query: string, limit: number, language: string): Promise<string[]> {
    const res = await fetch(
        `https://yesicon.app/api/search?page=1&size=${limit}&cate&style&collection&q=${encodeURIComponent(query)}&locale=${language}&omit=1&c=1`);
    const data = await res.json();
    return data.icons?.map(it => it.id) || [];
}

export interface SearchOptions {
    type: IconSearchTypeEnum;
    limit: number;
    yesiconLanguage: string;
}

/**
 * 按当前设置选择搜索源，任何异常都降级为空结果。
 */
export async function searchIcon(query: string, options: SearchOptions): Promise<string[]> {
    try {
        if (options.type === IconSearchTypeEnum.iconify) {
            return await searchIconify(query, options.limit);
        }
        if (options.type === IconSearchTypeEnum.yesicon) {
            return await searchYesicon(query, options.limit, options.yesiconLanguage);
        }
    } catch (err) {
        return [];
    }
}
