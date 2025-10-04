# Siyuan Iconify Emoji Plugin

[中文](./README_zh_CN.md)

## Description

- [Iconify](https://iconify.design/) is an open-source icon library integration project that contains over 200,000 icons and provides complete front-end component libraries and online APIs.
- This plugin integrates Iconify API with SiYuan's custom emoji icon functionality, enabling seamless use of Iconify's vast icon ecosystem within SiYuan.

## Usage

1. Install the plugin;
2. The following icon operations are supported:
    - Change icons in the document directory tree
    - Change icons at the top of the document
    - Insert icons into document content
        - Trigger icon insertion by typing something like `:home`
        - After installing the plugin, it takes effect on newly opened document tabs, but not on already opened ones, which need to be reopened;
    - Modify icons in document content
        - Only custom icon files can be modified, official emoji font icons cannot be modified;
3. Input search in the search box
    - Iconify search is only triggered when there is input content in the search box, and iconify content will be displayed after searching;
    - Iconify only supports English search, Chinese and other languages cannot be searched;
4. After finding results, click any icon under the iconify group with the mouse;
    - At this point, the plugin will automatically download the icon to the local `emoji` folder and apply it to the corresponding location;
    - Mouse clicking is required, `Enter` key is not supported;

## Plugin Configuration Description

### Search Limit
**Description**: Icon search result limit, default is 50

Controls the maximum number of icon search results returned to avoid performance issues caused by too many results.

### Search Debounce
**Description**: Icon search debounce delay, in milliseconds, default 300ms, minimum 200ms

Sets the debounce delay time for search input to reduce frequent search requests and improve performance.

### New Icon Insertion Delay
**Description**: When inserting a new icon into the document, a delay is needed to wait for the icon to be saved, otherwise it won't display. In milliseconds, default 300ms, minimum 100ms

Sets the waiting time after inserting a new icon to ensure the icon can be properly saved and displayed.

## Credits

- [siyuan](https://github.com/siyuan-note/siyuan)
- [Iconify](https://iconify.design/)
- [zuoez02/siyuan-plugin-emoji-enhance](https://github.com/zuoez02/siyuan-plugin-emoji-enhance)
    - SiYuan `Emoji Enhancement` plugin. The main logic of this plugin references the code from this plugin.