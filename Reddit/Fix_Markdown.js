// ==UserScript==
// @name         Reddit Old - Fix Markdown
// @version      0.1.0
// @author       Jorengarenar
// @run-at       document-end
// @match        https://*.reddit.com/*
// ==/UserScript==

// Fenced code (```) {{{1

// Paragraphs with characteristic  "\n  "  pattern
document.querySelectorAll(".usertext-body.md-container > .md p").forEach((p) => {
  if (p.childNodes.length === 1 && p.textContent.indexOf("\n  ") !== -1 ) {
    p.outerHTML = "<pre><code>" + p.innerHTML.replace(/\n {2}/g, "\n") + "</code></pre>";
  }
});

// <code> with multiline body
document.querySelectorAll(".usertext-body.md-container > .md p > code").forEach((code) => {
  if (code.textContent.indexOf("\n") !== -1 ) {
    code.outerHTML = "<pre><code>" + code.innerHTML.slice(1) + "</code></pre>";
  }
});

// Based on: https://greasyfork.org/en/scripts/399611-fenced-code-in-old-reddit
document.querySelectorAll(".usertext-body.md-container > .md").forEach((md) => {
  let i = 0;
  let children = Array(...md.children);
  while (i < children.length) {
    let lines = [];

    // Look for a start of the block
    while (i < children.length) {
      let text = children[i].textContent;
      let idx = text.indexOf("```");
      if (idx !== -1) {
        text = text.slice(idx);
        lines.push(...(text + "\n").split("\n"));
        children[i].innerHTML = children[i].innerHTML.replace(text, "");
        ++i;
        break;
      }

      ++i;
    }
    let startIdx = i;

    // Grab lines until end fence
    while (i < children.length) {
      let text = children[i].textContent;
      lines.push(...text.split("\n"));
      if (text.trim().endsWith("```")) { break; }
      ++i;
    }
    let endIdx = i;

    // Ensure there was closing fence
    if (endIdx >= children.length) { continue; }

    // Remove the fences
    if (lines.length === 0) { continue; }
    lines[0] = lines[0].slice(3);
    lines[lines.length - 1] = lines[lines.length - 1].slice(0, -3);

    // Insert the fenced text as a code element in the comment
    let pre = document.createElement("pre");
    let code = document.createElement("code");
    code.innerHTML = lines.join("\n").slice(1);
    pre.appendChild(code);
    md.insertBefore(pre, children[startIdx]);

    // Remove the old fenced nodes.
    for (let i = startIdx; i <= endIdx; ++i) {
      if (children[i]) {
        md.removeChild(children[i]);
      }
    }
  }
});

// Lists {{{1
document.querySelectorAll(".md > p").forEach((p) => {
  if (p.textContent.match(/(\n\s*[-*].*){2,}/)) {
    let text = p.textContent.split(/\n\s*[-*]\s* /);
    p.innerHTML = text[0];
    let ul = document.createElement("ul");
    text.slice(1).forEach((t) => {
      let li = document.createElement("li");
      li.innerHTML = t;
      ul.appendChild(li);
    });
    p.parentNode.insertBefore(ul, p.nextSibling);
  }
});

// Spoilers {{{1
document.querySelectorAll(".md p, .md li").forEach((e) => {
  e.childNodes.forEach((c) => {
     if (c.nodeType === Node.TEXT_NODE) {
       if (c.data.match(/>!( .* )!</gm)) {
         let span = document.createElement("span");
         span.innerHTML = c.textContent.replace(/>!( .*? )!</gm, '<span class="md-spoiler-text">$1</span>');
         e.replaceChild(span, c);
       }
     }
  });
});
