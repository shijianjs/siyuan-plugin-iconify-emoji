# 思源 iconify emoji 插件

[English](./README.md)

## 说明

- [Iconify](https://iconify.design/) 是一个开源图标库整合项目，内部包含了超过20万个图标，并提供完善的前端组件库、在线api。
- 这个插件基于iconify api、思源的自定义emoji图标功能做了整合，能在思源中无缝使用iconify庞大的图标生态。

## 使用方法

1. 安装插件；
2. 支持以下图标操作：
    - 文档目录树改图标
    - 文档顶部改图标
    - 文档内容插入图标
        - 类似这样的输入触发插入图标：`:home`
        - 安装插件后，新打开的文档标签页生效，已经打开的不生效，需要重新打开；
    - 文档内容修改图标
        - 自定义图标文件才能修改，官方的emoji字体图标无法修改；
3. 搜索框输入搜索
    - 搜索框有输入内容才能触发iconify搜索，搜索之后才会显示iconify内容；
    - iconify仅支持英文搜索，中文及其他语言搜不到；
4. 搜索到结果以后，鼠标点击iconify组下面的任意图标；
    - 此时插件会自动把图标下载到本地的emoji文件夹、并应用到相应位置；
    - 需要用鼠标点击，不支持`Enter`按键；
    - 文档内容插入新图标时，鼠标点击后，需要再输入一个空格新图标才会显示出来；

## 感谢

- [siyuan](https://github.com/siyuan-note/siyuan)
- [Iconify](https://iconify.design/)
- [zuoez02/siyuan-plugin-emoji-enhance](https://github.com/zuoez02/siyuan-plugin-emoji-enhance)
    - 思源`Emoji增强`插件，本插件主体逻辑参考这个插件的代码