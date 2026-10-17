// 思源注入到 window 上的全局对象。这里只声明插件实际会访问到的字段。
interface Window {
    siyuan: {
        config: any;
        languages: any;
        emojis: any;
        layout: any;
        mobile: any;
    };
    Lute: any;
}
