// 思源注入到 window 上的全局对象。这里只声明插件实际会访问到的字段：
// 刷新自定义表情表时，把 getEmojiConf 的结果写回前端，供后续表情面板使用。
interface Window {
    siyuan: {
        emojis: any;
    };
}
