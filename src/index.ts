import {fetchSyncPost, IMenuItem, IProtyle, Plugin} from "siyuan";
import {Client} from "@siyuan-community/siyuan-sdk";

import {buildIcon, getIcon, iconToHTML} from 'iconify-icon'
import "./index.scss";

import {debounce, delay} from "es-toolkit";
import stringHash from "string-hash";
import {TinyColor} from "@ctrl/tinycolor";
import {getSelectionOffset} from "@/SiyuanUtils";
import {max, values} from "es-toolkit/compat";
import type zh_CN from '../public/i18n/zh_CN.json'
import {SettingUtils} from "@/libs/setting-utils";

type IconAddMode = 'search' | 'hint'

const iconSearchLimit = 'iconSearchLimit'
const iconSearchDebounce = 'iconSearchDebounce'
const newIconHintDelay = 'newIconHintDelay'
const enableIconHint = 'enableIconHint'
// iconSearchType
const iconSearchType = 'iconSearchType'
// yesiconLanguage
const yesiconLanguage = 'yesiconLanguage'

enum IconSearchTypeEnum {
    iconify='iconify',
    yesicon='yesicon'
}

export default class IconifyPlugin extends Plugin {
    private settingUtils: SettingUtils;
    typedI18n: typeof zh_CN
    unloadActions = [];
    protyleCleaners = new WeakMap<IProtyle, () => void>()
    protyleCleanersIndex = new Set<IProtyle>()
    client: Client;


    async onload() {
        this.typedI18n = this.i18n as any
        await this.initSettings();
        this.client = new Client({})

        await this.client.putFile({
            path: `/data/emojis/iconify`,
            // data: svgText转blobPart
            isDir: true
        })

    }


    async initSettings() {
        this.settingUtils = new SettingUtils({
            plugin: this
        });
        this.settingUtils.addItem({
            key: iconSearchType,
            value: IconSearchTypeEnum.iconify,
            type: "select",
            title: this.typedI18n.iconSearchType.title,
            description: this.typedI18n.iconSearchType.description,
            options: {
                [IconSearchTypeEnum.iconify]: IconSearchTypeEnum.iconify,
                [IconSearchTypeEnum.yesicon]: IconSearchTypeEnum.yesicon
            },
        });
        // - [English](https://yesicon.app/search/table?lang=en)
        // - [简体中文](https://yesicon.app/search/table?lang=zh-hans)
        // - [Español](https://yesicon.app/search/table?lang=es)
        // - [正體中文](https://yesicon.app/search/table?lang=zh-hant)
        // - [Deutsch](https://yesicon.app/search/table?lang=de)
        // - [日本語](https://yesicon.app/search/table?lang=ja)
        // - [Français](https://yesicon.app/search/table?lang=fr)
        // - [한국어](https://yesicon.app/search/table?lang=ko)
        // - [Português](https://yesicon.app/search/table?lang=pt)
        this.settingUtils.addItem({
            key: yesiconLanguage,
            value: 'zh-hans',
            type: "select",
            title: this.typedI18n.yesiconLanguage.title,
            description: this.typedI18n.yesiconLanguage.description,
            options: {
                'en': 'English',
                'zh-hans': '简体中文',
                'es': 'Español',
                'zh-hant': '正體中文',
                'de': 'Deutsch',
                'ja': '日本語',
                'fr': 'Français',
                'ko': '한국어',
                'pt': 'Português'
            },
        });
        this.settingUtils.addItem({
            key: iconSearchLimit,
            value: 50,
            type: "number",
            title: this.typedI18n.iconSearchLimit.title,
            description: this.typedI18n.iconSearchLimit.description,
        });
        this.settingUtils.addItem({
            key: iconSearchDebounce,
            value: 300,
            type: "number",
            title: this.typedI18n.iconSearchDebounce.title,
            description: this.typedI18n.iconSearchDebounce.description,
        });
        this.settingUtils.addItem({
            key: enableIconHint,
            value: true,
            type: "checkbox",
            title: this.typedI18n.enableIconHint.title,
            description: this.typedI18n.enableIconHint.description,
        });
        this.settingUtils.addItem({
            key: newIconHintDelay,
            value: 300,
            type: "number",
            title: this.typedI18n.newIconHintDelay.title,
            description: this.typedI18n.newIconHintDelay.description,
        });
        await this.settingUtils.load(); //导入配置并合并
    }

    get iconSearchLimit():number{
        return this.settingUtils.get(iconSearchLimit)
    }
    get iconSearchDebounce():number{
        return max([this.settingUtils.get(iconSearchDebounce),200])
    }
    get newIconHintDelay():number{
        return max([this.settingUtils.get(newIconHintDelay),100])
    }
    get enableIconHint():boolean{
        return this.settingUtils.get(enableIconHint)
    }
    get iconSearchType():IconSearchTypeEnum{
        return this.settingUtils.get(iconSearchType) ?? IconSearchTypeEnum.iconify
    }
    get yesiconLanguage():string{
        return this.settingUtils.get(yesiconLanguage) ?? 'zh-hans'
    }


    unloadListeners() {
        this.unloadActions.forEach((f) => f());
        this.protyleCleanersIndex.forEach(protyle => {
            this.protyleCleaners.get(protyle)?.()
        })
    }

    onLayoutReady() {
        // console.log("onLayoutReady")

        const rootObserver = new MutationObserver((mutationList) => {
            for (const mutation of mutationList) {
                if (!mutation.addedNodes.length) {
                    continue;
                }
                for (const node of mutation.addedNodes) {
                    const n = (node as HTMLElement);
                    if (n && n.getAttribute && n?.getAttribute('data-key') === 'dialog-emojis') {
                        const container = n.querySelector('.emojis');
                        this.setupContainer(container as HTMLElement);
                    }
                }

            }
        })
        const config = {attributes: false, childList: true, subtree: false};

        rootObserver.observe(document.body, config);

        this.unloadActions.push(() => rootObserver.disconnect());

        const protyleObserver = new MutationObserver((mutationList) => {
            for (const mutation of mutationList) {
                for (const node of mutation.addedNodes) {
                    const n = (node as HTMLElement);
                    if (n.classList.contains('emojis')) {
                        this.setupContainer(n);
                    }
                }
            }
        })

        let loadProtyleListener = (event) => {
            let protyle: IProtyle = event.detail.protyle;
            const hint = protyle.hint;
            if (hint) {
                // console.log('hint试验', protyle, hint)
                protyleObserver.observe(hint.element, config);
                this.unloadActions.push(() => protyleObserver.disconnect);
                this.initHintInputListener(protyle);
            }
        };
        this.eventBus.on('loaded-protyle-static', loadProtyleListener);
        this.unloadActions.push(() => this.eventBus.off('loaded-protyle-static', loadProtyleListener));

        let destroyProtyleListener = (event) => {
            this.protyleCleanersIndex.delete(event.detail.protyle)
            this.protyleCleaners.delete(event.detail.protyle)
        };
        this.eventBus.on('destroy-protyle', destroyProtyleListener)
        this.unloadActions.push(() => this.eventBus.off('destroy-protyle', destroyProtyleListener));
    }

    private initHintInputListener(protyle: IProtyle) {
        const hint = protyle.hint
        let element = protyle.wysiwyg.element;
        let listener = debounce(async (e) => {
            if (hint.splitChar === ':' && this.enableIconHint) {
                // console.log('input', event, hint)
                const start = getSelectionOffset(protyle.toolbar.range.startContainer, element).start;
                let currentLineValue = protyle.toolbar.range.startContainer.textContent.substring(0, start) || "";
                // currentLineValue = currentLineValue.trim(); // 不再trim，输入空格代表不再需要提示
                // hint.getKey 的签名是 (currentLineValue, textAfterCaret, extend)，
                // 第三个参数 extend 必须传入，否则内部 extend.forEach 会抛错导致提示失效；
                // textAfterCaret 只服务于块引提示（如 `[[`），emoji 提示用不到，传空串即可。
                // @ts-ignore
                const key: string = hint.getKey(currentLineValue, "", protyle.options.hint.extend);
                // let key: string
                // if (currentLineValue.includes(':')) {
                //     let number = currentLineValue.lastIndexOf(':');
                //     key = currentLineValue.substring(number + 1);
                // }
                if (key) {
                    // console.log('hint key', key, hint, e, start, currentLineValue)
                    if (/\s/.test(key)){
                        return;
                    }
                    console.log('hint key', key)
                    let container: HTMLElement = hint.element.querySelector('.emojis');
                    if (container) {
                        await this.updateIconifyContainer(key, container, this.hintCurrentRequestId,'hint', protyle);
                    }
                }
            }
        }, this.iconSearchDebounce);
        element.addEventListener('input', listener)
        this.protyleCleaners.set(protyle, () => {
            element?.removeEventListener('input', listener)
        })
        this.protyleCleanersIndex.add(protyle)
    }

    hintCurrentRequestId = {id: 0}

    async onunload() {
        this.unloadListeners();
    }

    uninstall() {
    }

    setupContainer(container: HTMLElement) {
        // console.log('setupContainer', container)
        const input: HTMLElement & any = container.querySelector('.b3-text-field');
        if (input && !input.hasIconifyListener) {
            input.hasIconifyListener = true;
            this.attachSearchHandler(input, container);
        }
    }

    attachSearchHandler(input: HTMLInputElement, container: HTMLElement) {
        let currentRequestId = {id: 0}; // 防止旧请求覆盖新结果

        input.addEventListener('input', debounce(async (e) => {
            const query: string = e.target.value.trim();
            await this.updateIconifyContainer(query, container, currentRequestId);
        }, this.iconSearchDebounce));
    }


    async updateIconifyContainer(query: string, container: HTMLElement, currentRequestId: { id: number },mode:IconAddMode='search', protyle?: IProtyle) {
        const requestId = ++currentRequestId.id;
        if (query.length < 2) return;
        try {
            const icons = await this.searchIcon(query);
            if (requestId !== currentRequestId.id) return; // 丢弃过期请求
            await this.injectIconifyResults(icons, container,mode, protyle);

        } catch (err) {
            console.warn('Iconify 搜索失败', err);
        }
    }

    /**
     * 把新保存的图标同步进前端 Lute 的表情表。
     *
     * 插件是直接 putFile 写文件的，不经过思源「添加自定义表情」的前端流程，
     * 因此不会调用 putEmojis 刷新 Lute。内核的 emojis 目录监听在 Linux 上不递归，
     * 写进 iconify/ 子目录也不会触发 reloadEmojiConf。结果是：在 Linux 里从 `:` 提示
     * 插入新图标时，Lute 不认识该表情，会把 `:iconify/xxx:` 当成普通文本插入。
     * 这里主动重建一次自定义表情表，保证各平台行为一致。
     */
    private async reloadIconifyEmojis(protyle?: IProtyle) {
        const lute = protyle?.lute;
        if (!lute) return;
        try {
            const resp = await fetchSyncPost('/api/system/getEmojiConf', {});
            if (resp.code !== 0 || !Array.isArray(resp.data)) return;
            window.siyuan.emojis = resp.data;
            const emojiPath = (protyle.options as any)?.hint?.emojiPath ?? '/emojis';
            const custom = (resp.data as any[]).find(category => category.id === 'custom');
            if (!custom?.items?.length) return;
            const emojis: Record<string, string> = {};
            custom.items.forEach((item: any) => {
                emojis[item.keywords] = `${emojiPath}/${item.unicode}`;
            });
            lute.PutEmojis(emojis);
        } catch (err) {
            console.warn('Iconify 表情配置刷新失败', err);
        }
    }

    /**
     *
     */
    async injectIconifyResults(icons: string[], container: HTMLElement, mode: IconAddMode='search', protyle?: IProtyle) {
        const iconifyResultGroupClass = 'iconify-result-group'
        const panel: HTMLElement = container.querySelector('.emojis__panel')
        if (!panel) {
            return
        }
        // 父容器存在则复用，不存在再插入：避免每次搜索都移除重建，
        // 导致和其他插件生成的分组相互挤压、位置不稳定
        let groupElement = panel.querySelector<HTMLElement>('.' + iconifyResultGroupClass)
        if (!groupElement) {
            groupElement = document.createElement('div')
            groupElement.classList.add(iconifyResultGroupClass)

            const titleDiv = document.createElement('div')
            titleDiv.textContent = 'Iconify'
            // titleDiv.className = 'emojis__title' //加了这个class后，结果会不删除原来输入的内容
            titleDiv.classList.add('iconify_emojis__title')
            titleDiv.setAttribute('data-type', 'iconify')
            groupElement.appendChild(titleDiv)

            const contentElement = document.createElement('div')
            contentElement.classList.add('emojis__content')
            groupElement.appendChild(contentElement)

            panel.appendChild(groupElement)
        }

        // 清除旧的 Iconify 图标：只清空内容，父容器留在原位
        const contentDiv = groupElement.querySelector<HTMLElement>('.emojis__content')
        contentDiv.innerHTML = ''

        if (icons.length === 0) {
            groupElement.classList.add('fn__none')
            return
        }
        groupElement.classList.remove('fn__none')

        let parentElementClassList = container.parentElement.classList;
        if (parentElementClassList.contains('protyle-hint') && parentElementClassList.contains('fn__none')) {
            parentElementClassList.remove('fn__none')
        }

        const filesResp = await this.client.readDir({path: '/data/emojis/iconify'})
        const existsFiles = filesResp.data.map(file => file.name)
        icons.forEach(iconName => {
            const button = document.createElement('button')
            button.classList.add('emojis__item', 'ariaLabel')
            const svgFileName = iconName.replace(':', '--') + '.svg'
            button.setAttribute('data-unicode', `iconify/${svgFileName}`)
            let icon = document.createElement('iconify-icon');
            icon.setAttribute('icon', iconName)
            // let color = '#1E88E5'; //  hsl(208, 79%, 51%)
            let color = this.calcColor(iconName);
            icon.style.color = color
            button.appendChild(icon)
            button.setAttribute('aria-label', iconName)
            contentDiv.appendChild(button)
            if (!existsFiles.includes(svgFileName)) {
                button.onclick = async (e) => {
                    // 阻止事件冒泡，避免触发思源原生直接设置
                    e.stopPropagation()
                    let svgText: string
                    try {
                        svgText = await this.getIconSvg(icon, color)
                    } catch (err) {
                        console.warn('Iconify 图标获取失败', err)
                        return
                    }
                    await this.client.putFile({
                        path: `/data/emojis/iconify/${svgFileName}`,
                        // data: svgText转blobPart
                        file: svgText,
                    })
                    button.onclick = null
                    // 新图标写盘后先刷新 Lute 表情表，否则提示插入会退化成纯文本
                    await this.reloadIconifyEmojis(protyle)
                    // console.log(e)
                    // 创建一个与原始事件相同的指针事件
                    const clonedEvent = new PointerEvent(e.type, e);
                    if (mode === 'hint'){
                        await delay(this.newIconHintDelay)
                    }
                    button.dispatchEvent(clonedEvent)
                }
            }
        })
    }

    async searchIcon(query: string): Promise<string[]> {
        try {
            if (this.iconSearchType===IconSearchTypeEnum.iconify){
                return await this.searchIconify(query);
            }else if (this.iconSearchType===IconSearchTypeEnum.yesicon){
                return await this.searchYesicon(query);
            }
        } catch (err) {
            return [];
        }
    }

    async searchIconify(query: string) {
        const res = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=${this.iconSearchLimit}`);
        const data = await res.json();
        return data.icons || [];
    }
    async searchYesicon(query: string) {
        const res = await fetch(
            `https://yesicon.app/api/search?page=1&size=${this.iconSearchLimit}&cate&style&collection&q=${encodeURIComponent(query)}&locale=${this.yesiconLanguage}&omit=1&c=1`);
        const data = await res.json();
        return data.icons?.map(it=>it.id) || [];
    }

    /**
     * 获取图标的 svg 字符串，并把颜色通过 style 注入到 svg 标签上
     * （iconify 图标内部使用 fill="currentColor"，设置 color 即可生效）。
     * 避免直接请求 api.iconify.design 被 Cloudflare 403 拦截。
     *
     * 优先使用 iconify-icon 官方导出的 getIcon + buildIcon + iconToHTML：
     * 图标已被组件渲染过，数据在缓存中，不会发起新的网络请求。
     */
    private async getIconSvg(icon: HTMLElement, color: string): Promise<string> {
        const iconName = icon.getAttribute('icon')
        const data = iconName ? getIcon(iconName) : undefined
        if (data) {
            const {body, attributes} = buildIcon(data)
            return iconToHTML(body, {...attributes, style: `color: ${color}`})
        }
        // 兜底：直接从 shadowRoot 取组件已渲染好的 svg
        const timeout = 1000
        const start = Date.now()
        let rawSvg = ''
        while (Date.now() - start < timeout) {
            rawSvg = (icon.shadowRoot?.innerHTML || '').trim()
            if (rawSvg.includes('<svg')) {
                break
            }
            await delay(50)
        }
        if (!rawSvg.includes('<svg')) {
            throw new Error(`无法获取 iconify 图标 svg: ${iconName}`)
        }
        const wrapper = document.createElement('div')
        wrapper.innerHTML = rawSvg
        const svg = wrapper.querySelector('svg')
        if (!svg) {
            throw new Error(`iconify 图标 svg 解析失败: ${iconName}`)
        }
        svg.style.color = color
        return svg.outerHTML
    }

    private calcColor(iconName: string) {
        let hash = stringHash(iconName)
        return new TinyColor({h: hash % 360, s: 0.7, l: 0.5}).toHexString()
    }
}
