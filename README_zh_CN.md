# 思源 iconify emoji 插件

[![zread](https://img.shields.io/badge/Ask_Zread-_.svg?style=flat&color=00b0aa&labelColor=000000&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQuOTYxNTYgMS42MDAxSDIuMjQxNTZDMS44ODgxIDEuNjAwMSAxLjYwMTU2IDEuODg2NjQgMS42MDE1NiAyLjI0MDFWNC45NjAxQzEuNjAxNTYgNS4zMTM1NiAxLjg4ODEgNS42MDAxIDIuMjQxNTYgNS42MDAxSDQuOTYxNTZDNS4zMTUwMiA1LjYwMDEgNS42MDE1NiA1LjMxMzU2IDUuNjAxNTYgNC45NjAxVjIuMjQwMUM1LjYwMTU2IDEuODg2NjQgNS4zMTUwMiAxLjYwMDEgNC45NjE1NiAxLjYwMDFaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik00Ljk2MTU2IDEwLjM5OTlIMi4yNDE1NkMxLjg4ODEgMTAuMzk5OSAxLjYwMTU2IDEwLjY4NjQgMS42MDE1NiAxMS4wMzk5VjEzLjc1OTlDMS42MDE1NiAxNC4xMTM0IDEuODg4MSAxNC4zOTk5IDIuMjQxNTYgMTQuMzk5OUg0Ljk2MTU2QzUuMzE1MDIgMTQuMzk5OSA1LjYwMTU2IDE0LjExMzQgNS42MDE1NiAxMy43NTk5VjExLjAzOTlDNS42MDE1NiAxMC42ODY0IDUuMzE1MDIgMTAuMzk5OSA0Ljk2MTU2IDEwLjM5OTlaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik0xMy43NTg0IDEuNjAwMUgxMS4wMzg0QzEwLjY4NSAxLjYwMDEgMTAuMzk4NCAxLjg4NjY0IDEwLjM5ODQgMi4yNDAxVjQuOTYwMUMxMC4zOTg0IDUuMzEzNTYgMTAuNjg1IDUuNjAwMSAxMS4wMzg0IDUuNjAwMUgxMy43NTg0QzE0LjExMTkgNS42MDAxIDE0LjM5ODQgNS4zMTM1NiAxNC4zOTg0IDQuOTYwMVYyLjI0MDFDMTQuMzk4NCAxLjg4NjY0IDE0LjExMTkgMS42MDAxIDEzLjc1ODQgMS42MDAxWiIgZmlsbD0iI2ZmZiIvPgo8cGF0aCBkPSJNNCAxMkwxMiA0TDQgMTJaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik00IDEyTDEyIDQiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K&logoColor=ffffff)](https://zread.ai/shijianjs/siyuan-plugin-iconify-emoji)

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
    - 两种搜索方式可以配置：
        - iconify官方
            - 仅支持原始图标名称的英文搜索，其他语言（如中文）搜不到；
        - yesicon
            - 支持英文+本地化语言搜索，如中英文搜索。
            - 支持语言：English、简体中文、Español、正體中文、Deutsch、日本語、Français、한국어、Português
            - 响应速度较慢，不如iconify官方流畅，请耐心等待
4. 搜索到结果以后，鼠标点击iconify组下面的任意图标；
    - 此时插件会自动把图标下载到本地的emoji文件夹、并应用到相应位置；
    - 需要用鼠标点击，不支持`Enter`按键；

## 插件配置说明

### 搜索类型

**描述**: 图标api两种搜索类型，默认iconify官方：

1. iconify官方，仅支持原始图标名称的英文搜索，不支持中文搜索；
2. yesicon，支持英文+本地化语言搜索，如中英文搜索，但响应速度较慢。

配置插件使用的图标搜索方式，可以在两种模式之间切换以满足不同语言环境下的搜索需求。

### yesicon搜索语言

**描述**:
开启yesicon搜索时使用的语言。yesicon支持英文+本地化语言搜索，默认中英文搜索。支持语言：English、简体中文、Español、正體中文、Deutsch、日本語、Français、한국어、Português

当选择yesicon作为搜索方式时，可指定具体使用的搜索语言，支持多种国际化语言。

### 搜索数量

**描述**: 图标搜索数量限制，默认50

控制图标搜索结果的最大返回数量，避免过多结果影响性能。

### 搜索防抖

**描述**: 图标搜索防抖延时，单位毫秒，默认300毫秒，不少于200毫秒

设置搜索输入的防抖延迟时间，减少频繁搜索请求，提高性能。

### 启用文档插入图标

**描述**: 启用文档插入图标，类似`:home`这样的输入触发，默认开启；假如对输入造成影响了可以关掉

控制是否启用文档中的图标快捷插入功能，通过特定格式的文本输入触发图标插入操作。

### 文档插入新图标延时

**描述**: 文档插入新图标时，需要延时等待图标保存，否则显示不出来。单位毫秒，默认300毫秒，不少于100毫秒

设置插入新图标后的等待时间，确保图标能够正确保存和显示。

## 感谢

- [siyuan](https://github.com/siyuan-note/siyuan)
    - 笔记平台
- [Iconify](https://iconify.design/)
    - 开源图标合集、api
- [yesicon](https://yesicon.app/)
    - iconify多语言搜索支持
- [zuoez02/siyuan-plugin-emoji-enhance](https://github.com/zuoez02/siyuan-plugin-emoji-enhance)
    - 思源`Emoji增强`插件，本插件主体逻辑参考这个插件的代码