// Turn commands, paths and file names written in italics into inline code.
//
// Example (article 1770456, removing the JAR on Linux):
//   HTML:   <p>Run <em>zip -q -d autopass.war WEB-INF/lib/log4j-core-2.11.0.jar</em></p>
//   Before: Run *zip -q -d autopass.war WEB-INF/lib/log4j-core-2.11.0.jar*
//   After:  Run `zip -q -d autopass.war WEB-INF/lib/log4j-core-2.11.0.jar`
//
// The author used italics to mean "type this". In Markdown, italics are emphasis:
// underscores and asterisks inside them can be mangled, and a reader (or an LLM)
// can't tell the command from the prose. Inline code keeps it exact.
//
// Only italics that look like code are changed: a path (WEB-INF\lib, /opt/...), a
// file name (log4j_2.17.0.zip), or a line starting with a common command. Italic
// prose ("*not* impacted") is left alone.

import type { Element, ElementContent, Root } from "hast";
import { eachParent, isElement, mapChildren, text, textOf } from "../utils.js";

// A common command followed by an argument, "java -...", "./script" or "C:\...".
const COMMAND = /^(?:(?:sudo|zip|unzip|tar|cd|cp|mv|rm|mkdir|ls|chmod|chown|systemctl)\s+\S|java\s+-|\.\/|[a-z]:\\)/i;
// A path: any backslash (WEB-INF\lib), a leading / or ./ or ~/, or two slashes (/opt/x).
// "and/or" has one slash and is not a path.
const PATH = /\\|^[.~]?\/|\S\/\S*\//;
// A single file name: log4j_2.17.0.zip, autopass.war
const FILE = /^\S+\.[a-z][a-z0-9]{1,4}$/i;

/** True if italic text reads like something to type, not emphasis. */
export function looksLikeCode(value: string): boolean {
  const t = value.trim();
  if (!t || t.length > 200) return false;
  if (COMMAND.test(t) || FILE.test(t)) return true;
  // A path, as long as it isn't a sentence that happens to contain one.
  return PATH.test(t) && t.split(/\s+/).length <= 3 && !/[.!?,;:]$/.test(t);
}

export function italicCodeToCode(tree: Root): void {
  eachParent(tree, (parent) => {
    if (parent.type === "element" && ["pre", "code", "a"].includes(parent.tagName)) return;
    mapChildren(parent, (c): ElementContent[] => {
      if (!(isElement(c, "em") || isElement(c, "i"))) return [c];
      if (!c.children.every((k) => k.type === "text")) return [c];
      const value = textOf(c);
      if (!looksLikeCode(value)) return [c];
      const lead = /^\s*/.exec(value)![0];
      const trail = /\s*$/.exec(value)![0];
      const code: Element = { type: "element", tagName: "code", properties: {}, children: [text(value.trim())] };
      return [...(lead ? [text(lead)] : []), code, ...(trail ? [text(trail)] : [])];
    });
  });
}
