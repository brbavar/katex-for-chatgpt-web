# KaTeX for ChatGPT

Whenever ChatGPT and I talk math or logic with each other, and it starts sending me beautifully rendered notation, 
I begin to wish I could do the same—not for the sake of aesthetics so much as concisely and precisely expressing 
concepts. Of course, GPT can read any TeX code in your messages, regardless of whether the notation is rendered on your screen. But you, as a human being, are not as comfortable reading TeX code as AI is, even if you know how to write it—and you'd better know how if you want to use this extension. So if you use TeX in a conversation about math with GPT, and then return to that conversation a few days later, you're going to have a hard time understanding what you wrote (except indirectly, by looking at GPT's more readable response, which is bound to either reiterate what you said or convey the gist of it).

So I made that wish come true. With this Chrome extension you can now send rendered mathematical formulas to GPT, courtesy of KaTeX.

## Installation

[Click here](https://github.com/brbavar/katex-for-chatgpt-web/archive/refs/heads/main.zip) to download the ZIP. Once you've extracted the files, open Google Chrome, type `chrome://extensions` in the search bar, and press Enter. Click the button labeled "Load unpacked".
<br><br>

<br><br>
This brings up Finder or File Explorer. Once that window opens, select the unpacked ZIP file, which should be a folder named `katex-for-chatgpt-web-main`, in order to load that entire folder into your collection of extensions.
<br><br>

<br><br>
The extension is automatically activated and ready to go!
<br><br>

<br><br>

## Usage

While composing a message at chatgpt.com, write your TeX code between `$$` and `$$` if you want to display mathematical notation centered on its own line. Enclose your code in `\( ... \)` if you want your mathematical notation on the same line as other mathematical expressions or ordinary text. The math is rendered only after you hit send (no live preview).

Here are a couple examples of what the extension can do:
<br><br>

<br><br>

## Limitations

- You cannot render inline math by writing commands between single dollar signs (`$ ... $`). You must use the  
  `\( ... \)` syntax.
- The typesetting of notation in your messages is not visible to anyone you send a link to your chat. It is visible to you alone.
