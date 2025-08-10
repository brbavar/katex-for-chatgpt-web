# KaTeX for ChatGPT

Whenever ChatGPT and I talk math or logic with each other, and it starts sending me beautifully rendered notation, 
I begin to wish I could do the same—not for the sake of aesthetics so much as concisely and precisely expressing 
concepts. So I made that wish come true. With this Chrome extension you can now send rendered mathematical formulas to GPT, courtesy of KaTeX.

Of course, GPT can already read any TeX code in your messages, regardless of whether the notation is rendered on your screen. But you, as a human being, are not as comfortable reading TeX code as AI is, even if you know how to write it—and you'd better know how if you want to use this extension. So if you use TeX in a conversation about math with GPT, and then return to that conversation a few days later, you're going to have a hard time understanding what you wrote (except indirectly, by looking at GPT's more readable response, which is bound to either reiterate what you said or convey the gist of it). That's where the extension comes in handy.

## Installation

[Click here](https://github.com/brbavar/katex-for-chatgpt-web/archive/refs/heads/main.zip) to download the ZIP. Once you've extracted the files, open Google Chrome, type `chrome://extensions` in the search bar, and press Enter. Turn on developer mode.
<br><br>
<img width="1051" height="337" alt="Screenshot 2025-08-09 at 8 47 27 PM" src="https://github.com/user-attachments/assets/7a0a349c-e68c-4edf-b023-c20465e5d76d" />
<br><br>
Click the button labeled "Load unpacked".
<br><br>
<img width="1051" height="337" alt="Screenshot 2025-08-09 at 8 45 22 PM" src="https://github.com/user-attachments/assets/e3ad2d1e-4640-40a9-b9a0-00a41441f7e1" />
<br><br>
This brings up Finder or File Explorer. Once that window opens, select the unpacked ZIP file, which should be a folder named `katex-for-chatgpt-web-main`, in order to load that entire folder into your collection of extensions.
<br><br>
<img width="712" height="445" alt="Screenshot 2025-08-09 at 8 53 58 PM" src="https://github.com/user-attachments/assets/2f00f20c-e9b0-4276-8dd3-75ce2961c19d" />
<br><br>
The extension is automatically activated and ready to go!
<br><br>
<img width="401" height="211" alt="Screenshot 2025-08-09 at 8 57 33 PM" src="https://github.com/user-attachments/assets/f31bb4f5-6959-41a0-9854-922ff3ee4c3e" />
<br><br>

## Usage

While composing a message at chatgpt.com, write your TeX code between `$$` and `$$` if you want to display mathematical notation centered on its own line. Enclose your code in `\( ... \)` if you want your mathematical notation on the same line as other mathematical expressions or ordinary text. The math is rendered only after you hit send (no live preview).

Here are a couple examples of what the extension can do:
<br><br>
<img width="667" height="289" alt="Screenshot 2025-08-09 at 9 06 57 PM" src="https://github.com/user-attachments/assets/bfb139ca-b1a6-4c79-bf69-b841160f2dea" />
<br><br>
<img width="667" height="577" alt="Screenshot 2025-08-09 at 9 06 33 PM" src="https://github.com/user-attachments/assets/6a996e85-fb25-4a72-a0b5-0745c052831e" />

## Limitations

- As is evident from that last screenshot, you cannot render inline math by writing commands between single dollar signs (`$ ... $`). You must use the `\( ... \)` syntax.
- The typesetting of notation in your messages is not visible to anyone you send a link to your chat. It is visible to you alone.
