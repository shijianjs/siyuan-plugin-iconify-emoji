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
    - Modify icons in document content
        - Only custom icon files can be modified, official emoji font icons cannot be modified;
3. Input search in the search box
    - Iconify search is only triggered when there is input content in the search box, and iconify content will be displayed after searching;
    - Iconify only supports English search, Chinese and other languages cannot be searched;
4. After finding results, click any icon under the iconify group with the mouse;
    - At this point, the plugin will automatically download the icon to the local `emoji` folder and apply it to the corresponding location;
    - Mouse clicking is required, `Enter` key is not supported;
    - When inserting a new icon in document content, after clicking with the mouse, you need to input a space for the new icon to display;

## Credits

- [siyuan](https://github.com/siyuan-note/siyuan)
- [Iconify](https://iconify.design/)
- [zuoez02/siyuan-plugin-emoji-enhance](https://github.com/zuoez02/siyuan-plugin-emoji-enhance)
    - SiYuan `Emoji Enhancement` plugin. The main logic of this plugin references the code from this plugin.