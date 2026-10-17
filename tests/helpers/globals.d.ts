export {};

declare global {
    /**
     * 测试里通过 page.evaluate 访问的内核全局对象；这里只声明用到的字段，
     * 避免为了类型检查引入思源前端源码的类型。
     */
    interface Window {
        siyuan: {
            config: {
                appearance: {lang: string};
            };
            ws?: {ws?: WebSocket};
            [key: string]: unknown;
        };
    }
}
