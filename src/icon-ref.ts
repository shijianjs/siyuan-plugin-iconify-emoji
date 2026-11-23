import { colord } from "colord";
import { delay } from "es-toolkit";
import { buildIcon, getIcon, iconToHTML } from "iconify-icon";
import stringHash from "string-hash";

/** 等组件把 svg 渲染进 shadowRoot 的最长时间，毫秒。 */
const RENDER_TIMEOUT = 1000;
/** 轮询组件渲染结果的间隔，毫秒。 */
const RENDER_POLL_INTERVAL = 50;

/** 取不到图标 svg 时抛出；异常里带着是哪个图标，调用方据此决定是降级还是上报。 */
export class IconSvgUnavailableError extends Error {
    constructor(readonly iconName: string) {
        super(`无法获取 Iconify 图标 svg: ${iconName}`);
        this.name = "IconSvgUnavailableError";
    }
}

/**
 * 一个 Iconify 图标的引用：名字、落盘文件名、思源自定义表情的 unicode，以及由名字算出的稳定颜色。
 * 这些值都由图标名派生，所以只存名字，其余在字段里一次算好。
 */
export class IconRef {
    /** iconify 的完整图标名，例如 `mdi:home`。 */
    readonly name: string;
    /** 保存到 emoji 目录下的文件名，例如 `mdi--home.svg`。 */
    readonly fileName: string;
    /** 思源自定义表情的 unicode 值，例如 `iconify/mdi--home.svg`。 */
    readonly unicode: string;
    /** 颜色只算一次：同一个图标在任何面板里都是同一种颜色。 */
    private cachedColor?: string;

    constructor(name: string) {
        this.name = name;
        this.fileName = `${name.replace(":", "--")}.svg`;
        this.unicode = `iconify/${this.fileName}`;
    }

    /** 按图标名创建引用；名字为空（例如按钮还没渲染出图标）时返回 undefined。 */
    static of(name: string | undefined | null): IconRef | undefined {
        return name ? new IconRef(name) : undefined;
    }

    /** 由名字哈希出的稳定颜色，同一图标每次渲染都一样。 */
    get color(): string {
        // h 是角度，s / l 是百分比：色相随名字散开，饱和度 70%、亮度 50%
        return (this.cachedColor ??= colord({
            h: stringHash(this.name) % 360,
            s: 70,
            l: 50,
        }).toHex());
    }

    /**
     * 取图标的 svg 文本，并把颜色写进 `style`（iconify 内部用 `fill="currentColor"`，设 color 即可生效）。
     * 优先用组件缓存里的图标数据，避免再请求 api.iconify.design（会被 Cloudflare 403 拦截）。
     *
     * @param component 面板里已经渲染过的 iconify-icon 元素，用于兜底读 shadowRoot
     */
    async svgFrom(component: HTMLElement | null): Promise<string> {
        const data = getIcon(this.name);
        if (data) {
            const { body, attributes } = buildIcon(data);
            return iconToHTML(body, { ...attributes, style: `color: ${this.color}` });
        }
        return this.colorize(await this.renderedSvg(component));
    }

    /** 兜底路径：等组件把 svg 渲染进 shadowRoot，再取出原始文本。 */
    private async renderedSvg(component: HTMLElement | null): Promise<string> {
        for (let waited = 0; component && waited < RENDER_TIMEOUT; waited += RENDER_POLL_INTERVAL) {
            const raw = (component.shadowRoot?.innerHTML || "").trim();
            if (raw.includes("<svg")) {
                return raw;
            }
            await delay(RENDER_POLL_INTERVAL);
        }
        throw new IconSvgUnavailableError(this.name);
    }

    /** 把原始 svg 文本解析成节点、写入颜色，再序列化回去。 */
    private colorize(rawSvg: string): string {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = rawSvg;
        const svg = wrapper.querySelector("svg");
        if (!svg) {
            throw new IconSvgUnavailableError(this.name);
        }
        svg.style.color = this.color;
        return svg.outerHTML;
    }
}
