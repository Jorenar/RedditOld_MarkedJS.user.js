// ==UserScript==
// @name         Reddit Old - Fenced code
// @version      0.9.0
// @author       Jorengarenar
// @run-at       document-end
// @match        https://*.reddit.com/*
// ==/UserScript==

// Paragraphs with characteristic  "\n  "  pattern
document.querySelectorAll(".usertext-body.md-container > .md p").forEach((p) => {
  if (p.childNodes.length === 1 && p.textContent.indexOf("\n  ") != -1 ) {
    p.outerHTML = "<pre><code>" + p.innerHTML.replace(/\n  /g, "\n") + "</code></pre>";
  }
});

// <code> with multiline body
document.querySelectorAll(".usertext-body.md-container > .md p > code").forEach((code) => {
  if (code.textContent.indexOf("\n") != -1 ) {
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
      if (idx != -1) {
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
    if (lines.length == 0) { continue; }
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
