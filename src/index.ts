import {
    Plugin
} from "siyuan";
import {Client} from "@siyuan-community/siyuan-sdk";

import 'iconify-icon'
import "./index.scss";

import {debounce} from "es-toolkit";
import stringHash from "string-hash";
import {TinyColor} from "@ctrl/tinycolor";


export default class PluginSample extends Plugin {

    unloadActions = [];
    client: Client;


    async onload() {
        this.client = new Client({})

        await this.client.putFile({
            path: `/data/emojis/iconify`,
            // data: svgText转blobPart
            isDir: true
        })

    }

    unloadListeners() {
        this.unloadActions.forEach((f) => f());
    }

    onLayoutReady() {

        const rootObserver = new MutationObserver((mutationList) => {
            for (const mutation of mutationList) {
                if (!mutation.addedNodes.length) {
                    continue;
                }
                for (const node of mutation.addedNodes) {
                    const n = (node as HTMLElement);
                    if (n?.getAttribute('data-key') === 'dialog-emojis') {
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

        this.eventBus.on('loaded-protyle-static', (event) => {
            const hint = event.detail.protyle.hint;
            if (hint) {
                protyleObserver.observe(hint.element, config);
                this.unloadActions.push(() => protyleObserver.disconnect);
            }
        });

    }

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
        let currentRequestId = 0; // 防止旧请求覆盖新结果

        input.addEventListener('input', debounce(async (e) => {
            const query: string = e.target.value.trim();
            const requestId = ++currentRequestId;
            if (query.length < 2) return;
            try {
                const icons = await this.searchIconify(query);
                if (requestId !== currentRequestId) return; // 丢弃过期请求
                // 清除旧的 Iconify 分组
                const existingGroup = container.querySelector('.iconify-result-group');
                if (existingGroup) existingGroup.remove();

                if (icons.length > 0) {
                    await this.injectIconifyResults(icons, container);
                }
            } catch (err) {
                console.warn('Iconify 搜索失败', err);
            }
        }, 300));
    }

    /**
     *
     * @param icons
     * @param container
     */
    async injectIconifyResults(icons: string[], container: HTMLElement) {
        const panel: HTMLElement = container.querySelector('.emojis__panel')
        const titleDiv = document.createElement('div')
        titleDiv.textContent = 'Iconify'
        titleDiv.className = 'emojis__title'
        panel.appendChild(titleDiv)
        const groupDiv = document.createElement('div')
        groupDiv.classList.add('iconify-result-group', 'emojis__content')
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
                    button.dispatchEvent(clonedEvent)
                }
            }
        })
        panel.appendChild(groupDiv)
    }

    private async searchIconify(query: string): Promise<string[]> {
        try {
            const res = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=50`);
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
