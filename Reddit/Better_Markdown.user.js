// ==UserScript==
// @name         Better Markdown for Old Reddit
// @description  Replace Markdown renderer on Old Reddit with Marked
// @version      1.1.7
// @author       Jorengarenar
// @run-at       document-start
// @require      https://cdn.jsdelivr.net/npm/marked/marked.min.js
// @match        https://*.reddit.com/r/*/*
// @match        https://*.reddit.com/user/*
// ==/UserScript==

const spoiler = {
  name: "spoiler",
  level: "inline",
  start(src) { return src.match(/>!/)?.index; },
  tokenizer(src, tokens) {
    const rule = /^>!(.*?)!</;
    const match = rule.exec(src);
    if (match) {
      return {
        type: "spoiler",
        raw: match[0],
        text: match[1],
        tokens: this.lexer.inlineTokens(match[1])
      };
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
  tokenizer(src, tokens) {
    const rule = /^\^(\((.*?)\)|(\S+))/;
    const match = rule.exec(src);
    if (match) {
      const txt = match[2] ? match[2] : match[3];
      return {
        type: "superscript",
        raw: match[0],
        text: txt,
        tokens: this.lexer.inlineTokens(txt)
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
  tokenizer(src, tokens) {
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
  tokenizer(src, tokens) {
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
    return `<a href="${token.text}"><img src="${token.text}"></a>`;
  }
};

const gif = {
  name: "gif",
  level: "inline",
  start(src) { return src.match(/!\[gif\]\(giphy\|/)?.index; },
  tokenizer(src, tokens) {
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

const escHTML = {
  name: "escHTML",
  level: "inline",
  start(src) { return src.match(/</)?.index; },
  tokenizer(src, tokens) {
    const rule = /^<(.*?)>/;
    const match = rule.exec(src);
    if (match) {
      return {
        type: "escHTML",
        raw: match[0],
        text: match[1],
        tokens: this.lexer.inlineTokens(match[1])
      };
    }
  },
  renderer(token) {
    return `&lt;${this.parser.parseInline(token.tokens)}&gt;`;
  }
};

marked.use({ extensions: [ spoiler, superscript, subreddit, imgPreview, gif, escHTML ] });


function recodeHTML(html) {
  let txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value.replace(/<(.+)>(.*?)<\/\1>/gms, "&lt;$1&gt;$2&lt;\/$1&gt;");
}

function genMd(d) {
  d.data.children.forEach((c) => {
    if (c.kind === "t1" || c.kind === "t3") {
      let md = document.querySelector(`#thing_${c.kind}_${c.data.id} > .entry > ` +
                                      `${c.kind === "t3" ? "div >" : ""} form > ` +
                                      `.usertext-body > .md:not(.marked)` );
      if (md) {
        const text = c.kind === "t3" ? c.data.selftext : c.data.body;
        md.innerHTML = marked.parse(recodeHTML(text)); // unsure whether sanitization will be necessary?
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
