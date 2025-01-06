// ==UserScript==
// @name         MarkedJS for Old Reddit
// @description  Replace Markdown renderer on Old Reddit with MarkedJS
// @version      1.2.7
// @author       Jorenar
// @namespace    https://jorenar.com
// @run-at       document-start
// @grant        GM_addStyle
// @require      https://cdn.jsdelivr.net/npm/marked@4.1.1/marked.min.js
// @match        https://*.reddit.com/r/*/*
// @match        https://*.reddit.com/user/*
// ==/UserScript==

/* global marked */

"use strict";

GM_addStyle(`.comment .md img { max-width: min(240px, 100%); }`);

const spoiler = {
  name: "spoiler",
  level: "inline",
  start(src) { return src.match(/@?>!/)?.index; },
  tokenizer(src) {
    const rule = /^@?>!(.*?)!</;
    const match = rule.exec(src);
    if (match) {
      const token = {
        type: "spoiler",
        raw: match[0],
        tokens: this.lexer.inlineTokens(match[1]),
      };
      return token;
    }
  },
  renderer(token) {
    return `<span class="md-spoiler-text">${this.parser.parseInline(token.tokens)}</span>`;
  }
};

const superscript = {
  name: "superscript",
  level: "inline",
  start(src) { return src.match(/\^/)?.index; },
  tokenizer(src) {
    const rule = /^\^(\((.*?)\)|(\S+))/;
    const match = rule.exec(src);
    if (match) {
      return {
        type: "superscript",
        raw: match[0],
        tokens: this.lexer.inlineTokens(match[2] ? match[2] : match[3])
      };
    }
  },
  renderer(token) {
    return `<sup>${this.parser.parseInline(token.tokens)}</sup>`;
  }
};

const subreddit = {
  name: "subreddit",
  level: "inline",
  start(src) { return src.match(/(?<=\s)\/?[ru]\//)?.index; },
  tokenizer(src) {
    const rule = /^\/?([ru]\/[\w\d_-]+)/;
    const match = rule.exec(src);
    if (match) {
      return {
        type: "subreddit",
        raw: match[0],
        text: match[1],
      };
    }
  },
  renderer(token) {
    return `<a href="/${token.text}">${token.text}</a>`;
  }
};

const imgPreview = {
  name: "imgPreview",
  level: "inline",
  start(src) { return src.match(/https:\/\/preview\.redd\.it/)?.index; },
  tokenizer(src) {
    const rule = /^(https:\/\/preview\.redd\.it\/\S+)/;
    const match = rule.exec(src);
    if (match) {
      return {
        type: "imgPreview",
        raw: match[0],
        text: match[1]
      };
    }
  },
  renderer(token) {
    return `<a href="${token.text}"><img src="${token.text}" loading="lazy"></a>`;
  }
};

const gif = {
  name: "gif",
  level: "inline",
  start(src) { return src.match(/!\[gif\]\(giphy\|/)?.index; },
  tokenizer(src) {
    const rule = /^!\[gif\]\(giphy\|(.+?)(\|.*)?\)/;
    const match = rule.exec(src);
    if (match) {
      return {
        type: "gif",
        raw: match[0],
        text: match[1]
      };
    }
  },
  renderer(token) {
    return `<a href="https://giphy.com/gifs/${token.text}" target="blank_"><img src="https://i.giphy.com/media/${token.text}/giphy.gif"></a>`;
  }
};


const emotes = {};

const emote = {
  name: "emote",
  level: "inline",
  start(src) { return src.match(/!\[/)?.index; },
  tokenizer(src) {
    const rule = /^!\[img\]\((emote\|.*?)\)/;
    const match = rule.exec(src);
    if (match) {
      return {
        type: "emote",
        raw: match[0],
        id: match[1]
      };
    }
  },
  renderer(token) {
    return `<img src="${emotes[token.id]}" title=":${token.id.split('|').pop()}:" width="20" height="20">`;
  }
};

const escHTML = {
  name: "escHTML",
  level: "inline",
  start(src) { return src.match(/</)?.index; },
  tokenizer(src) {
    const rule = /^<(.*?)>/;
    const match = rule.exec(src);
    if (match) {
      return {
        type: "escHTML",
        raw: match[0],
        tokens: this.lexer.inlineTokens(match[1])
      };
    }
  },
  renderer(token) {
    return `&lt;${this.parser.parseInline(token.tokens)}&gt;`;
  }
};

marked.use({ extensions: [ spoiler, superscript, subreddit, imgPreview, gif, emote, escHTML ] });


function recodeHTML(html) {
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
}

function genMd(d) {
  d.data.children.forEach((c) => {
    if (c.kind === "t1" || c.kind === "t3") {
      const md = document.querySelector(`#thing_${c.kind}_${c.data.id} > .entry > ` +
                                        `${c.kind === "t3" ? "div >" : ""} ` +
                                        `form > .usertext-body > .md:not(.marked)` );
      if (c.data.media_metadata) {
        Object.values(c.data.media_metadata).forEach((e) => { emotes[e.id] = e.s.u; });
      }

      if (md) {
        const text = c.kind === "t3" ? c.data.selftext : c.data.body;

        let markdown = recodeHTML(text);
        markdown = markdown.replace(/^ {0,3}</gm, "&lt;"); // HTML looking string at the start of line
        markdown = markdown.replace(/^ {0,3}>!/gm, "@>!"); // prevents confusion with comment
        markdown = markdown.replace(/([^\n])\n\s*```(\S+?)?$/gm, "$1\n\n```"); // fix code fence without empty line above
        markdown = markdown.replace(/(```.*?\n.*?[^\n])```/gms, "$1\n```"); // fix ending code fence not in new line
        markdown = markdown.replace(/^(#+)([^# ])/gm, "$1 $2"); // add space after header #s in case it's missing

        md.innerHTML = marked.parse(markdown);
        md.classList.add("marked");
      }
    }
    if (c.data.replies) { genMd(c.data.replies); }
  });
}

async function Markdown() {
  const loc = window.location;
  const response = await fetch(loc.origin + loc.pathname + ".json" + loc.search);
  const json = await response.json();
  if (json.length) {
    json.forEach(genMd);
  } else {
    genMd(json);
  }
}

Markdown();

window.onload = function() {
  new MutationObserver(function() {
    if (document.querySelector(".thing .usertext-body > .md:not(.marked)")) { Markdown(); }
  }).observe( document.querySelector(".content[role='main']"), { childList: true, subtree: true } );
};
