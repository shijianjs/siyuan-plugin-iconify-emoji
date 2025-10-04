import {IMenuItem, IProtyle, Plugin} from "siyuan";
import {Client} from "@siyuan-community/siyuan-sdk";

import 'iconify-icon'
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
            if (hint.splitChar === ':') {
                // console.log('input', event, hint)
                const start = getSelectionOffset(protyle.toolbar.range.startContainer, element).start;
                let currentLineValue = protyle.toolbar.range.startContainer.textContent.substring(0, start) || "";
                currentLineValue = currentLineValue.trim();
                // @ts-ignore
                // const key: string = hint.getKey(currentLineValue, protyle.options.hint.extend);
                let key: string
                if (currentLineValue.includes(':')) {
                    let number = currentLineValue.lastIndexOf(':');
                    key = currentLineValue.substring(number + 1);
                }
                if (key) {
                    // console.log('hint key', key, hint, e, start, currentLineValue)
                    let container: HTMLElement = hint.element.querySelector('.emojis');
                    if (container) {
                        await this.updateIconifyContainer(key, container, this.hintCurrentRequestId,'hint');
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


    async updateIconifyContainer(query: string, container: HTMLElement, currentRequestId: { id: number },mode:IconAddMode='search') {
        const requestId = ++currentRequestId.id;
        if (query.length < 2) return;
        try {
            const icons = await this.searchIconify(query);
            if (requestId !== currentRequestId.id) return; // 丢弃过期请求
            await this.injectIconifyResults(icons, container,mode);

        } catch (err) {
            console.warn('Iconify 搜索失败', err);
        }
    }

    /**
     *
     */
    async injectIconifyResults(icons: string[], container: HTMLElement, mode: IconAddMode='search') {
        // 清除旧的 Iconify 分组
        const iconifyResultGroupClass = 'iconify-result-group'
        container.querySelectorAll('.' + iconifyResultGroupClass).forEach(group => group.remove());

        if (icons.length === 0) {
            return
        }
        let parentElementClassList = container.parentElement.classList;
        if (parentElementClassList.contains('protyle-hint') && parentElementClassList.contains('fn__none')) {
            parentElementClassList.remove('fn__none')
        }

        const panel: HTMLElement = container.querySelector('.emojis__panel')
        const titleDiv = document.createElement('div')
        titleDiv.textContent = 'Iconify'
        // titleDiv.className = 'emojis__title' //加了这个class后，结果会不删除原来输入的内容
        titleDiv.classList.add(iconifyResultGroupClass, 'iconify_emojis__title')
        titleDiv.setAttribute('data-type', 'iconify')
        panel.appendChild(titleDiv)
        const groupDiv = document.createElement('div')
        // groupDiv.appendChild(titleDiv)
        groupDiv.classList.add('emojis__content', iconifyResultGroupClass)
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
            groupDiv.appendChild(button)
            if (!existsFiles.includes(svgFileName)) {
                button.onclick = async (e) => {
                    // 阻止事件冒泡，避免触发思源原生直接设置
                    e.stopPropagation()
                    const svgIconifyUrl = `https://api.iconify.design/${iconName}.svg?color=${encodeURIComponent(color)}`
                    // console.log(iconName)
                    const svgText: string = await (await fetch(svgIconifyUrl)).text()
                    await this.client.putFile({
                        path: `/data/emojis/iconify/${svgFileName}`,
                        // data: svgText转blobPart
                        file: svgText,
                    })
                    button.onclick = null
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
        panel.appendChild(groupDiv)
    }

    private async searchIconify(query: string): Promise<string[]> {
        try {
            const res = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=${this.iconSearchLimit}`);
            const data = await res.json();
            return data.icons || [];
        } catch (err) {
            return [];
        }
    }

    private calcColor(iconName: string) {
        let hash = stringHash(iconName)
        return new TinyColor({h: hash % 360, s: 0.7, l: 0.5}).toHexString()
    }
}
