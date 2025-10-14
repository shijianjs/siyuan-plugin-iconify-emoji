# Siyuan Iconify Emoji Plugin

[中文](./README_zh_CN.md)

## Description

- [Iconify](https://iconify.design/) is an open-source icon library integration project that contains over 200,000 icons
  and provides complete front-end component libraries and online APIs.
- This plugin integrates Iconify API with SiYuan's custom emoji icon functionality, enabling seamless use of Iconify's
  vast icon ecosystem within SiYuan.

## Usage

1. Install the plugin;
2. The following icon operations are supported:
    - Change icons in the document directory tree
    - Change icons at the top of the document
    - Insert icons into document content
        - Trigger icon insertion by typing something like `:home`
        - After installing the plugin, it takes effect on newly opened document tabs, but not on already opened ones,
          which need to be reopened;
    - Modify icons in document content
        - Only custom icon files can be modified, official emoji font icons cannot be modified;
3. Input search in the search box
    - Iconify search is only triggered when there is input content in the search box, and iconify content will be
      displayed after searching;
    - Two search methods can be configured:
        - iconify official
            - only supports English search of original icon names, other languages (such as Chinese) cannot be found;
        - yesicon
            - supports English + localized language search, such as Chinese and English search.
            - Supported languages: English, 简体中文, Español, 正體中文, Deutsch, 日本語, Français, 한국어, Português
            - Slower response speed, not as smooth as iconify official, please be patient;
4. After finding results, click any icon under the iconify group with the mouse;
    - At this point, the plugin will automatically download the icon to the local `emoji` folder and apply it to the
      corresponding location;
    - Mouse clicking is required, `Enter` key is not supported;

## Plugin Configuration Instructions

### Search Type

**Description**: Two search types for icon API, default is iconify official:

1. iconify official, only supports English search of original icon names, does not support Chinese search;
2. yesicon, supports English + localized language search, such as Chinese and English search, but with slower response
   speed.

Configure the icon search method used by the plugin, which can be switched between two modes to meet search requirements
in different language environments.

### Yesicon Search Language

**Description**: Language used when enabling yesicon search. Yesicon supports English + localized language search,
default is Chinese and English search. Supported languages: English, 简体中文, Español, 正體中文, Deutsch, 日本語,
Français, 한국어, Português

When selecting yesicon as the search method, you can specify the specific search language to be used, supporting
multiple international languages.

### Search Quantity

**Description**: Icon search quantity limit, default 50

Control the maximum number of returned search results to avoid too many results affecting performance.

### Search Debounce

**Description**: Icon search debounce delay, unit milliseconds, default 300 milliseconds, no less than 200 milliseconds

Set the debounce delay time for search input to reduce frequent search requests and improve performance.

### Enable Document Insert Icon

**Description**: Enable document insert icon, triggered by input like `:home`, enabled by default; can be turned off if
it affects input

Control whether to enable the icon quick insert function in documents, triggering icon insertion through specific text
input formats.

### Document Insert New Icon Delay

**Description**: When inserting a new icon in a document, a delay is needed to wait for the icon to save, otherwise it
won't display. Unit milliseconds, default 300 milliseconds, no less than 100 milliseconds

Set the waiting time after inserting a new icon to ensure the icon can be saved and displayed correctly.

## Credits

- [siyuan](https://github.com/siyuan-note/siyuan)
    - Note-taking platform
- [Iconify](https://iconify.design/)
    - Open source icon collection, API
- [yesicon](https://yesicon.app/)
    - Iconify multilingual search support
- [zuoez02/siyuan-plugin-emoji-enhance](https://github.com/zuoez02/siyuan-plugin-emoji-enhance)
    - SiYuan `Emoji Enhancement` plugin. The main logic of this plugin references the code from this plugin.