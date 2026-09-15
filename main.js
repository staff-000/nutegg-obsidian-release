"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/egg-parser.ts
var egg_parser_exports = {};
__export(egg_parser_exports, {
  EggParser: () => EggParser,
  KNOWLEDGE_HEADING: () => KNOWLEDGE_HEADING,
  UNPROCESSED_HEADING: () => UNPROCESSED_HEADING,
  extractEggLanguage: () => extractEggLanguage,
  insertEggLanguage: () => insertEggLanguage,
  isEggPath: () => isEggPath,
  matchesEggFormat: () => matchesEggFormat
});
function extractEggLanguage(content) {
  if (!content)
    return "";
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (fmMatch) {
    for (const line of fmMatch[1].split(/\r?\n/)) {
      const kv = line.match(/^(\w+):\s*(.*)$/);
      if (kv && kv[1].toLowerCase() === "language") {
        return kv[2].trim().replace(/^["'](.*)["']$/, "$1");
      }
    }
  }
  const directMatch = content.match(/^language:\s*["']?([^"'\r\n]+)["']?/im);
  return directMatch ? directMatch[1].trim() : "";
}
function insertEggLanguage(content, language, options) {
  if (!content || !language)
    return content;
  const existing = extractEggLanguage(content);
  if (existing && !options?.overwrite)
    return content;
  if (existing && options?.overwrite) {
    return content.replace(/^language:\s*["']?[^"'\r\n]*["']?/im, `language: "${language}"`);
  }
  if (/^language:\s*["']?["']?\s*$/m.test(content)) {
    return content.replace(/^language:\s*["']?["']?\s*$/m, `language: "${language}"`);
  }
  const fmRegex = /^(---\r?\n)([\s\S]*?)(\r?\n---)/;
  const match = content.match(fmRegex);
  if (match) {
    const opening = match[1];
    const body = match[2];
    const closing = match[3];
    const separator = body.endsWith("\n") || body.length === 0 ? "" : "\n";
    const newBody = `${body}${separator}language: "${language}"`;
    return content.replace(fmRegex, `${opening}${newBody}${closing}`);
  }
  return `---
language: "${language}"
---

${content}`;
}
function isEggPath(path, vaultFolder = "nutegg") {
  if (!path || typeof path !== "string")
    return false;
  const normalized = path.replace(/\\/g, "/").replace(/^\/+/, "");
  const folder = (vaultFolder || "").replace(/^\/+|\/+$/g, "");
  if (folder) {
    if (!normalized.startsWith(folder + "/"))
      return false;
    const rel = normalized.slice(folder.length + 1);
    if (rel.includes("/"))
      return false;
    if (rel.startsWith("_") || !rel.toLowerCase().endsWith(".md"))
      return false;
    return true;
  } else {
    if (normalized.includes("/"))
      return false;
    if (normalized.startsWith("_") || !normalized.toLowerCase().endsWith(".md"))
      return false;
    return true;
  }
}
function matchesEggFormat(content) {
  if (!content || typeof content !== "string")
    return false;
  if (/^---\r?\n[\s\S]*?\btopic:\s*["']?.+["']?[\s\S]*?\r?\n---/m.test(content)) {
    return true;
  }
  if (content.includes("# Knowledge") || content.includes("# Unprocessed") || content.includes("[!abstract]")) {
    return true;
  }
  return false;
}
var KNOWLEDGE_HEADING, UNPROCESSED_HEADING, EggParser;
var init_egg_parser = __esm({
  "src/egg-parser.ts"() {
    "use strict";
    KNOWLEDGE_HEADING = "# Knowledge";
    UNPROCESSED_HEADING = "# Unprocessed";
    EggParser = class {
      plugin;
      constructor(plugin) {
        this.plugin = plugin;
      }
      async readEgg(fileName, fallbackDescription) {
        let file = this.plugin.app.vault.getAbstractFileByPath(fileName);
        if (!file && !fileName.includes("/")) {
          const parentDir = this.plugin.settings.indexFile.replace(/\/[^/]+$/, "");
          file = this.plugin.app.vault.getAbstractFileByPath(`${parentDir}/${fileName}`);
        }
        if (!file) {
          const folder = this.plugin.vaultFolder || "nutegg";
          const allFiles = (this.plugin.app.vault.getMarkdownFiles?.() || []).filter(
            (f) => isEggPath(f.path, folder)
          );
          const base = fileName.split("/").pop().toLowerCase();
          const match = allFiles.find(
            (f) => f.path.split("/").pop().toLowerCase() === base
          );
          if (match)
            file = match;
        }
        if (!file) {
          console.warn(`[NutEgg] Egg file not found: ${fileName}`);
          return null;
        }
        const content = await this.plugin.app.vault.read(file);
        const parsed = this.parseEggFile(file.path || fileName, content);
        if (fallbackDescription && !parsed.indexDescription) {
          parsed.indexDescription = fallbackDescription;
        }
        if (!parsed.language) {
          const settingLang = this.plugin.settings?.contentOutputLanguage;
          const pluginLang = settingLang && settingLang !== "same-as-content" ? settingLang.trim() : "";
          if (pluginLang) {
            parsed.language = pluginLang;
            const updated = insertEggLanguage(content, pluginLang);
            if (updated !== content) {
              try {
                await this.plugin.app.vault.modify(file, updated);
              } catch (err) {
                console.warn(
                  `[NutEgg] Could not persist filled language to ${file.path}:`,
                  err
                );
              }
            }
          }
        }
        return parsed;
      }
      async readEggs(entries) {
        const eggs = [];
        for (const entry of entries) {
          const egg = await this.readEgg(entry.fileName, entry.description);
          if (egg) {
            egg.indexDescription = entry.description;
            eggs.push(egg);
          }
        }
        return eggs;
      }
      parseEggFile(fileName, content) {
        const result = {
          fileName,
          topic: "Unknown",
          language: "",
          scope: "",
          actionGuide: "",
          keyQuestions: [],
          rejectionCriteria: [],
          formattingRules: "",
          knowledge: "",
          unprocessed: "",
          indexDescription: ""
        };
        const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (fmMatch) {
          for (const line of fmMatch[1].split("\n")) {
            const kv = line.match(/^(\w+):\s*(.*)$/);
            if (!kv)
              continue;
            const key = kv[1].toLowerCase();
            const value = kv[2].trim().replace(/^"(.*)"$/, "$1");
            if (key === "topic")
              result.topic = value;
            if (key === "language")
              result.language = value;
          }
        }
        const callout = this.extractCallout(content);
        const sections = callout ? this.splitLabeledSections(callout) : /* @__PURE__ */ new Map();
        result.scope = (sections.get("scope") || "").trim();
        result.actionGuide = (sections.get("action guide") || "").trim();
        result.keyQuestions = this.parseListItems(sections.get("key questions") || "");
        result.rejectionCriteria = this.parseListItems(sections.get("rejection criteria") || "");
        result.formattingRules = (sections.get("formatting rules") || "").trim();
        const lines = content.split("\n");
        const knowledgeSection = this.findSection(lines, "knowledge");
        if (knowledgeSection) {
          result.knowledge = this.sectionBody(lines, knowledgeSection, "knowledge");
        }
        const unprocessedSection = this.findSection(lines, "unprocessed");
        if (unprocessedSection) {
          result.unprocessed = this.sectionBody(lines, unprocessedSection, "unprocessed");
        }
        return result;
      }
      /**
       * Section content without the surrounding blank lines. Indentation of the
       * first line is preserved (unlike trim()) so re-indented sections survive.
       *
       * A stray duplicate heading of the same name (AI merge output that included
       * its own `# Knowledge`-style line) is stripped so the body starts with the
       * actual content.
       */
      sectionBody(lines, section, name) {
        const body = lines.slice(section.start + 1, section.end);
        while (body.length > 0 && (body[0].trim() === "" || this.headingName(body[0]) === name.toLowerCase())) {
          body.shift();
        }
        return body.join("\n").replace(/\n+$/g, "");
      }
      /** Format only the egg's instructions (Scope, Key Questions, Rejection Criteria, Formatting Rules) for Step 1 extraction. */
      formatEggInstructionsForPrompt(egg) {
        const parts = [];
        parts.push(`**Scope:** ${egg.scope || "(not specified)"}`);
        if (egg.keyQuestions.length > 0) {
          parts.push(
            `**Key Questions:**
${egg.keyQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`
          );
        }
        if (egg.rejectionCriteria.length > 0) {
          parts.push(
            `**Rejection Criteria:**
${egg.rejectionCriteria.map((c) => `- ${c}`).join("\n")}`
          );
        }
        if (egg.formattingRules) {
          parts.push(`**Formatting Rules:**
${egg.formattingRules}`);
        }
        return parts.join("\n\n");
      }
      /** Format only the egg's existing Knowledge tree and Unprocessed entries for Step 2 comparison. */
      formatEggKnowledgeForPrompt(egg) {
        const parts = [];
        parts.push(`**Current Knowledge:**
${egg.knowledge || "(empty)"}`);
        if (egg.unprocessed.trim()) {
          parts.push(`**Unprocessed (pending merge):**
${egg.unprocessed}`);
        }
        return parts.join("\n\n");
      }
      /** Format one egg's instructions + knowledge for an AI prompt (backward compatibility). */
      formatEggForPrompt(egg) {
        return [
          this.formatEggInstructionsForPrompt(egg),
          this.formatEggKnowledgeForPrompt(egg)
        ].join("\n\n");
      }
      /**
       * Append one new knowledge entry to the egg's Unprocessed section.
       *
       * Entries land here first and are merged into the Knowledge tree later,
       * once 20+ accumulate (see ai-processor.maybeMergeEgg). Each entry keeps
       * its insight + examples (AI-generated `content`), plus mechanical
       * `_author` / `_source` lines for provenance.
       */
      async appendUnprocessed(fileName, content, author, sourceTitle, sourceUrl) {
        const file = this.plugin.app.vault.getAbstractFileByPath(fileName);
        if (!file) {
          console.warn(`[NutEgg] Cannot append \u2014 egg file not found: ${fileName}`);
          return;
        }
        const existing = await this.plugin.app.vault.read(file);
        const lines = existing.replace(/\n+$/, "").split("\n");
        const section = this.findSection(lines, "unprocessed");
        const trimmed = content.trim();
        const withBullet = /^[-*]\s/.test(trimmed) ? trimmed : `- ${trimmed}`;
        const meta = [];
        if (author)
          meta.push(`_author: ${author}_`);
        const safeTitle = sourceTitle.replace(/[[\]]/g, "");
        meta.push(`_source: [${safeTitle || "source"}](${sourceUrl})_`);
        const block = [withBullet, ...meta].join("\n");
        if (section) {
          lines.splice(section.end, 0, "", block);
        } else {
          lines.push("", UNPROCESSED_HEADING, "", block);
        }
        await this.plugin.app.vault.modify(file, lines.join("\n") + "\n");
        console.log(`[NutEgg] Added unprocessed entry to ${fileName}`);
      }
      /** Count top-level entries in the Unprocessed section (sub-bullets don't count). */
      countUnprocessed(egg) {
        const indentOf = (l) => (l.match(/^\s*/) || [""])[0].length;
        const bullets = egg.unprocessed.split("\n").map((l) => l.replace(/\s+$/, "")).filter((l) => /^\s*[-*]\s/.test(l));
        if (bullets.length === 0)
          return 0;
        const base = Math.min(...bullets.map(indentOf));
        return bullets.filter((l) => indentOf(l) === base).length;
      }
      /**
       * Replace the Knowledge and Unprocessed sections with the merged output
       * from the merge AI call. Missing sections are created as needed.
       */
      async applyMerge(fileName, knowledge, unprocessed) {
        const file = this.plugin.app.vault.getAbstractFileByPath(fileName);
        if (!file) {
          console.warn(`[NutEgg] Cannot merge \u2014 egg file not found: ${fileName}`);
          return;
        }
        knowledge = this.stripSectionHeading(knowledge, "knowledge");
        unprocessed = this.stripSectionHeading(unprocessed, "unprocessed");
        const kLines = knowledge.split("\n");
        const uIdx = kLines.findIndex((l) => this.headingName(l) === "unprocessed");
        if (uIdx !== -1) {
          const rest = this.stripSectionHeading(
            kLines.slice(uIdx).join("\n"),
            "unprocessed"
          );
          knowledge = kLines.slice(0, uIdx).join("\n").replace(/\s+$/g, "");
          if (!unprocessed)
            unprocessed = rest;
        }
        const existing = await this.plugin.app.vault.read(file);
        let lines = existing.replace(/\n+$/, "").split("\n");
        const knowledgeSection = this.findSection(lines, "knowledge");
        if (knowledgeSection) {
          lines = [
            ...lines.slice(0, knowledgeSection.start + 1),
            "",
            ...knowledge.trim().split("\n"),
            ...lines.slice(knowledgeSection.end)
          ];
        } else {
          const unprocessedSection2 = this.findSection(lines, "unprocessed");
          if (unprocessedSection2) {
            lines = [
              ...lines.slice(0, unprocessedSection2.start),
              "",
              KNOWLEDGE_HEADING,
              "",
              ...knowledge.trim().split("\n"),
              "",
              ...lines.slice(unprocessedSection2.start)
            ];
          } else {
            lines = [...lines, "", KNOWLEDGE_HEADING, "", ...knowledge.trim().split("\n")];
          }
        }
        const unprocessedSection = this.findSection(lines, "unprocessed");
        const remainder = unprocessed.trim();
        if (unprocessedSection) {
          lines = [
            ...lines.slice(0, unprocessedSection.start + 1),
            ...remainder ? ["", ...remainder.split("\n")] : [],
            ...lines.slice(unprocessedSection.end)
          ];
        } else if (remainder) {
          lines = [...lines, "", UNPROCESSED_HEADING, "", ...remainder.split("\n")];
        }
        await this.plugin.app.vault.modify(file, lines.join("\n") + "\n");
        console.log(`[NutEgg] Merged knowledge tree in ${fileName}`);
      }
      /**
       * Locate a `# Name` section heading: `{start, end}`. Returns null when the
       * heading doesn't exist. Sections are h1; `##` lines are knowledge-tree
       * branches and are never treated as section headings.
       *
       * The Knowledge section runs until its successor — the `# Unprocessed`
       * heading — instead of stopping at the next `#` heading, so the tree can
       * use `##` branches as its top level. Other sections end at the next `#`
       * heading.
       *
       * A duplicate heading of the SAME name (a `# Knowledge` line that slipped
       * in below the section heading via a merge) is never treated as the
       * boundary — it stays inside the section, where sectionBody strips it.
       */
      findSection(lines, name) {
        const wanted = name.toLowerCase();
        const start = lines.findIndex(
          (l) => this.headingName(l) === wanted
        );
        if (start === -1)
          return null;
        let end = -1;
        if (wanted === "knowledge") {
          end = lines.findIndex(
            (l, i) => i > start && this.headingName(l) === "unprocessed"
          );
        }
        if (end === -1) {
          end = lines.findIndex((l, i) => {
            if (i <= start)
              return false;
            const head = this.headingName(l);
            return head !== null && head !== wanted;
          });
        }
        return { start, end: end === -1 ? lines.length : end };
      }
      /**
       * Lowercased name of an h1 (`# Name`) heading line, or null when the line
       * is not one.
       */
      headingName(line) {
        const m = line.trim().match(/^#\s+(.+?)\s*#*\s*$/);
        if (!m)
          return null;
        return m[1].trim().toLowerCase();
      }
      /**
       * Drop a leading duplicate `# Name` heading plus the blank lines around
       * it, so the body starts with the actual content.
       */
      stripSectionHeading(body, name) {
        const lines = body.split("\n");
        const wanted = name.toLowerCase();
        while (lines.length > 0 && (lines[0].trim() === "" || this.headingName(lines[0]) === wanted)) {
          lines.shift();
        }
        return lines.join("\n").replace(/\s+$/g, "");
      }
      /** Extract the `> [!abstract]- Instructions:` callout body (lines without `>`). */
      extractCallout(content) {
        const calloutLines = [];
        for (const line of content.split("\n")) {
          if (line.startsWith(">")) {
            calloutLines.push(line.replace(/^>\s?/, ""));
          } else if (calloutLines.length > 0) {
            break;
          }
        }
        if (calloutLines.length === 0)
          return null;
        const marker = calloutLines.findIndex((l) => l.includes("[!abstract]"));
        const body = marker >= 0 ? calloutLines.slice(marker + 1) : calloutLines.slice(1);
        return body.join("\n");
      }
      /** Split instruction text into sections by `**Label:**` lines (content may follow on the same line). */
      splitLabeledSections(text) {
        const map = /* @__PURE__ */ new Map();
        let current = null;
        let buffer = [];
        for (const line of text.split("\n")) {
          const labelMatch = line.match(/^\*\*([^*]+?):\*\*\s*(.*)$/);
          if (labelMatch) {
            if (current)
              map.set(current, buffer.join("\n"));
            current = labelMatch[1].toLowerCase();
            buffer = labelMatch[2] ? [labelMatch[2]] : [];
          } else {
            buffer.push(line);
          }
        }
        if (current)
          map.set(current, buffer.join("\n"));
        return map;
      }
      /** Parse numbered (`1.`) or bulleted (`-`) list items, stripping markers. */
      parseListItems(text) {
        return text.split("\n").map((l) => l.trim()).filter((l) => /^(?:\d+[.)]|[-*])\s+/.test(l)).map((l) => l.replace(/^(?:\d+[.)]|[-*])\s+/, ""));
      }
    };
  }
});

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => NutEggPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian6 = require("obsidian");

// src/settings.ts
var import_obsidian = require("obsidian");

// src/ai-client.ts
var PROVIDER_CATALOG = {
  local: {
    id: "local",
    label: "Local LLM (Ollama, LM Studio, etc.)",
    officialEndpoint: "http://127.0.0.1:11434/v1/chat/completions",
    apiFormat: "openai-compatible",
    keyPlaceholder: "Optional for local LLMs",
    openrouterPrefix: ""
  },
  openrouter: {
    id: "openrouter",
    label: "OpenRouter (Multi-Provider)",
    officialEndpoint: "https://openrouter.ai/api/v1/chat/completions",
    apiFormat: "openai-compatible",
    defaultModel: "openai/gpt-6-astra",
    families: [
      {
        id: "openai",
        label: "OpenAI GPT & Reasoning",
        defaultModel: "openai/gpt-6-astra",
        models: [
          "openai/gpt-6-astra",
          "openai/gpt-5.6-sol",
          "openai/o3-mini",
          "openai/gpt-4o"
        ]
      },
      {
        id: "anthropic",
        label: "Anthropic Claude",
        defaultModel: "anthropic/claude-sonnet-5",
        models: [
          "anthropic/claude-fable-5-1",
          "anthropic/claude-opus-5",
          "anthropic/claude-sonnet-5"
        ]
      },
      {
        id: "deepseek",
        label: "DeepSeek",
        defaultModel: "deepseek/deepseek-r1",
        models: ["deepseek/deepseek-r1", "deepseek/deepseek-chat"]
      },
      {
        id: "google",
        label: "Google Gemini",
        defaultModel: "google/gemini-2.5-flash",
        models: [
          "google/gemini-2.5-flash",
          "google/gemini-2.5-pro"
        ]
      },
      {
        id: "meta",
        label: "Meta Llama",
        defaultModel: "meta-llama/llama-3.3-70b-instruct",
        models: [
          "meta-llama/llama-3.3-70b-instruct"
        ]
      },
      {
        id: "qwen",
        label: "Qwen",
        defaultModel: "qwen/qwen-2.5-72b-instruct",
        models: [
          "qwen/qwen-2.5-72b-instruct"
        ]
      },
      {
        id: "custom",
        label: "Custom OpenRouter Model",
        defaultModel: "openai/gpt-6-astra",
        models: []
      }
    ],
    models: [
      "openai/gpt-6-astra",
      "openai/gpt-5.6-sol",
      "openai/o3-mini",
      "openai/gpt-4o",
      "anthropic/claude-fable-5-1",
      "anthropic/claude-opus-5",
      "anthropic/claude-sonnet-5",
      "deepseek/deepseek-r1",
      "deepseek/deepseek-chat",
      "google/gemini-2.5-flash",
      "google/gemini-2.5-pro",
      "meta-llama/llama-3.3-70b-instruct",
      "qwen/qwen-2.5-72b-instruct"
    ],
    keyPlaceholder: "sk-or-...",
    openrouterPrefix: ""
  },
  anthropic: {
    id: "anthropic",
    label: "Anthropic (Claude)",
    officialEndpoint: "https://api.anthropic.com/v1/messages",
    apiFormat: "anthropic",
    defaultModel: "claude-sonnet-5",
    models: [
      "claude-fable-5-1",
      "claude-opus-5",
      "claude-sonnet-5",
      "claude-haiku-4-5-20251001",
      "claude-3-7-sonnet-20250219",
      "claude-3-5-sonnet-20241022"
    ],
    keyPlaceholder: "sk-ant-...",
    openrouterPrefix: "anthropic/"
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    officialEndpoint: "https://api.openai.com/v1/chat/completions",
    apiFormat: "openai-compatible",
    defaultModel: "gpt-6-astra",
    models: [
      "gpt-6-astra",
      "gpt-5.6-sol",
      "gpt-5.6-terra",
      "gpt-5.6-luna",
      "o3-mini",
      "o1",
      "gpt-4o",
      "gpt-4o-mini"
    ],
    keyPlaceholder: "sk-...",
    openrouterPrefix: "openai/"
  },
  gemini: {
    id: "gemini",
    label: "Google Gemini",
    officialEndpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    apiFormat: "openai-compatible",
    defaultModel: "gemini-2.5-flash",
    models: [
      "gemini-2.5-flash",
      "gemini-2.5-pro",
      "gemini-2.5-flash-lite",
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite"
    ],
    keyPlaceholder: "AIza...",
    openrouterPrefix: "google/"
  },
  deepseek: {
    id: "deepseek",
    label: "DeepSeek",
    officialEndpoint: "https://api.deepseek.com/v1/chat/completions",
    apiFormat: "openai-compatible",
    defaultModel: "deepseek-chat",
    models: [
      "deepseek-chat",
      "deepseek-reasoner",
      "deepseek-flash"
    ],
    keyPlaceholder: "sk-...",
    openrouterPrefix: "deepseek/"
  },
  kimi: {
    id: "kimi",
    label: "Kimi (Moonshot)",
    officialEndpoint: "https://api.moonshot.cn/v1/chat/completions",
    apiFormat: "openai-compatible",
    defaultModel: "kimi-k3",
    models: [
      "kimi-k3",
      "kimi-k2.7-code",
      "kimi-k2.7-code-highspeed",
      "moonshot-v1-8k",
      "moonshot-v1-32k",
      "moonshot-v1-128k"
    ],
    keyPlaceholder: "sk-...",
    openrouterPrefix: "moonshot/"
  },
  zhipu: {
    id: "zhipu",
    label: "Zhipu (GLM)",
    officialEndpoint: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    apiFormat: "openai-compatible",
    defaultModel: "glm-5.3",
    models: [
      "glm-5.3",
      "glm-5",
      "glm-5-turbo",
      "glm-4.7",
      "glm-4-plus",
      "glm-4-air",
      "glm-4-flash"
    ],
    keyPlaceholder: "...",
    openrouterPrefix: "zhipu/"
  },
  qwen: {
    id: "qwen",
    label: "Qwen (Tongyi)",
    officialEndpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    apiFormat: "openai-compatible",
    defaultModel: "qwen3-max",
    models: [
      "qwen3-max",
      "qwen3-plus",
      "qwen3-flash",
      "qwen-max",
      "qwen-plus",
      "qwen-turbo"
    ],
    keyPlaceholder: "sk-...",
    openrouterPrefix: "qwen/"
  }
};
function findOpenRouterFamily(modelName) {
  const families = PROVIDER_CATALOG.openrouter.families || [];
  if (families.length === 0)
    return void 0;
  return families.find((f) => f.models.includes(modelName)) || families[0];
}
function isAIConfigured(settings) {
  if (settings.aiProvider === "local") {
    return Boolean(
      settings.localEndpoint && settings.localEndpoint.trim().length > 0 || PROVIDER_CATALOG.local.officialEndpoint
    );
  }
  return Boolean(settings.aiApiKey && settings.aiApiKey.trim().length > 0);
}
var OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
function resolveConfig(settings) {
  const isLocal = settings.aiProvider === "local";
  const isOpenRouter = settings.aiProvider === "openrouter";
  if (isLocal) {
    const isOllama = settings.localApiType === "ollama";
    const defaultEndpoint = isOllama ? "http://127.0.0.1:11434/api/chat" : "http://127.0.0.1:11434/v1/chat/completions";
    return {
      provider: "local",
      endpoint: settings.localEndpoint || defaultEndpoint,
      apiKey: settings.aiApiKey || "",
      model: settings.aiModel?.trim() || "default",
      apiFormat: isOllama ? "ollama" : "openai-compatible",
      extraHeaders: {}
    };
  }
  if (isOpenRouter) {
    return {
      provider: "openrouter",
      endpoint: OPENROUTER_ENDPOINT,
      apiKey: settings.aiApiKey,
      model: settings.aiModel || "openai/gpt-6-astra",
      apiFormat: "openai-compatible",
      extraHeaders: {
        "HTTP-Referer": "nutegg-obsidian-plugin",
        "X-Title": "NutEgg"
      }
    };
  }
  const provider = PROVIDER_CATALOG[settings.aiProvider] || PROVIDER_CATALOG.anthropic;
  return {
    provider: settings.aiProvider,
    endpoint: provider.officialEndpoint,
    apiKey: settings.aiApiKey,
    model: settings.aiModel || provider.defaultModel || "",
    apiFormat: provider.apiFormat,
    extraHeaders: provider.apiFormat === "anthropic" ? { "anthropic-version": "2023-06-01" } : {}
  };
}
var AIError = class extends Error {
  code;
  statusCode;
  constructor(code, message, statusCode) {
    super(message);
    this.name = "AIError";
    this.code = code;
    this.statusCode = statusCode ?? null;
  }
};
function classifyError(statusCode, body) {
  const lower = body.toLowerCase();
  if (statusCode === 401) {
    return new AIError("auth_failed", "API key is invalid or missing. Check your API key in NutEgg settings.", statusCode);
  }
  if (statusCode === 403) {
    return new AIError("forbidden", "Access denied. Your API key may not have permission for this model, or your account needs a funded billing plan.", statusCode);
  }
  if (statusCode === 404 || lower.includes("model not found") || lower.includes("model_not_found")) {
    return new AIError("model_not_found", "The selected model was not found. The model name may be incorrect or not available on this endpoint.", statusCode);
  }
  if (statusCode === 429) {
    return new AIError("rate_limited", "Rate limit exceeded. Wait a moment and try again.", statusCode);
  }
  if (statusCode >= 500) {
    return new AIError("server_error", `The AI service returned a server error (${statusCode}). It may be temporarily down \u2014 try again shortly.`, statusCode);
  }
  if (lower.includes("quota") || lower.includes("insufficient") || lower.includes("balance") || lower.includes("billing")) {
    return new AIError("quota_exceeded", "API quota exceeded or insufficient funds. Check your account balance or billing settings.", statusCode);
  }
  const snippet = body.slice(0, 300);
  return new AIError("unknown", `API error (${statusCode}): ${snippet}`, statusCode);
}
var AIClient = class {
  config;
  constructor(settings) {
    this.config = resolveConfig(settings);
  }
  /**
   * Check remaining credit/balance for the configured provider.
   */
  async checkCredit(settings) {
    const provider = PROVIDER_CATALOG[settings.aiProvider];
    const source = settings.aiProvider === "openrouter" ? "openrouter" : "official";
    const apiKey = settings.aiApiKey;
    const model = settings.aiModel;
    const baseInfo = {
      provider: settings.aiProvider,
      providerLabel: provider?.label || settings.aiProvider,
      source,
      model,
      hasBalance: false,
      statusText: "Checking..."
    };
    if (settings.aiProvider === "local") {
      const isOllama = settings.localApiType === "ollama";
      const defaultEndpoint = isOllama ? "http://127.0.0.1:11434/api/chat" : "http://127.0.0.1:11434/v1/chat/completions";
      const endpoint = settings.localEndpoint || defaultEndpoint;
      const pingEndpoint = isOllama ? endpoint.replace(/\/api\/chat\/?$/, "/api/tags") : endpoint.replace(/\/chat\/completions\/?$/, "/models");
      try {
        const headers = { Accept: "application/json" };
        if (apiKey)
          headers["Authorization"] = `Bearer ${apiKey}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        const resp = await fetch(pingEndpoint, {
          method: "GET",
          headers,
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (resp.ok) {
          const typeLabel = isOllama ? "Ollama Native" : "OpenAI-compatible";
          return {
            ...baseInfo,
            hasBalance: false,
            statusText: `Connected [${typeLabel}]`
          };
        } else {
          return {
            ...baseInfo,
            hasBalance: false,
            statusText: `Local LLM (${resp.status} ${resp.statusText})`
          };
        }
      } catch {
        return {
          ...baseInfo,
          hasBalance: false,
          statusText: "Offline \u2014 ensure local runner is running",
          error: "Cannot connect to local LLM server"
        };
      }
    }
    if (!apiKey) {
      return {
        ...baseInfo,
        statusText: "No API key configured",
        error: "No API key"
      };
    }
    if (settings.aiProvider === "openrouter") {
      try {
        const resp = await fetch("https://openrouter.ai/api/v1/credits", {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          }
        });
        if (resp.ok) {
          const json = await resp.json();
          const totalCredits = Number(json?.data?.total_credits ?? 0);
          const totalUsage = Number(json?.data?.total_usage ?? 0);
          const remaining = Math.max(0, totalCredits - totalUsage);
          const balanceFormatted = `$${remaining.toFixed(2)}`;
          return {
            ...baseInfo,
            hasBalance: true,
            balanceFormatted,
            currency: "USD",
            totalCredits,
            totalUsage,
            statusText: `${balanceFormatted} left ($${totalUsage.toFixed(2)} used / $${totalCredits.toFixed(2)} total)`
          };
        } else if (resp.status === 401) {
          return {
            ...baseInfo,
            statusText: "Invalid API key",
            error: "Authentication failed"
          };
        } else {
          return {
            ...baseInfo,
            statusText: "OpenRouter (Active)"
          };
        }
      } catch (err) {
        return {
          ...baseInfo,
          statusText: "OpenRouter (Network error)",
          error: String(err)
        };
      }
    }
    if (settings.aiProvider === "deepseek") {
      try {
        const resp = await fetch("https://api.deepseek.com/user/balance", {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/json"
          }
        });
        if (resp.ok) {
          const json = await resp.json();
          const info = json?.balance_infos?.[0];
          const curr = info?.currency || "CNY";
          const symbol = curr === "USD" ? "$" : "\xA5";
          const balance = parseFloat(info?.total_balance || "0");
          const balanceFormatted = `${symbol}${balance.toFixed(2)}`;
          return {
            ...baseInfo,
            hasBalance: true,
            balanceFormatted,
            currency: curr,
            statusText: `${balanceFormatted} available`
          };
        } else if (resp.status === 401) {
          return { ...baseInfo, statusText: "Invalid API key", error: "Auth failed" };
        }
      } catch {
      }
      return { ...baseInfo, statusText: "DeepSeek (Active)" };
    }
    if (settings.aiProvider === "kimi") {
      try {
        const resp = await fetch("https://api.moonshot.cn/v1/users/me/balance", {
          headers: {
            Authorization: `Bearer ${apiKey}`
          }
        });
        if (resp.ok) {
          const json = await resp.json();
          const balance = json?.data?.available_balance ?? 0;
          const balanceFormatted = `\xA5${Number(balance).toFixed(2)}`;
          return {
            ...baseInfo,
            hasBalance: true,
            balanceFormatted,
            currency: "CNY",
            statusText: `${balanceFormatted} available`
          };
        } else if (resp.status === 401) {
          return { ...baseInfo, statusText: "Invalid API key", error: "Auth failed" };
        }
      } catch {
      }
      return { ...baseInfo, statusText: "Kimi (Active)" };
    }
    return {
      ...baseInfo,
      hasBalance: false,
      statusText: `${provider.label} (Pay-as-you-go / Direct)`
    };
  }
  async chat(prompt, maxTokens) {
    if (this.config.provider !== "local" && !this.config.apiKey) {
      throw new AIError(
        "no_api_key",
        "No AI API key configured. Open Obsidian Settings \u2192 NutEgg, enable Developer Mode, and add your API key."
      );
    }
    if (this.config.apiFormat === "anthropic") {
      return this.chatAnthropic(prompt, maxTokens);
    }
    if (this.config.apiFormat === "ollama") {
      return this.chatOllama(prompt, maxTokens);
    }
    return this.chatOpenAICompatible(prompt, maxTokens);
  }
  // --- Ollama-native format (/api/chat) ---
  async chatOllama(prompt, maxTokens) {
    let response;
    const headers = {
      "Content-Type": "application/json",
      ...this.config.extraHeaders
    };
    if (this.config.apiKey && this.config.apiKey.trim().length > 0) {
      headers["Authorization"] = `Bearer ${this.config.apiKey}`;
    }
    const bodyPayload = {
      model: this.config.model || "default",
      messages: [{ role: "user", content: prompt }],
      stream: false,
      options: {
        num_predict: maxTokens,
        temperature: 0.3
      }
    };
    try {
      response = await fetch(this.config.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(bodyPayload)
      });
    } catch {
      throw new AIError(
        "network_error",
        "Cannot reach Ollama server. Ensure Ollama is running and the endpoint is accessible."
      );
    }
    if (!response.ok) {
      const err = await response.text();
      throw classifyError(response.status, err);
    }
    const data = await response.json();
    return data?.message?.content || "";
  }
  // --- Anthropic-native format ---
  async chatAnthropic(prompt, maxTokens) {
    let response;
    try {
      response = await fetch(this.config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.config.apiKey,
          ...this.config.extraHeaders
        },
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: maxTokens,
          messages: [{ role: "user", content: prompt }]
        })
      });
    } catch {
      throw new AIError(
        "network_error",
        "Cannot reach the AI API. Check your internet connection. If using a custom endpoint, verify the URL is correct."
      );
    }
    if (!response.ok) {
      const err = await response.text();
      throw classifyError(response.status, err);
    }
    const data = await response.json();
    return data?.content?.[0]?.text || "";
  }
  // --- OpenAI-compatible format ---
  async chatOpenAICompatible(prompt, maxTokens) {
    let response;
    const headers = {
      "Content-Type": "application/json",
      ...this.config.extraHeaders
    };
    if (this.config.apiKey && this.config.apiKey.trim().length > 0) {
      headers["Authorization"] = `Bearer ${this.config.apiKey}`;
    }
    const bodyPayload = {
      model: this.config.model,
      messages: [{ role: "user", content: prompt }]
    };
    if (this.config.provider === "openai") {
      bodyPayload.max_completion_tokens = maxTokens;
    } else {
      bodyPayload.max_tokens = maxTokens;
    }
    try {
      response = await fetch(this.config.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(bodyPayload)
      });
    } catch {
      throw new AIError(
        "network_error",
        "Cannot reach the AI API. Check your network or local LLM server status. If using a custom endpoint, verify the URL is correct."
      );
    }
    if (!response.ok) {
      const err = await response.text();
      throw classifyError(response.status, err);
    }
    const data = await response.json();
    const choice = data?.choices?.[0];
    const content = choice?.message?.content || "";
    const reasoning = choice?.message?.reasoning_content || "";
    const finishReason = choice?.finish_reason;
    if (finishReason === "length") {
      const reasoningTokens = data?.usage?.completion_tokens_details?.reasoning_tokens || 0;
      const completionTokens = data?.usage?.completion_tokens || 0;
      console.warn(
        `[NutEgg] AI response was cut off by max_tokens limit (finish_reason: "length"). Reasoning tokens: ${reasoningTokens}, Completion tokens: ${completionTokens}, Content length: ${content.length}`
      );
      if (!content.trim() && reasoning) {
        throw new AIError(
          "rate_limited",
          `The AI model (${this.config.model}) spent all its tokens on internal reasoning before writing the answer. Try increasing Max Tokens in settings.`
        );
      }
    }
    return content;
  }
};

// src/settings.ts
var DEFAULT_SETTINGS = {
  developerMode: false,
  aiProvider: "anthropic",
  aiApiKey: "",
  aiModel: "claude-sonnet-5",
  localEndpoint: "http://127.0.0.1:11434/v1/chat/completions",
  localApiType: "openai",
  serverPort: 27123,
  rawFolder: "nutegg/_raw",
  indexFile: "nutegg/_index.md",
  workflowFolder: "nutegg/_workflow",
  workflowHashes: {},
  chunkWindowChars: 3e4,
  sectionGridSeconds: 300,
  contentAnalysisMaxTokens: 16384,
  contentOutputLanguage: "same-as-content"
};
var NutEggSettingTab = class extends import_obsidian.PluginSettingTab {
  plugin;
  customLanguageMode = false;
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    const settings = this.plugin.settings;
    const provider = PROVIDER_CATALOG[settings.aiProvider];
    const isOpenRouter = settings.aiProvider === "openrouter";
    containerEl.empty();
    containerEl.createEl("h2", { text: "NutEgg Settings" });
    new import_obsidian.Setting(containerEl).setName("Chrome Extension Companion").setDesc("Capture and analyze articles, YouTube videos, and tweets directly from your browser into Obsidian.").addButton(
      (btn) => btn.setButtonText("Get Chrome Extension \u2197").setCta().onClick(() => {
        window.open(
          "https://chromewebstore.google.com/detail/nutegg/bmdmdiicembobejibggoeiahaonphcol",
          "_blank"
        );
      })
    );
    containerEl.createEl("h3", { text: "Vault Paths" });
    new import_obsidian.Setting(containerEl).setName("Raw Content Folder").setDesc("Folder for saved raw content").addText(
      (text) => text.setPlaceholder("nutegg/_raw").setValue(settings.rawFolder).onChange(async (value) => {
        settings.rawFolder = value.trim() || "nutegg/_raw";
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Index File").setDesc("File that maps eggs to their markdown files").addText(
      (text) => text.setPlaceholder("nutegg/_index.md").setValue(settings.indexFile).onChange(async (value) => {
        settings.indexFile = value.trim() || "nutegg/_index.md";
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Workflow Engine Folder").setDesc("Folder where AI prompts, schemas, and pipeline rules are stored as editable markdown files").addText(
      (text) => text.setPlaceholder("nutegg/_workflow").setValue(settings.workflowFolder).onChange(async (value) => {
        settings.workflowFolder = value.trim() || "nutegg/_workflow";
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Use Default Workflow Prompts").setDesc(
      "Moves all current files in nutegg/_workflow to a timestamped backup folder under _backup/ and restores clean built-in prompt defaults."
    ).addButton(
      (btn) => btn.setButtonText("Use Defaults").setWarning().onClick(async () => {
        await this.plugin.workflowManager.resetToDefaults();
      })
    );
    this.displayLanguageSettings(containerEl, settings);
    new import_obsidian.Setting(containerEl).setName("Developer mode").setDesc(
      settings.developerMode ? "Advanced settings are visible below" : "Show advanced settings (AI provider, API key, server port)"
    ).addToggle((toggle) => {
      toggle.setValue(settings.developerMode);
      toggle.onChange(async (value) => {
        settings.developerMode = value;
        await this.plugin.saveSettings();
        this.display();
      });
    });
    if (settings.developerMode) {
      this.displayAdvancedSettings(containerEl, settings, provider, isOpenRouter);
    }
  }
  displayAdvancedSettings(containerEl, settings, provider, isOpenRouter) {
    const isLocal = settings.aiProvider === "local";
    containerEl.createEl("h3", { text: isLocal ? "Local LLM Configuration" : "AI Model Configuration" });
    new import_obsidian.Setting(containerEl).setName("1. AI Provider").setDesc("Choose a local runner (Ollama, LM Studio), OpenRouter, or cloud AI provider").addDropdown((dropdown) => {
      for (const [id, info] of Object.entries(PROVIDER_CATALOG)) {
        dropdown.addOption(id, info.label);
      }
      dropdown.setValue(settings.aiProvider);
      dropdown.onChange(async (value) => {
        settings.aiProvider = value;
        if (settings.aiProvider === "local") {
          settings.aiModel = "";
          settings.aiModelFamily = void 0;
        } else if (settings.aiProvider === "openrouter") {
          const families = PROVIDER_CATALOG.openrouter.families || [];
          const firstFamily = families[0];
          settings.aiModelFamily = firstFamily?.id || "openai";
          settings.aiModel = firstFamily?.defaultModel || "openai/gpt-6-astra";
        } else {
          const newProvider = PROVIDER_CATALOG[settings.aiProvider];
          settings.aiModelFamily = void 0;
          settings.aiModel = newProvider?.defaultModel || newProvider?.models?.[0] || "";
        }
        await this.plugin.saveSettings();
        this.display();
      });
      return dropdown;
    });
    if (isLocal) {
      new import_obsidian.Setting(containerEl).setName("API Type").setDesc("Protocol format used by your local runner").addDropdown((dropdown) => {
        dropdown.addOption("openai", "OpenAI-compatible (LM Studio, llama.cpp, vLLM, Ollama /v1)");
        dropdown.addOption("ollama", "Ollama Native (/api/chat)");
        dropdown.setValue(settings.localApiType || "openai");
        dropdown.onChange(async (value) => {
          settings.localApiType = value;
          if (settings.localApiType === "ollama") {
            if (!settings.localEndpoint || settings.localEndpoint.includes("/v1/chat/completions")) {
              settings.localEndpoint = "http://127.0.0.1:11434/api/chat";
            }
          } else {
            if (!settings.localEndpoint || settings.localEndpoint.includes("/api/chat")) {
              settings.localEndpoint = "http://127.0.0.1:11434/v1/chat/completions";
            }
          }
          await this.plugin.saveSettings();
          this.display();
        });
        return dropdown;
      });
      new import_obsidian.Setting(containerEl).setName("Local Server Endpoint").setDesc(
        settings.localApiType === "ollama" ? "Ollama native chat URL (default: http://127.0.0.1:11434/api/chat)" : "OpenAI-compatible chat completions URL for your local runner"
      ).addText((text) => {
        text.setPlaceholder(
          settings.localApiType === "ollama" ? "http://127.0.0.1:11434/api/chat" : "http://127.0.0.1:11434/v1/chat/completions"
        ).setValue(
          settings.localEndpoint || (settings.localApiType === "ollama" ? "http://127.0.0.1:11434/api/chat" : "http://127.0.0.1:11434/v1/chat/completions")
        ).onChange(async (value) => {
          settings.localEndpoint = value.trim();
          await this.plugin.saveSettings();
        });
        return text;
      });
      const presetContainer = containerEl.createDiv({
        cls: "setting-item",
        attr: { style: "padding-top: 0; margin-top: -10px; border-top: none;" }
      });
      const presetInfo = presetContainer.createDiv({
        cls: "setting-item-description",
        text: "Presets: "
      });
      presetInfo.style.fontSize = "0.85em";
      presetInfo.style.color = "var(--text-muted)";
      const presets = settings.localApiType === "ollama" ? [
        { label: "Ollama Native (11434)", url: "http://127.0.0.1:11434/api/chat" }
      ] : [
        { label: "Ollama /v1 (11434)", url: "http://127.0.0.1:11434/v1/chat/completions" },
        { label: "LM Studio (1234)", url: "http://127.0.0.1:1234/v1/chat/completions" },
        { label: "llama.cpp / vLLM (8080)", url: "http://127.0.0.1:8080/v1/chat/completions" }
      ];
      for (const preset of presets) {
        const btn = presetInfo.createEl("button", {
          text: preset.label
        });
        btn.style.marginLeft = "6px";
        btn.style.padding = "2px 8px";
        btn.style.fontSize = "0.85em";
        btn.style.cursor = "pointer";
        btn.addEventListener("click", async (e) => {
          e.preventDefault();
          settings.localEndpoint = preset.url;
          await this.plugin.saveSettings();
          this.display();
        });
      }
      new import_obsidian.Setting(containerEl).setName("API Key (Optional)").setDesc("Optional for local LLMs. Leave empty if your local server does not require authentication.").addText((text) => {
        text.setPlaceholder("Optional for local LLMs").setValue(settings.aiApiKey).onChange(async (value) => {
          settings.aiApiKey = value.trim();
          await this.plugin.saveSettings();
        });
        return text;
      });
    } else if (isOpenRouter) {
      const families = PROVIDER_CATALOG.openrouter.families || [];
      let currentFamily = families.find((f) => f.id === settings.aiModelFamily);
      if (!currentFamily) {
        currentFamily = findOpenRouterFamily(settings.aiModel) || families[0];
        if (currentFamily) {
          settings.aiModelFamily = currentFamily.id;
        }
      }
      new import_obsidian.Setting(containerEl).setName("2. Model Family").setDesc("Choose model vendor or architecture group on OpenRouter").addDropdown((dropdown) => {
        for (const fam of families) {
          dropdown.addOption(fam.id, fam.label);
        }
        if (currentFamily) {
          dropdown.setValue(currentFamily.id);
        }
        dropdown.onChange(async (value) => {
          settings.aiModelFamily = value;
          const selectedFam = families.find((f) => f.id === value);
          if (selectedFam) {
            settings.aiModel = selectedFam.defaultModel;
          }
          await this.plugin.saveSettings();
          this.display();
        });
        return dropdown;
      });
      const versionSetting = new import_obsidian.Setting(containerEl).setName("3. Model Version").setDesc(`Sent to OpenRouter as "${settings.aiModel}"`);
      const familyModels = currentFamily?.models || [];
      if (familyModels.length > 0) {
        versionSetting.addDropdown((dropdown) => {
          for (const model of familyModels) {
            dropdown.addOption(model, model);
          }
          if (!familyModels.includes(settings.aiModel)) {
            dropdown.addOption(settings.aiModel, `${settings.aiModel} (custom)`);
          }
          dropdown.setValue(settings.aiModel);
          dropdown.onChange(async (value) => {
            settings.aiModel = value;
            await this.plugin.saveSettings();
            this.display();
          });
          return dropdown;
        });
      }
      versionSetting.addText((text) => {
        text.setPlaceholder(currentFamily?.defaultModel || "Custom model tag (e.g. vendor/model-name)").setValue(settings.aiModel).onChange(async (value) => {
          const trimmed = value.trim();
          if (trimmed) {
            settings.aiModel = trimmed;
            await this.plugin.saveSettings();
          }
        });
        return text;
      });
      new import_obsidian.Setting(containerEl).setName("API Key").setDesc("Your OpenRouter API key (openrouter.ai/keys)").addText((text) => {
        text.setPlaceholder("sk-or-...").setValue(settings.aiApiKey).onChange(async (value) => {
          settings.aiApiKey = value.trim();
          await this.plugin.saveSettings();
        });
        return text;
      });
    } else {
      const providerModels = provider.models || [];
      const versionSetting = new import_obsidian.Setting(containerEl).setName("2. Model").setDesc(`Model to use for analysis (${provider.label})`);
      if (providerModels.length > 0) {
        versionSetting.addDropdown((dropdown) => {
          for (const model of providerModels) {
            dropdown.addOption(model, model);
          }
          if (!providerModels.includes(settings.aiModel)) {
            dropdown.addOption(settings.aiModel, `${settings.aiModel} (custom)`);
          }
          dropdown.setValue(settings.aiModel);
          dropdown.onChange(async (value) => {
            settings.aiModel = value;
            await this.plugin.saveSettings();
            this.display();
          });
          return dropdown;
        });
      }
      versionSetting.addText((text) => {
        text.setPlaceholder(provider.defaultModel || "Custom model tag").setValue(settings.aiModel).onChange(async (value) => {
          const trimmed = value.trim();
          if (trimmed) {
            settings.aiModel = trimmed;
            await this.plugin.saveSettings();
          }
        });
        return text;
      });
      new import_obsidian.Setting(containerEl).setName("API Key").setDesc(`Your ${provider.label} API key`).addText((text) => {
        text.setPlaceholder(provider.keyPlaceholder).setValue(settings.aiApiKey).onChange(async (value) => {
          settings.aiApiKey = value.trim();
          await this.plugin.saveSettings();
        });
        return text;
      });
    }
    const creditSetting = new import_obsidian.Setting(containerEl).setName(isLocal ? "Local LLM connection status" : "AI credit & balance").setDesc(isLocal ? "Checking local server connection..." : "Checking credit balance with provider...").addButton((btn) => {
      btn.setButtonText("Refresh").setCta().onClick(async () => {
        btn.setDisabled(true);
        btn.setButtonText("Checking...");
        await updateCreditDisplay();
        btn.setDisabled(false);
        btn.setButtonText("Refresh");
      });
      return btn;
    });
    const updateCreditDisplay = async () => {
      try {
        const credit = await this.plugin.aiClient.checkCredit(settings);
        if (credit.hasBalance && credit.balanceFormatted) {
          creditSetting.setDesc(
            `\u{1F4B0} Remaining Balance: ${credit.balanceFormatted} (${credit.statusText})`
          );
        } else {
          creditSetting.setDesc(
            `\u2139\uFE0F Provider: ${credit.providerLabel} \u2014 ${credit.statusText}`
          );
        }
      } catch (err) {
        creditSetting.setDesc(`\u26A0\uFE0F Failed to check credit: ${String(err)}`);
      }
    };
    updateCreditDisplay();
    containerEl.createEl("h3", { text: "Processing & Chunking" });
    new import_obsidian.Setting(containerEl).setName("General chunk window size").setDesc(
      "Maximum character length per chunk (~30,000 chars \u2248 8,000 tokens). Long content exceeding this threshold is split into parts and processed with multi-stage map-reduce aggregation."
    ).addText(
      (text) => text.setPlaceholder("30000").setValue(String(settings.chunkWindowChars || 3e4)).onChange(async (value) => {
        const num = parseInt(value, 10);
        if (!isNaN(num) && num >= 1e3) {
          settings.chunkWindowChars = num;
          await this.plugin.saveSettings();
        }
      })
    );
    new import_obsidian.Setting(containerEl).setName("Section grid interval").setDesc(
      "Time interval in seconds (default: 300s / 5 minutes) used to generate section lattice points and chapter maps for videos lacking native chapter markers."
    ).addText(
      (text) => text.setPlaceholder("300").setValue(String(settings.sectionGridSeconds || 300)).onChange(async (value) => {
        const num = parseInt(value, 10);
        if (!isNaN(num) && num >= 10) {
          settings.sectionGridSeconds = num;
          await this.plugin.saveSettings();
        }
      })
    );
    new import_obsidian.Setting(containerEl).setName("Max completion tokens").setDesc(
      "Maximum completion tokens allocated for AI calls (default: 16384). Cloud models (DeepSeek, OpenAI, Anthropic) support large output windows. Local LLM users can adjust this to match their model's context window."
    ).addText(
      (text) => text.setPlaceholder("16384").setValue(String(settings.contentAnalysisMaxTokens || 16384)).onChange(async (value) => {
        const num = parseInt(value, 10);
        if (!isNaN(num) && num >= 500) {
          settings.contentAnalysisMaxTokens = num;
          await this.plugin.saveSettings();
        }
      })
    );
    containerEl.createEl("h3", { text: "Server" });
    new import_obsidian.Setting(containerEl).setName("Server Port").setDesc("Port for the local HTTP server connecting with Chrome Extension (requires restart)").addText(
      (text) => text.setPlaceholder("27123").setValue(String(settings.serverPort)).onChange(async (value) => {
        const port = parseInt(value, 10);
        if (!isNaN(port) && port > 0 && port < 65536) {
          settings.serverPort = port;
          await this.plugin.saveSettings();
        }
      })
    );
    containerEl.createEl("h3", { text: "Links & Resources" });
    new import_obsidian.Setting(containerEl).setName("NutEgg on Chrome Web Store").setDesc("Install or update the NutEgg companion extension for Google Chrome.").addButton(
      (btn) => btn.setButtonText("Open Chrome Web Store \u2197").onClick(() => {
        window.open(
          "https://chromewebstore.google.com/detail/nutegg/bmdmdiicembobejibggoeiahaonphcol",
          "_blank"
        );
      })
    );
    new import_obsidian.Setting(containerEl).setName("NutEgg on Obsidian Community Plugins").setDesc("View NutEgg in the Obsidian Community Plugins directory.").addButton(
      (btn) => btn.setButtonText("Open Obsidian Directory \u2197").onClick(() => {
        window.open("https://community.obsidian.md/plugins/nutegg", "_blank");
      })
    );
  }
  displayLanguageSettings(containerEl, settings) {
    containerEl.createEl("h3", { text: "Language & Output" });
    const PRESET_LANGUAGES = {
      "same-as-content": "Same as content (follow captured text)",
      English: "English",
      Chinese: "Chinese (\u4E2D\u6587)",
      Japanese: "Japanese (\u65E5\u672C\u8A9E)",
      Korean: "Korean (\uD55C\uAD6D\uC5B4)",
      Spanish: "Spanish (Espa\xF1ol)",
      French: "French (Fran\xE7ais)",
      German: "German (Deutsch)"
    };
    const isCustomLang = this.customLanguageMode || !!settings.contentOutputLanguage && !Object.keys(PRESET_LANGUAGES).includes(settings.contentOutputLanguage);
    new import_obsidian.Setting(containerEl).setName("Content analysis output language").setDesc(
      "Language used for Stage 1 summaries, verdicts, and chapter maps. (Stage 2 egg analysis always follows each egg's own language property.)"
    ).addDropdown((dropdown) => {
      for (const [key, label] of Object.entries(PRESET_LANGUAGES)) {
        dropdown.addOption(key, label);
      }
      dropdown.addOption("custom", "Custom language...");
      dropdown.setValue(
        isCustomLang ? "custom" : settings.contentOutputLanguage || "same-as-content"
      );
      dropdown.onChange(async (val) => {
        if (val === "custom") {
          this.customLanguageMode = true;
        } else {
          this.customLanguageMode = false;
          settings.contentOutputLanguage = val;
          await this.plugin.saveSettings();
        }
        this.display();
      });
    });
    if (isCustomLang) {
      new import_obsidian.Setting(containerEl).setName("Custom output language").setDesc("Specify the target language name (e.g. Italian, Traditional Chinese)").addText((text) => {
        text.setPlaceholder("e.g. Italian").setValue(
          !Object.keys(PRESET_LANGUAGES).includes(settings.contentOutputLanguage) ? settings.contentOutputLanguage : ""
        ).onChange(async (val) => {
          const trimmed = val.trim();
          if (trimmed) {
            settings.contentOutputLanguage = trimmed;
            await this.plugin.saveSettings();
          }
        });
        if (this.customLanguageMode) {
          setTimeout(() => text.inputEl?.focus(), 50);
        }
        return text;
      });
    }
  }
};

// src/server.ts
var http = __toESM(require("http"));

// src/index-sync.ts
var import_obsidian2 = require("obsidian");

// src/templates/index.md
var templates_default = '# NutEgg Egg Index\n\n> [!abstract]- Instructions:\n> - Add one line per egg file: "* $path: $description_of_what_it_covers"\n> - Process only the lines beginning with *\n\n\n* nutegg/investment.md: investment strategies, market analysis, portfolio management\n* nutegg/society.md: geopolitics, class dynamics, global conflict, political economy\n* nutegg/psychology.md: cognitive biases, mental models, behavioral psychology, decision making\n* nutegg/ai_ml.md: artificial intelligence, machine learning, LLMs, AGI, prompt engineering\n';

// src/templates/egg.md
var egg_default = `---
topic: "Unknown"
status: "active"
last_updated: "2026-08-14"
language: "English"
---

> [!abstract]- Instructions:
> **Scope:** Capture high-signal, paradigm-shifting concepts, universally applicable frameworks, and novel data that hold significant strategic value but fall strictly outside established domain-specific routing.
>
> **Action Guide:**
> 1. Novel Delta: Extract only genuinely new, substantive insights or ideas not already captured in the existing knowledge files. State "None" if the content is entirely redundant.
> 2. Decide: should the user spend time reading this fully? Consider the egg's reject criteria if any are specified. If the content is repetitive, basic, or doesn't add new insight, answer false.
>
> **Key Questions:**
> 1. what new insights does this add?
> 2. Identify any conflicts between this new data and the existing knowledge base.
>
> **Rejection Criteria:**
> - Ignore content that repeats existing knowledge
>
> **Formatting Rules:** 
> - Each bullet MUST begin with exactly one entry tag. Format: "- [tag] The insight text\u2026". Pick the single best fit:
>   * [concept] \u2014 a definition or explanation of what something IS (e.g. a technique, algorithm, or paradigm)
>   * [architecture] \u2014 a model architecture, system design, or structural approach
>   * [method] \u2014 a how-to, workflow, training recipe, or step-by-step process
>   * [benchmark] \u2014 a measurable result, performance comparison, or empirical finding
>   * [explain] \u2014 reasoning or rationale behind a design choice or conclusion (the "why")
>   * [fact] \u2014 a verifiable data point, statistic, or empirical finding
>   * [example] \u2014 a concrete demo, paper, deployment, or case study that illustrates an idea
> - Each new entry follows a concept \u2192 explanation \u2192 example structure: one top-level bullet "- [tag] **Concept Name**" \u2014 Concept Name is a short 2\u20135 word name that uniquely identifies the insight (dedup and novelty checks compare concepts: the same insight under different wording is ONE concept). Explanation is added as a indented sub-bullet. Concrete examples from the content (if any) follow as indented sub-bullets ("  - \u{1F3AF} Example: ..."). Author and source are appended automatically.
> - Structured content: when the source itself is a well-organized enumeration (a numbered list, a named framework like "Seven Principles of X", a step-by-step process), capture it as ONE complete entry \u2014 the list's title as the Concept and EVERY item as an indented sub-bullet, in the source's own order. A partial list is worse than no entry.
> - New entries are added to the "# Unprocessed" section first and can be merged into the knowledge tree on demand.
> - When merging: respect the existing knowledge tree. Locate the most relevant parent concept in the document and append the new information beneath it as nested sub-bullets. Do not break the existing hierarchy.


# Knowledge


# Unprocessed
`;

// src/templates/examples/investment.md
var investment_default = `---
topic: "Investment Strategy & Market Analysis"
status: "active"
last_updated: "2026-08-12"
language: "English"
---

> [!abstract]- Instructions:
> **Scope:** This file captures high-signal financial data, macro-economic shifts, asset allocation strategies, and deep fundamental analyses of target equities or protocols.
>
> **Action Guide:**
> 1. Novel Delta: Extract only genuinely new, substantive insights or ideas not already captured in the existing knowledge files. State "None" if the content is entirely redundant.
> 2. Decide: should the user spend time reading this fully? Consider the egg's reject criteria if any are specified. If the content is repetitive, basic, or doesn't add new insight, answer false.
>
> **Key Questions:**
> 1. Does this detail a structural shift in macro-economic policy (e.g., interest rates, inflation metrics, geopolitical supply chain impacts)?
> 2. Is there a new, data-backed fundamental analysis or earnings breakdown for a company on my watchlist?
> 3. Does this introduce a quantifiable framework for risk management or portfolio rebalancing?
> 
> **Rejection Criteria:**
> - Reject purely speculative price predictions or "day-trading" setups.
> - Reject emotionally driven market commentary, panic narratives, or FOMO-inducing content.
> - Reject basic financial definitions (e.g., "What is an ETF?").
> 
> **Formatting Rules:** 
> - Each bullet MUST begin with exactly one entry tag. Format: "- [tag] The insight text\u2026". Pick the single best fit:
>   * [concept] \u2014 a definition or explanation of what something IS (e.g. a financial instrument, market mechanism)
>   * [signal] \u2014 a macro-economic shift, market signal, or structural trend worth monitoring
>   * [framework] \u2014 a quantifiable model, strategy, or analytical approach for portfolio/risk decisions
>   * [method] \u2014 a how-to, workflow, or step-by-step process for investing or analysis
>   * [opinion] \u2014 a subjective market thesis, recommendation, or viewpoint from the author
>   * [fact] \u2014 a verifiable data point, earnings figure, statistic, or historical event
>   * [example] \u2014 a concrete case study, trade, or real-world market event that illustrates an idea
> - Each new entry follows a concept \u2192 explanation \u2192 example structure: one top-level bullet "- [tag] **Concept Name**" \u2014 Concept Name is a short 2\u20135 word name that uniquely identifies the insight (dedup and novelty checks compare concepts: the same insight under different wording is ONE concept). Explanation is added as an indented bullet. Concrete examples from the content (if any) follow as indented sub-bullets ("  - \u{1F3AF} Example: ..."). For investments, examples are specific data points, numbers, earnings figures, or market events. Author and source are appended automatically.
> - Structured content: when the source itself is a well-organized enumeration (a numbered list, a named framework like "Seven Principles of X", a step-by-step process), capture it as ONE complete entry \u2014 the list's title as the Concept and EVERY item as an indented sub-bullet, in the source's own order. A partial list is worse than no entry.
> - New entries are added to the "# Unprocessed" section first and can be merged into the knowledge tree on demand.
> - When merging: respect the existing knowledge tree. Locate the most relevant parent concept in the document and append the new information beneath it as nested sub-bullets. Do not break the existing hierarchy.

# Knowledge


# Unprocessed

`;

// src/templates/examples/psychology.md
var psychology_default = `---
topic: "Psychology & Mental Models"
status: "active"
last_updated: "2026-08-14"
language: "English"
---

> [!abstract]- Instructions:
> **Scope:** Capture actionable cognitive biases, behavioral mechanics, and mental models that explain human decision-making and cognitive processes.
>
> **Action Guide:**
> 1. Novel Delta: Extract only genuinely new, substantive insights or ideas not already captured in the existing knowledge files. State "None" if the content is entirely redundant.
> 2. Decide: should the user spend time reading this fully? Consider the egg's reject criteria if any are specified. If the content is repetitive, basic, or doesn't add new insight, answer false.
>
> **Key Questions:**
> 1. What specific cognitive bias, mental model, or psychological insight does this reveal?
>
> **Rejection Criteria:**
> - Reject generic self-help advice or motivational platitudes.
> - Reject concepts that lack specific psychological mechanisms or scientific grounding.
>
> **Formatting Rules:** 
> - Each bullet MUST begin with exactly one entry tag. Format: "- [tag] The insight text\u2026". Pick the single best fit:
>   * [bias] \u2014 a named cognitive bias or systematic error in human judgment
>   * [model] \u2014 a mental model, decision-making framework, or heuristic
>   * [mechanism] \u2014 an underlying psychological process or behavioral mechanic (the "how" of cognition)
>   * [explain] \u2014 reasoning or rationale behind why a bias or behavior occurs
>   * [fact] \u2014 a verifiable research finding, study result, or statistical data
>   * [example] \u2014 a concrete experiment, study, or real-world observation that illustrates a concept
> - Each new entry follows a concept \u2192 explanation \u2192 example structure: one top-level bullet "- [tag] **Concept Name**" \u2014 Concept Name is a short 2\u20135 word name that uniquely identifies the insight (dedup and novelty checks compare concepts: the same insight under different wording is ONE concept). Explanation is added as an indented bullet. Concrete examples from the content (if any) follow as indented sub-bullets ("  - \u{1F3AF} Example: ..."). For psychology, examples are experiments, studies, or real-world observations. Author and source are appended automatically.
> - Structured content: when the source itself is a well-organized enumeration (a numbered list, a named framework like "Seven Principles of X", a step-by-step process), capture it as ONE complete entry \u2014 the list's title as the Concept and EVERY item as an indented sub-bullet, in the source's own order. A partial list is worse than no entry.
> - New entries are added to the "# Unprocessed" section first and can be merged into the knowledge tree on demand.
> - When merging: respect the existing knowledge tree. Locate the most relevant parent concept in the document and append the new information beneath it as nested sub-bullets. Do not break the existing hierarchy.

# Knowledge


# Unprocessed

`;

// src/templates/examples/society.md
var society_default = `---
topic: "Geopolitics, Society & Economics"
status: "active"
last_updated: "2026-08-14"
language: "English"
---

> [!abstract]- Instructions:
> **Scope:** Capture new knowledge and insights.
> 
> **Action Guide:**
> 1. Novel Delta: Extract only genuinely new, substantive insights or ideas not already captured in the existing knowledge files. State "None" if the content is entirely redundant.
> 2. Decide: should the user spend time reading this fully? Consider the egg's reject criteria if any are specified. If the content is repetitive, basic, or doesn't add new insight, answer false.
>
> **Key Questions:**
> 1. What geopolitical, social, or economic dynamic does this reveal?
>
> **Rejection Criteria:**
> - Reject superficial news recaps and transient event reporting lacking structural analysis.
> - Reject partisan commentary, emotional narratives, or short-term noise that fails to indicate a broader systemic shift.
>
> **Formatting Rules:** 
> - Each bullet MUST begin with exactly one entry tag. Format: "- [tag] The insight text\u2026". Pick the single best fit:
>   * [concept] \u2014 a definition or explanation of what something IS (e.g. an economic mechanism, social dynamic)
>   * [trend] \u2014 a structural shift, long-term pattern, or systemic change in geopolitics/society/economy
>   * [policy] \u2014 a government action, regulation, or institutional decision with strategic implications
>   * [explain] \u2014 reasoning or rationale behind why a geopolitical or social dynamic occurs
>   * [opinion] \u2014 a subjective analysis, prediction, or commentary from the author
>   * [fact] \u2014 a verifiable data point, statistic, historical event, or demographic figure
>   * [example] \u2014 a concrete event, country case, or policy outcome that illustrates a concept
> - Each new entry follows a concept \u2192 explanation \u2192 example structure: one top-level bullet "- [tag] **Concept Name**" \u2014 Concept Name is a short 2\u20135 word name that uniquely identifies the insight (dedup and novelty checks compare concepts: the same insight under different wording is ONE concept). Explanation is added as an indented bullet. Concrete examples from the content (if any) follow as indented sub-bullets ("  - \u{1F3AF} Example: ..."). For geopolitics/society, examples are specific events, policies, or country cases. Author and source are appended automatically.
> - Structured content: when the source itself is a well-organized enumeration (a numbered list, a named framework like "Seven Principles of X", a step-by-step process), capture it as ONE complete entry \u2014 the list's title as the Concept and EVERY item as an indented sub-bullet, in the source's own order. A partial list is worse than no entry.
> - New entries are added to the "# Unprocessed" section first and can be merged into the knowledge tree on demand.
> - When merging: respect the existing knowledge tree. Locate the most relevant parent concept in the document and append the new information beneath it as nested sub-bullets. Do not break the existing hierarchy.

# Knowledge


# Unprocessed

`;

// src/templates/examples/ai_ml.md
var ai_ml_default = `---
topic: "Artificial Intelligence & Machine Learning"
status: "active"
last_updated: "2026-08-14"
language: "English"
---

> [!abstract]- Instructions:
> **Scope:** Capture novel techniques, capabilities, and implications in AI/ML, model architectures, and hardware-level machine learning frameworks (e.g., Tinygrad, MLX).
>
> **Action Guide:**
> 1. Novel Delta: Extract only genuinely new, substantive insights or ideas not already captured in the existing knowledge files. State "None" if the content is entirely redundant.
> 2. Decide: should the user spend time reading this fully? Consider the egg's reject criteria if any are specified. If the content is repetitive, basic, or doesn't add new insight, answer false.
>
> **Key Questions:**
> 1. What new AI/ML technique, capability, or architectural implication does this describe?
> 2. What new application or workflow does this describe?
>
> **Rejection Criteria:**
> - Reject marketing hype and product announcements lacking technical depth.
> - Reject benchmark scores without structural or architectural insights.
> - Reject repeated, derivative, or mainstream AI news.
>
> **Formatting Rules:** 
> - Each bullet MUST begin with exactly one entry tag. Format: "- [tag] The insight text\u2026". Pick the single best fit:
>   * [concept] \u2014 a definition or explanation of what something IS (e.g. a technique, algorithm, or paradigm)
>   * [architecture] \u2014 a model architecture, system design, or structural approach
>   * [method] \u2014 a how-to, workflow, training recipe, or step-by-step process
>   * [benchmark] \u2014 a measurable result, performance comparison, or empirical finding
>   * [explain] \u2014 reasoning or rationale behind a design choice or conclusion (the "why")
>   * [fact] \u2014 a verifiable data point, statistic, or empirical finding
>   * [example] \u2014 a concrete demo, paper, deployment, or case study that illustrates an idea
> - Each new entry follows a concept \u2192 explanation \u2192 example structure: one top-level bullet "- [tag] **Concept Name**" \u2014 Concept Name is a short 2\u20135 word name that uniquely identifies the insight (dedup and novelty checks compare concepts: the same insight under different wording is ONE concept). Explanation is added as an indented bullet. Concrete examples from the content (if any) follow as indented sub-bullets ("  - \u{1F3AF} Example: ..."). For AI/ML, examples are papers, benchmarks, model/code demos, or real-world deployments. Author and source are appended automatically.
> - Structured content: when the source itself is a well-organized enumeration (a numbered list, a named framework like "Seven Principles of X", a step-by-step process), capture it as ONE complete entry \u2014 the list's title as the Concept and EVERY item as an indented sub-bullet, in the source's own order. A partial list is worse than no entry.
> - New entries are added to the "# Unprocessed" section first and can be merged into the knowledge tree on demand.
> - When merging: respect the existing knowledge tree. Locate the most relevant parent concept in the document and append the new information beneath it as nested sub-bullets. Do not break the existing hierarchy.

# Knowledge


# Unprocessed

`;

// src/defaults.ts
var INDEX_TEMPLATE = templates_default;
var EGG_TEMPLATE = egg_default;
var EXAMPLE_EGGS = [
  { path: "nutegg/investment.md", content: investment_default },
  { path: "nutegg/psychology.md", content: psychology_default },
  { path: "nutegg/society.md", content: society_default },
  { path: "nutegg/ai_ml.md", content: ai_ml_default }
];

// src/index-sync.ts
init_egg_parser();
function sanitizeEggName(name) {
  return String(name || "").trim().toLowerCase().replace(/[^\p{L}\p{N}_-]+/gu, "_").replace(/^_+|_+$/g, "").slice(0, 60);
}
var IndexSync = class {
  plugin;
  initialized = false;
  isUpdatingIndex = false;
  directEditTimer = null;
  diffListeners = /* @__PURE__ */ new Set();
  constructor(plugin) {
    this.plugin = plugin;
  }
  /** Subscribe to index diff status changes. Returns unsubscribe function. */
  onDiffChanged(listener) {
    this.diffListeners.add(listener);
    return () => this.diffListeners.delete(listener);
  }
  notifyDiffChanged() {
    for (const listener of this.diffListeners) {
      try {
        listener();
      } catch {
      }
    }
  }
  /** Register vault event listeners for egg additions, deletions, renames, and direct index edits. */
  init() {
    if (this.initialized)
      return;
    this.initialized = true;
    const vault = this.plugin.app?.vault;
    if (!vault?.on)
      return;
    const hook = (event, cb) => {
      const ref = vault.on(event, cb);
      if (typeof this.plugin.registerEvent === "function") {
        this.plugin.registerEvent(ref);
      }
    };
    hook("create", async (file) => {
      if (this.isUpdatingIndex)
        return;
      if (file && file.path) {
        await this.onEggFileCreated(file);
      }
    });
    hook("delete", async (file) => {
      if (this.isUpdatingIndex)
        return;
      if (file && file.path) {
        await this.onEggFileDeleted(file.path);
      }
    });
    hook("rename", async (file, oldPath) => {
      if (this.isUpdatingIndex)
        return;
      if (file && file.path && oldPath) {
        await this.onEggFileRenamed(oldPath, file.path);
      }
    });
    hook("modify", async (file) => {
      if (this.isUpdatingIndex)
        return;
      if (file && file.path === this.plugin.settings?.indexFile) {
        this.debounceDirectIndexEdit();
      }
    });
  }
  /** Handle an egg file being created or dropped into nutegg/ */
  async onEggFileCreated(file) {
    const folder = this.plugin.vaultFolder || "nutegg";
    if (!isEggPath(file.path, folder))
      return;
    this.notifyDiffChanged();
  }
  /** Handle an egg file being deleted from nutegg/ */
  async onEggFileDeleted(filePath) {
    const folder = this.plugin.vaultFolder || "nutegg";
    if (!isEggPath(filePath, folder))
      return;
    const indexFile = this.plugin.app.vault.getAbstractFileByPath(
      this.plugin.settings.indexFile
    );
    if (!indexFile)
      return;
    this.isUpdatingIndex = true;
    try {
      const fileName = filePath.split("/").pop() || "";
      let modified = await this.removeIndexEntry(indexFile, filePath);
      if (fileName && fileName !== filePath) {
        const mod2 = await this.removeIndexEntry(indexFile, fileName);
        modified = modified || mod2;
      }
      if (modified) {
        new import_obsidian2.Notice(`[NutEgg] Removed ${filePath} from egg index`);
      }
      this.notifyDiffChanged();
    } finally {
      this.isUpdatingIndex = false;
    }
  }
  /** Handle an egg file being renamed */
  async onEggFileRenamed(oldPath, newPath) {
    const folder = this.plugin.vaultFolder || "nutegg";
    const wasEgg = isEggPath(oldPath, folder);
    const isEgg = isEggPath(newPath, folder);
    if (!wasEgg && !isEgg)
      return;
    const indexFile = this.plugin.app.vault.getAbstractFileByPath(
      this.plugin.settings.indexFile
    );
    if (!indexFile)
      return;
    this.isUpdatingIndex = true;
    try {
      if (wasEgg && isEgg) {
        await this.rewriteIndexPath(indexFile, oldPath, newPath);
        const oldBase = oldPath.split("/").pop() || "";
        if (oldBase) {
          await this.rewriteIndexPath(indexFile, oldBase, newPath);
        }
        new import_obsidian2.Notice(`[NutEgg] Renamed index path: ${oldPath} -> ${newPath}`);
      } else if (wasEgg && !isEgg) {
        await this.removeIndexEntry(indexFile, oldPath);
      } else {
        this.notifyDiffChanged();
      }
    } finally {
      this.isUpdatingIndex = false;
    }
  }
  /** Debounce direct edits on _index.md: notify diff changed without creating files automatically */
  debounceDirectIndexEdit() {
    if (this.directEditTimer) {
      clearTimeout(this.directEditTimer);
    }
    this.directEditTimer = setTimeout(async () => {
      this.directEditTimer = null;
      await this.onDirectIndexEdit();
    }, 500);
  }
  /**
   * Handle direct user edits on _index.md.
   * Per user requirement, direct edits on _index.md NEVER create egg files automatically.
   * The user clicks the Sync button in _index.md to trigger creation.
   */
  async onDirectIndexEdit() {
    if (this.isUpdatingIndex)
      return;
    this.notifyDiffChanged();
  }
  /** Calculate discrepancies between _index.md and disk */
  async getDiffStatus() {
    const folder = this.plugin.vaultFolder || "nutegg";
    const norm = (p) => p.startsWith(folder + "/") ? p : `${folder}/${p.replace(/^\/+/, "")}`;
    const eggFilesOnDisk = (this.plugin.app.vault.getMarkdownFiles?.() || []).filter((f) => isEggPath(f.path, folder)).map((f) => f.path);
    const diskSet = new Set(eggFilesOnDisk);
    const indexContent = await this.plugin.indexReader.getIndexContent();
    if (indexContent === "(No _index.md found)") {
      return { missingEggs: [], unindexedEggs: [], invalidEntries: [], totalDiffs: 0 };
    }
    const rawEntries = this.plugin.indexReader.parseIndexContent(indexContent);
    const missingEggs = [];
    const invalidEntries = [];
    const indexedEggPaths = /* @__PURE__ */ new Set();
    for (const entry of rawEntries) {
      const target = norm(entry.fileName);
      if (!isEggPath(target, folder)) {
        invalidEntries.push(entry.fileName);
      } else {
        indexedEggPaths.add(target);
        if (!diskSet.has(target)) {
          const exists = await this.plugin.app.vault.adapter.exists(target) || Boolean(this.plugin.app.vault.getAbstractFileByPath(target));
          if (!exists) {
            missingEggs.push(target);
          }
        }
      }
    }
    const unindexedEggs = [];
    for (const eggPath of eggFilesOnDisk) {
      if (!indexedEggPaths.has(eggPath)) {
        unindexedEggs.push(eggPath);
      }
    }
    return {
      missingEggs,
      unindexedEggs,
      invalidEntries,
      totalDiffs: missingEggs.length + unindexedEggs.length + invalidEntries.length
    };
  }
  /** Trigger full manual sync from the Sync button */
  async sync() {
    this.isUpdatingIndex = true;
    try {
      const result = await this.checkAndFix({ syncUnindexed: true });
      this.notifyDiffChanged();
      return result;
    } finally {
      this.isUpdatingIndex = false;
    }
  }
  async checkAndFix(options) {
    const result = {
      addedIndexEntries: [],
      fixedIndexPaths: [],
      createdEggs: [],
      prunedIndexEntries: []
    };
    const folder = this.plugin.vaultFolder || "nutegg";
    const indexContent = await this.plugin.indexReader.getIndexContent();
    if (indexContent === "(No _index.md found)") {
      return result;
    }
    const rawEntries = this.plugin.indexReader.parseIndexContent(indexContent);
    const norm = (p) => p.startsWith(folder + "/") ? p : `${folder}/${p.replace(/^\/+/, "")}`;
    const indexFile = this.plugin.app.vault.getAbstractFileByPath(
      this.plugin.settings.indexFile
    );
    const entries = [];
    let updatedIndexContent = indexContent;
    for (const entry of rawEntries) {
      const target = norm(entry.fileName);
      if (!isEggPath(target, folder)) {
        const escaped = entry.fileName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp(`^[\\t ]*[*\\-+]?[\\t ]*${escaped}(?:[\\t ]*:.*)?(?:\\r?\\n)?`, "m");
        updatedIndexContent = updatedIndexContent.replace(re, "");
        result.prunedIndexEntries.push(entry.fileName);
      } else {
        entries.push(entry);
      }
    }
    if (result.prunedIndexEntries.length > 0 && indexFile) {
      await this.plugin.app.vault.modify(indexFile, updatedIndexContent);
      console.log(`[NutEgg] Pruned ${result.prunedIndexEntries.length} invalid entries from index`);
    }
    if (options?.syncUnindexed && indexFile) {
      const diskEggFiles = (this.plugin.app.vault.getMarkdownFiles?.() || []).filter((f) => isEggPath(f.path, folder));
      const indexedTargets = new Set(entries.map((e) => norm(e.fileName)));
      for (const file of diskEggFiles) {
        if (!indexedTargets.has(file.path)) {
          const content = await this.plugin.app.vault.read(file).catch(() => "");
          if (matchesEggFormat(content)) {
            let topic = "";
            try {
              const egg = await this.plugin.eggParser.readEgg(file.path);
              if (egg?.topic && egg.topic !== "Unknown") {
                topic = egg.topic;
              }
            } catch {
            }
            if (!topic) {
              topic = file.path.split("/").pop().replace(/\.md$/, "");
            }
            await this.appendIndexEntry(indexFile, file.path, topic);
            result.addedIndexEntries.push(file.path);
            indexedTargets.add(file.path);
          }
        }
      }
    }
    for (const entry of entries) {
      const target = norm(entry.fileName);
      if (await this.plugin.app.vault.adapter.exists(target))
        continue;
      if (await this.plugin.app.vault.adapter.exists(entry.fileName))
        continue;
      try {
        await this.createEggFromTemplate(target, entry);
        if (target !== entry.fileName) {
          await this.rewriteIndexPath(indexFile, entry.fileName, target);
          result.fixedIndexPaths.push(target);
        }
        result.createdEggs.push(target);
      } catch (err) {
        console.warn(`[NutEgg] Could not create egg from template for ${target}:`, err);
      }
    }
    for (const entry of entries) {
      const target = norm(entry.fileName);
      if (entry.fileName !== target && await this.plugin.app.vault.adapter.exists(target)) {
        await this.rewriteIndexPath(indexFile, entry.fileName, target);
        if (!result.fixedIndexPaths.includes(target)) {
          result.fixedIndexPaths.push(target);
        }
      }
    }
    if (result.addedIndexEntries.length || result.fixedIndexPaths.length || result.createdEggs.length || result.prunedIndexEntries.length) {
      console.log(
        `[NutEgg] Index sync: +${result.addedIndexEntries.length} entries added, ~${result.fixedIndexPaths.length} paths normalized, +${result.createdEggs.length} egg files created, -${result.prunedIndexEntries.length} non-egg entries pruned`
      );
    }
    this.notifyDiffChanged();
    return result;
  }
  /**
   * Create a new egg file from a name + description (the popup's "no egg
   * matched — create one?" flow). Seeds the template's topic/scope from the
   * description and appends the matching _index.md entry. `alreadyExists`
   * when the file was already there (nothing is overwritten).
   */
  async createEgg(rawName, rawDescription) {
    const name = sanitizeEggName(rawName);
    const description = (rawDescription || "").trim();
    if (!name) {
      throw new Error("Invalid egg name");
    }
    const folder = this.plugin.vaultFolder || "nutegg";
    const fileName = `${folder}/${name}.md`;
    if (await this.plugin.app.vault.adapter.exists(fileName)) {
      const existingContent = await this.plugin.app.vault.adapter.read(fileName).catch(() => "");
      return {
        path: fileName,
        alreadyExists: true,
        language: extractEggLanguage(existingContent)
      };
    }
    const { language } = await this.createEggFromTemplate(fileName, {
      fileName,
      description
    });
    const indexFile = this.plugin.app.vault.getAbstractFileByPath(
      this.plugin.settings.indexFile
    );
    this.isUpdatingIndex = true;
    try {
      await this.appendIndexEntry(indexFile, fileName, description || name);
      this.notifyDiffChanged();
    } finally {
      this.isUpdatingIndex = false;
    }
    return { path: fileName, alreadyExists: false, language };
  }
  async removeIndexEntry(indexFile, entryPath) {
    if (!indexFile)
      return false;
    const content = await this.plugin.app.vault.read(indexFile);
    const escaped = entryPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`^[\\t ]*[*\\-+]?[\\t ]*${escaped}(?:[\\t ]*:.*)?(?:\\r?\\n)?`, "m");
    if (!re.test(content))
      return false;
    const updated = content.replace(re, "");
    if (updated === content)
      return false;
    await this.plugin.app.vault.modify(indexFile, updated);
    console.log(`[NutEgg] Removed index entry: ${entryPath}`);
    return true;
  }
  async appendIndexEntry(indexFile, eggPath, description) {
    if (!indexFile)
      return;
    const line = `* ${eggPath}${description ? `: ${description}` : ""}`;
    const content = await this.plugin.app.vault.read(indexFile);
    await this.plugin.app.vault.modify(
      indexFile,
      content.replace(/\n+$/, "") + `
${line}
`
    );
    console.log(`[NutEgg] Added index entry: ${line}`);
  }
  /** Rewrite one index entry's file path in place (keeps its description). */
  async rewriteIndexPath(indexFile, oldPath, newPath) {
    if (!indexFile)
      return;
    const content = await this.plugin.app.vault.read(indexFile);
    const escaped = oldPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`^(\\s*[*\\-+]?\\s*)${escaped}(\\s*:)`, "m");
    if (!re.test(content))
      return;
    const updated = content.replace(re, `$1${newPath}$2`);
    if (updated === content)
      return;
    await this.plugin.app.vault.modify(indexFile, updated);
    console.log(`[NutEgg] Index path fixed: ${oldPath} -> ${newPath}`);
  }
  /**
   * Create the missing egg file from the template, seeded from the index
   * entry's description (topic + scope). Reuses EGG_TEMPLATE and optionally
   * localizes concrete instructions to match the description's language.
   */
  async createEggFromTemplate(targetPath, entry) {
    await this.ensureParentFolders(targetPath);
    const folder = this.plugin.vaultFolder || "nutegg";
    const fallbackTopic = targetPath.replace(new RegExp(`^${folder}/`), "").replace(/\.md$/, "");
    const topic = (entry.description || fallbackTopic).trim();
    const dateStr = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    let content = EGG_TEMPLATE;
    content = content.replace(
      /^topic: .*$/m,
      `topic: "${this.escapeYaml(topic)}"`
    );
    if (entry.description) {
      content = content.replace(
        /^> \*\*Scope:\*\* .*$/m,
        `> **Scope:** ${entry.description}`
      );
    }
    content = content.replace(
      /^last_updated: .*$/m,
      `last_updated: "${dateStr}"`
    );
    let detectedLanguage = "";
    if (entry.description && this.plugin.aiProcessor?.localizeEggTemplate) {
      try {
        const localized = await this.plugin.aiProcessor.localizeEggTemplate(
          content,
          entry.description
        );
        if (localized) {
          if (typeof localized === "string") {
            content = localized;
            detectedLanguage = extractEggLanguage(localized) || detectedLanguage;
          } else {
            content = localized.content;
            detectedLanguage = localized.language || extractEggLanguage(localized.content) || detectedLanguage;
          }
        }
      } catch (err) {
        console.warn("[NutEgg] Failed to localize egg template with AI:", err);
      }
    }
    const settingLang = this.plugin.settings?.contentOutputLanguage;
    const pluginLang = settingLang && settingLang !== "same-as-content" ? settingLang.trim() : "";
    if (!detectedLanguage) {
      detectedLanguage = extractEggLanguage(content) || pluginLang || "English";
    }
    if (detectedLanguage) {
      content = insertEggLanguage(content, detectedLanguage, { overwrite: true });
    }
    await this.plugin.app.vault.create(targetPath, content);
    console.log(`[NutEgg] Created egg from index entry: ${targetPath}`);
    return { path: targetPath, language: detectedLanguage };
  }
  async ensureParentFolders(path) {
    const parts = path.split("/").slice(0, -1);
    let currentPath = "";
    for (const part of parts) {
      currentPath += (currentPath ? "/" : "") + part;
      const exists = await this.plugin.app.vault.adapter.exists(currentPath);
      if (!exists) {
        await this.plugin.app.vault.createFolder(currentPath);
      }
    }
  }
  escapeYaml(value) {
    return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }
};

// src/server.ts
init_egg_parser();
var NutEggServer = class {
  server = null;
  plugin;
  port;
  constructor(plugin, port) {
    this.plugin = plugin;
    this.port = port;
  }
  // --- Dedup + metrics helpers (backed by SQLite) ---
  /** All captures of a URL, newest first. Empty = never processed / DB unavailable. */
  getCaptureHistory(url) {
    const db = this.plugin.db;
    if (!db?.available)
      return [];
    const normalized = this.normalizeUrl(url);
    let rows = db.getNutHistory(normalized);
    if (rows.length === 0) {
      const ytMatch = normalized.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/);
      if (ytMatch) {
        const v = ytMatch[1];
        rows = db.getNutHistoryByPattern(`%watch%v=${v}%`);
        if (rows.length === 0) {
          rows = db.getNutHistoryByPattern(`%youtu.be/${v}%`);
        }
      } else {
        const twMatch = normalized.match(/x\.com\/[^/]+\/status\/(\d+)/);
        if (twMatch) {
          rows = db.getNutHistoryByPattern(`%/status/${twMatch[1]}%`);
        }
      }
    }
    return rows.map((row) => ({
      nutId: row.id,
      capturedAt: row.savedAt,
      saved: row.processingResult === "saved" || row.processingResult === "skip" ? row.processingResult : "analyzed",
      result: row.analysisResult,
      title: row.title,
      author: row.author,
      publishedAt: row.publishedAt,
      url: row.url,
      sourceType: row.sourceType,
      content: row.content
    }));
  }
  /** Reading/watch time estimate from metadata, or word-count fallback. */
  estimateTime(metadata, content) {
    return parseInt(metadata?.time_estimate_minutes || "0", 10) || Math.max(1, Math.ceil((content?.split(/\s+/)?.length || 0) / 200));
  }
  /** Count egg files (direct markdown notes under vaultFolder/, excluding system files). */
  countEggs() {
    const folder = this.plugin.vaultFolder || "nutegg";
    return this.plugin.app.vault.getMarkdownFiles().filter((f) => isEggPath(f.path, folder)).length;
  }
  /** Insert a capture entry into the SQLite DB if available. */
  recordNut(capture, result) {
    return this.plugin.db?.insertNut({
      url: this.normalizeUrl(capture.url),
      title: capture.title,
      sourceType: capture.sourceType,
      content: capture.content || "",
      savedAt: (/* @__PURE__ */ new Date()).toISOString(),
      publishedAt: capture.metadata?.published || "",
      author: capture.metadata?.author || capture.metadata?.channel || capture.metadata?.handle || "",
      timeEstimateMinutes: this.estimateTime(capture.metadata, capture.content),
      processingResult: "analyzed",
      summary: [result.titleVerdict, ...result.coreSummary || []].filter(Boolean).join("\n"),
      matchedEggs: result.matchedEggs || [],
      fileName: "",
      analysisResult: result
    }) ?? void 0;
  }
  /** Strip trailing slashes, fragment, and common tracking/session params. */
  normalizeUrl(url) {
    try {
      const u = new URL(url);
      u.hash = "";
      const hostname = u.hostname.toLowerCase();
      if (hostname === "youtube.com" || hostname === "www.youtube.com" || hostname === "m.youtube.com" || hostname === "music.youtube.com") {
        if (u.pathname === "/watch") {
          const v = u.searchParams.get("v");
          if (v)
            return `https://www.youtube.com/watch?v=${v}`;
        } else if (u.pathname.startsWith("/shorts/")) {
          const id = u.pathname.replace(/^\/shorts\//, "").split("/")[0]?.split("?")[0];
          if (id)
            return `https://www.youtube.com/watch?v=${id}`;
        }
      } else if (hostname === "youtu.be") {
        const id = u.pathname.replace(/^\//, "").split("/")[0]?.split("?")[0];
        if (id)
          return `https://www.youtube.com/watch?v=${id}`;
      }
      if (hostname === "twitter.com" || hostname === "www.twitter.com" || hostname === "mobile.twitter.com" || hostname === "x.com" || hostname === "www.x.com") {
        u.hostname = "x.com";
        if (/\/status\/\d+/.test(u.pathname)) {
          u.search = "";
          return u.toString().replace(/\/$/, "");
        }
      }
      const stripParams = [
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_content",
        "utm_term",
        "ref",
        "source",
        "fbclid",
        "gclid",
        "si",
        "pp",
        "feature",
        "spm"
      ];
      for (const p of stripParams) {
        u.searchParams.delete(p);
      }
      u.searchParams.sort();
      return u.toString().replace(/\/$/, "");
    } catch {
      return url.replace(/#.*$/, "").replace(/\/$/, "");
    }
  }
  async start() {
    if (this.server) {
      console.log("[NutEgg] Server is already running");
      return;
    }
    this.server = http.createServer((req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }
      if (req.method === "GET" && req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", port: this.port, timestamp: Date.now() }));
        return;
      }
      if (req.method === "GET" && req.url === "/config-status") {
        this.handleConfigStatus(res);
        return;
      }
      if (req.method === "GET" && req.url === "/credit") {
        this.handleCredit(res);
        return;
      }
      if (req.method === "GET" && req.url === "/metrics") {
        this.handleMetrics(req, res);
        return;
      }
      if (req.method === "GET" && req.url?.startsWith("/search")) {
        this.handleSearch(req, res);
        return;
      }
      if (req.method === "GET" && req.url?.startsWith("/history")) {
        this.handleHistory(req, res);
        return;
      }
      if (req.method === "GET" && req.url === "/eggs") {
        this.handleGetEggs(req, res);
        return;
      }
      if (req.method === "POST" && req.url === "/ask") {
        this.handleAsk(req, res);
        return;
      }
      if (req.method === "POST" && req.url === "/analyze") {
        this.handleAnalyze(req, res);
        return;
      }
      if (req.method === "POST" && req.url === "/confirm") {
        this.handleConfirm(req, res);
        return;
      }
      if (req.method === "POST" && req.url === "/create-egg") {
        this.handleCreateEgg(req, res);
        return;
      }
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    });
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, "127.0.0.1", () => {
        console.log(`[NutEgg] Server running on http://127.0.0.1:${this.port}`);
        resolve();
      });
      this.server.on("error", (err) => {
        console.error("[NutEgg] Server error:", err);
        reject(err);
      });
    });
  }
  /**
   * GET /config-status — Returns AI configuration status for the popup to show warnings and credit info.
   */
  async handleConfigStatus(res) {
    const settings = this.plugin.settings;
    const issues = [];
    let status = "ok";
    if (!isAIConfigured(settings)) {
      issues.push(
        settings.aiProvider === "local" ? "Local LLM endpoint or model not configured. Open Obsidian Settings \u2192 NutEgg to configure it." : "No API key configured. Open Obsidian Settings \u2192 NutEgg, enable Developer Mode, and add your API key."
      );
      status = "error";
    }
    const indexExists = await this.plugin.app.vault.adapter.exists(settings.indexFile);
    if (!indexExists) {
      issues.push(`Index file "${settings.indexFile}" not found. Click the egg icon in Obsidian to create it.`);
      status = status === "error" ? "error" : "warning";
    }
    let credit = null;
    try {
      credit = await this.plugin.aiClient.checkCredit(settings);
    } catch {
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status, issues, port: this.port, credit }));
  }
  /**
   * GET /credit — Returns live balance and credit status for the current AI provider.
   */
  async handleCredit(res) {
    try {
      const credit = await this.plugin.aiClient.checkCredit(this.plugin.settings);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(credit));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(err) }));
    }
  }
  /**
   * POST /ask — answer follow-up questions about already-analyzed content.
   * One lightweight AI call; no saving, no dedup cache interaction.
   */
  async handleAsk(req, res) {
    try {
      const body = await this.readBody(req);
      const ask = JSON.parse(body);
      if (!ask.title || !ask.content || !ask.questions?.length) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing required fields: title, content, questions" }));
        return;
      }
      const answers = await this.plugin.aiProcessor.askFollowUp(
        ask,
        ask.questions,
        ask.priorQa || []
      );
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ answers }));
    } catch (err) {
      console.error("[NutEgg] Ask error:", err);
      if (err instanceof AIError) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: err.message,
            errorCode: err.code,
            answers: []
          })
        );
        return;
      }
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Failed to answer. Please try again.", answers: [] }));
    }
  }
  /**
   * GET /history?url=... — cached captures for a URL, newest first.
   * The popup loads this on open so processed URLs show their result immediately.
   */
  handleHistory(req, res) {
    const url = new URL(req.url || "/history", `http://127.0.0.1:${this.port}`);
    const target = url.searchParams.get("url")?.trim() || "";
    const history = target ? this.getCaptureHistory(target) : [];
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ history, latest: history[0] ?? null }));
  }
  /**
   * GET /search?q=... — BM25 keyword retrieval over saved nuts (RAG foundation).
   */
  handleSearch(req, res) {
    const url = new URL(req.url || "/search", `http://127.0.0.1:${this.port}`);
    const q = url.searchParams.get("q")?.trim() || "";
    const db = this.plugin.db;
    if (!q || !db?.available) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ results: [] }));
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ results: db.search(q, 10) }));
  }
  /**
   * GET /metrics — nuts + time saved from SQLite aggregates, eggs from a file scan.
   */
  handleMetrics(_req, res) {
    try {
      const db = this.plugin.db;
      const stats = db?.available ? db.getStats() : { nuts: 0, timeSavedMinutes: 0 };
      const eggs = this.countEggs();
      const totalMinutes = Math.round(stats.timeSavedMinutes);
      const hours = Math.floor(totalMinutes / 60);
      const mins = Math.round(totalMinutes % 60);
      const timeSaved = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        nuts: stats.nuts,
        eggs,
        timeSavedMinutes: totalMinutes,
        timeSaved
      }));
    } catch (err) {
      console.error("[NutEgg] Metrics error:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ nuts: 0, eggs: 0, timeSavedMinutes: 0, timeSaved: "0m" }));
    }
  }
  /**
   * GET /eggs — all eggs from _index.md (name, routing description, topic).
   * The popup uses this for the manual egg picker.
   */
  async handleGetEggs(_req, res) {
    try {
      const indexContent = await this.plugin.indexReader.getIndexContent();
      const entries = indexContent === "(No _index.md found)" ? [] : this.plugin.indexReader.parseIndexContent(indexContent);
      const eggs = [];
      for (const entry of entries) {
        let topic = "Unknown";
        try {
          const egg = await this.plugin.eggParser.readEgg(entry.fileName);
          if (egg?.topic && egg.topic !== "Unknown")
            topic = egg.topic;
        } catch {
        }
        eggs.push({
          fileName: entry.fileName,
          description: entry.description,
          topic
        });
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ eggs }));
    } catch (err) {
      console.error("[NutEgg] Get eggs error:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ eggs: [] }));
    }
  }
  /**
   * POST /analyze — Analyze content against knowledge base, return results.
   * Does NOT save anything — the user must confirm via /confirm first.
   */
  async handleAnalyze(req, res) {
    try {
      const body = await this.readBody(req);
      const capture = JSON.parse(body);
      if (!capture.url || !capture.title) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({ error: "Missing required fields: url, title" })
        );
        return;
      }
      const hasQuestions = capture.questions && capture.questions.length > 0;
      const hasEggOverride = !!capture.eggs && capture.eggs.length > 0;
      if (!capture.stage && !hasQuestions && !capture.force && !hasEggOverride) {
        const history = this.getCaptureHistory(capture.url);
        if (history.length > 0) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ history, latest: history[0] }));
          return;
        }
      }
      if (capture.stage === 2 || capture.stage === "2") {
        const indexContent2 = await this.plugin.indexReader.getIndexContent();
        const index2 = this.plugin.indexReader.parseIndexContent(indexContent2);
        const targetEggs = (capture.eggs || []).map((fileName) => {
          const entry = index2.find(
            (e) => e.fileName === fileName || e.fileName.endsWith("/" + fileName)
          );
          return { fileName, description: entry?.description || "" };
        });
        const eggs = await this.plugin.eggParser.readEggs(targetEggs);
        const contentAnalysis2 = capture.contentAnalysis || {
          titleVerdict: capture.title,
          coreSummary: [],
          isLongForm: false,
          chapterMap: [],
          customQuestionAnswers: []
        };
        const result = await this.plugin.aiProcessor.analyzeEggs(
          capture,
          eggs,
          contentAnalysis2
        );
        delete result.stage;
        const nutId = this.recordNut(capture, result);
        console.log(
          `[NutEgg] Analyzed (Stage 2): ${capture.title} \u2014 shouldRead=${result.shouldRead}, newKnowledge=${result.newKnowledge.length}`
        );
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ...result, stage: "stage2", nutId }));
        return;
      }
      const contentAnalysis = await this.plugin.aiProcessor.analyzeContent(capture);
      const indexContent = await this.plugin.indexReader.getIndexContent();
      const index = this.plugin.indexReader.parseIndexContent(indexContent);
      let matchedEggs = [];
      if (hasEggOverride) {
        matchedEggs = capture.eggs;
      } else {
        const summaryText = [
          contentAnalysis.titleVerdict,
          ...contentAnalysis.coreSummary || []
        ].filter(Boolean).join("\n");
        const matchedIndex = await this.plugin.indexReader.matchEggs(
          { title: capture.title, url: capture.url, content: summaryText },
          index
        );
        matchedEggs = matchedIndex.map((e) => e.fileName);
      }
      console.log(
        `[NutEgg] Analyzed (Stage 1): ${capture.title} \u2014 matchedEggs=${matchedEggs.length}`
      );
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ...contentAnalysis,
          matchedEggs,
          allEggs: index.map((e) => e.fileName),
          stage: "stage1"
        })
      );
    } catch (err) {
      console.error("[NutEgg] Analyze error:", err);
      if (err instanceof AIError) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: err.message,
            errorCode: err.code,
            statusCode: err.statusCode,
            titleVerdict: "",
            coreSummary: [],
            isLongForm: false,
            chapterMap: [],
            shouldRead: false,
            shouldReadReason: "",
            matchedEggs: [],
            eggResults: [],
            newKnowledge: []
          })
        );
        return;
      }
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "Analysis failed. Please try again.",
          errorCode: "unknown",
          titleVerdict: "",
          coreSummary: [],
          isLongForm: false,
          chapterMap: [],
          shouldRead: false,
          shouldReadReason: "",
          matchedEggs: [],
          eggResults: [],
          newKnowledge: []
        })
      );
    }
  }
  /**
   * POST /confirm — User confirmed adding knowledge. Save raw content and update egg files.
   */
  async handleConfirm(req, res) {
    try {
      const body = await this.readBody(req);
      const confirm = JSON.parse(body);
      if (!confirm.url || !confirm.title) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({ error: "Missing required fields: url, title" })
        );
        return;
      }
      const hasKnowledge = confirm.newKnowledge && confirm.newKnowledge.length > 0;
      const saved = hasKnowledge ? "saved" : "skip";
      const eggNames = hasKnowledge ? [...new Set(confirm.newKnowledge.map((k) => k.egg))] : confirm.matchedEggs || [];
      const summary = confirm.summary || (confirm.analysis ? [confirm.analysis.titleVerdict, ...confirm.analysis.coreSummary || []].filter(Boolean).join("\n") : void 0);
      const timeEstimate = this.estimateTime(confirm.metadata, confirm.content);
      let fileName = "";
      if (!confirm.skipRaw) {
        fileName = await this.plugin.knowledgeBase.saveRaw({
          url: confirm.url,
          title: confirm.title,
          content: confirm.content,
          sourceType: confirm.sourceType,
          metadata: confirm.metadata,
          summary,
          matchedEggs: eggNames,
          processingResult: saved
        });
      }
      const mergedEggs = [];
      if (hasKnowledge) {
        const author = confirm.metadata?.author || confirm.metadata?.channel || confirm.metadata?.handle || "";
        await this.plugin.knowledgeBase.appendKnowledge(
          confirm.newKnowledge,
          confirm.title,
          confirm.url,
          author
        );
        const perEggList = confirm.analysis?.perEggAnalysis;
        if (Array.isArray(perEggList)) {
          for (const perEgg of perEggList) {
            if (perEgg?.egg && perEgg?.language) {
              try {
                const egg = await this.plugin.eggParser.readEgg(perEgg.egg);
                if (egg && !egg.language) {
                  const file = this.plugin.app.vault.getAbstractFileByPath(egg.fileName);
                  if (file) {
                    const content = await this.plugin.app.vault.read(file);
                    const updated = insertEggLanguage(content, perEgg.language);
                    if (updated !== content) {
                      await this.plugin.app.vault.modify(file, updated);
                    }
                  }
                }
              } catch (err) {
                console.warn(`[NutEgg] Failed to persist egg language on confirm:`, err);
              }
            }
          }
        }
      }
      const db = this.plugin.db;
      const normalizedUrl = this.normalizeUrl(confirm.url);
      const targetId = confirm.nutId ?? db?.getNutByUrl(normalizedUrl)?.id ?? null;
      if (targetId != null) {
        db?.updateNut(targetId, {
          processingResult: saved,
          ...fileName ? { fileName } : {}
        });
      } else {
        db?.insertNut({
          url: normalizedUrl,
          title: confirm.title,
          sourceType: confirm.sourceType,
          content: confirm.content || "",
          savedAt: (/* @__PURE__ */ new Date()).toISOString(),
          publishedAt: confirm.metadata?.published || "",
          author: confirm.metadata?.author || confirm.metadata?.channel || confirm.metadata?.handle || "",
          timeEstimateMinutes: timeEstimate,
          processingResult: saved,
          summary: summary || "",
          matchedEggs: eggNames,
          fileName,
          analysisResult: confirm.analysis ?? null
        });
      }
      console.log(
        `[NutEgg] Confirmed: ${confirm.title}${fileName ? ` -> ${fileName}` : ""}, knowledge entries: ${confirm.newKnowledge?.length || 0}` + (mergedEggs.length > 0 ? `, merged: ${mergedEggs.map((m) => `${m.egg} (${m.entries})`).join(", ")}` : "")
      );
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: true,
          fileName,
          message: fileName ? `Saved to ${fileName}` : "Added to egg files",
          merged: mergedEggs
        })
      );
    } catch (err) {
      console.error("[NutEgg] Confirm error:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Failed to save content" }));
    }
  }
  /**
   * POST /create-egg — create a new egg file + index entry. Used by the
   * popup's "no egg matched — create one?" flow.
   */
  async handleCreateEgg(req, res) {
    try {
      const body = await this.readBody(req);
      const { name, description } = JSON.parse(body);
      const safeName = sanitizeEggName(name);
      if (!safeName) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing egg name" }));
        return;
      }
      const result = await this.plugin.indexSync.createEgg(
        safeName,
        String(description || "")
      );
      console.log(
        `[NutEgg] Created egg via popup: ${result.path}` + (result.alreadyExists ? " (already existed)" : "")
      );
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: true,
          path: result.path,
          alreadyExists: result.alreadyExists,
          language: result.language
        })
      );
    } catch (err) {
      console.error("[NutEgg] Create egg error:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Failed to create egg" }));
    }
  }
  readBody(req) {
    return new Promise((resolve, reject) => {
      let data = "";
      req.on("data", (chunk) => data += chunk);
      req.on("end", () => resolve(data));
      req.on("error", reject);
    });
  }
  async stop() {
    if (!this.server)
      return;
    return new Promise((resolve) => {
      this.server.close(() => {
        console.log("[NutEgg] Server stopped");
        this.server = null;
        resolve();
      });
    });
  }
  isRunning() {
    return this.server !== null;
  }
};

// src/ai-processor.ts
init_egg_parser();

// src/workflow/content-analysis.md
var content_analysis_default = `You are a knowledge curator. Analyze the content below following the Task.

## Content to Analyze
**Title:** {{title}}
**Source:** {{url}}
**Type:** {{source_type}}
{{part_note}}{{chapters}}
{{sections}}{{questions}}

{{content}}

## Task
{{content_task_default}}

## Output Format
Respond with ONLY a valid JSON object matching this schema (no markdown, no code fence, just the JSON object):
{
  "titleVerdict": "direct answer to the title's question",
  "coreSummary": ["bullet 1", "bullet 2", "bullet 3"],
  "isLongForm": true,
  "chapterMap": [
    {"time": "00:12:34", "title": "chapter title", "summary": "one sentence"}
  ],
  "customQuestionAnswers": [
    {"question": "exact question text", "answer": "direct answer"}
  ]
}

## Output Rules
- titleVerdict must be a single sentence.
- coreSummary: at most 3 bullets, plain language.
- isLongForm: true only for long articles/videos that meaningfully benefit from a chapter map.
- chapterMap: empty array when isLongForm is false. When video chapters are provided, keep their exact timestamps and titles, and only add your 1-sentence summary.
- chapterMap when Video Sections are listed above: return EXACTLY one entry per listed section, using the section's start time as "time" \u2014 give each a short title and a 1-sentence summary of what happens between that section and the next.
- chapterMap when NO chapters or sections were provided: empty array (the content is not a timestamped video).
- customQuestionAnswers: one entry per DISTINCT user question (empty array when none). Skip any user question that is equivalent in meaning to an Egg Key Question above or to another user question \u2014 answer it only once.
{{shared_output_rules}}
`;

// src/workflow/egg-analysis.md
var egg_analysis_default = `You are a knowledge curator for the egg file "{{egg_file}}". Extract knowledge entries from the content below according to this egg's instructions.

## Egg Instructions
{{egg_instructions}}

## Content to Analyze
**Title:** {{title}}
**Source:** {{url}}
**Type:** {{source_type}}
{{part_note}}

{{content}}

## Task
1. Follow action guide in Egg Instructions
2. Answer each Key Question (if any) directly and concisely based on the content.
3. Extract Knowledge Entries: extract all substantive insights, concepts, frameworks, and findings from the content that fall within this egg's Scope, formatted strictly per the Formatting Rules:
   - Follow the concept \u2192 explanation \u2192 example structure: one top-level bullet "- [tag] **Concept**: short phrases" (without "[tag] " when the egg defines no tags), with the explanation as one indented sub-bullet and concrete examples from the content as further indented sub-bullets ("  - \u{1F3AF} Example: ...") when present. Name each Concept clearly.
   - Structured enumerations / frameworks (numbered lists, step-by-step methods, named frameworks): capture as ONE complete entry preserving EVERY item in order. Never summarize items away, never truncate.
   - Do NOT include author or source \u2014 they are appended automatically.

## Output Format
Respond in this EXACT JSON format (no markdown, no code fence, just the JSON object):
{
  "language": "English",
  "keyQuestionAnswers": [
    {"question": "exact question text", "answer": "direct answer"}
  ],
  "extractedEntries": [
    {"kind": "insight", "content": "- [tag] **Concept**: short phrases\\n  - explanation\\n  - \u{1F3AF} Example: ..."}
  ]
}

## Output Rules:
- language: the primary natural language of the egg note or extracted entries (e.g. "English", "Chinese", "Japanese", etc.).
- extractedEntries: empty array if the content contains no substantive knowledge matching this egg's scope. "kind" is "insight" (default) or "list" (for structured enumerations).
{{shared_output_rules}}
`;

// src/workflow/follow-up.md
var follow_up_default = `You are a knowledge curator. Answer the user's follow-up questions about this content.

## Content to Analyze
**Title:** {{title}}
**Source:** {{url}}
**Type:** {{source_type}}
{{prior_qa}}

{{content}}

## New Questions (answer each directly and concisely)
{{questions}}

## Output Format
Respond in this EXACT JSON format (no markdown, no code fence, just the JSON object):
{
  "answers": [
    {"question": "exact question text", "answer": "direct answer"}
  ]
}

## Output Rules:
- One entry per question, in the same order.
- If a question is equivalent to one in Previous Questions & Answers, answer briefly with the same conclusion instead of repeating it.
{{shared_output_rules}}
`;

// src/workflow/egg-routing.md
var egg_routing_default = 'Given this content and egg index, which egg file(s) does this content belong to? Return ONLY the file names, one per line. If none match, return "none".\n\n## Content\nTitle: {{title}}\nURL: {{url}}\n{{content}}\n\n## Egg Index\n{{index}}\n\nReturn matching file names (one per line):\n';

// src/workflow/content-task-default.md
var content_task_default_default = "1. Title Verdict: Provide a single, direct sentence that resolves the core question posed in the title or introduction.\n2. Core Summary: Summarize the main concepts in plain language using a maximum of 3 bullet points.\n3. Chapter Map (Long-form only): If the content is a long article or lengthy video, provide a brief 1-sentence summary for each major section or topic shift. If it is short, omit this step entirely.\n";

// src/workflow/merge-unprocessed.md
var merge_unprocessed_default = `You are a knowledge curator for the egg file "{{egg_file}}". The Unprocessed section has accumulated {{unprocessed_count}} entries \u2014 merge them into the knowledge tree below.

## Formatting Rules
{{formatting_rules}}

## Existing Knowledge Tree
{{knowledge_tree}}

## Entries to Merge
{{unprocessed}}

## Task
1. PRESERVE the existing tree structure as much as possible: do not rename, restructure, or delete existing branches \u2014 the user may have edited them by hand.
2. Deduplicate the entries against EACH OTHER first, comparing their Concepts: entries with the same or equivalent concept are ONE entry, even when the explanations differ \u2014 keep the clearest explanation, fold the others' examples into it, and keep every distinct _author/_source line. A near-duplicate must never appear twice in the merged tree \u2014 dropping redundant rewordings is more valuable than preserving slight wording differences.
3. Structured lists (entries holding a numbered enumeration / framework): entries with the same title are fragments of ONE list \u2014 union their items (drop exact-duplicate items), keep the source's item order. Never truncate a list: every item the source enumerated must survive the merge.
4. Nest each deduplicated entry under the most relevant existing concept as sub-bullets.
5. Only when an entry matches no existing concept, create a new minimal top-level branch for it.
6. Keep each entry's insight, concrete examples, and its _author/_source lines intact when moving it into the tree.
7. If an entry's concept duplicates existing knowledge in the tree, drop it entirely.
8. If an entry cannot be merged meaningfully, leave it in the "unprocessed" output.

## Output Format
Respond in this EXACT JSON format (no markdown, no code fence, just the JSON object):
{
  "knowledge": "the COMPLETE updated Knowledge section content as markdown \u2014 the existing tree with the merged entries nested in. Only the section BODY: do NOT include the '# Knowledge' heading line itself.",
  "unprocessed": "the entries that could not be merged (markdown), or an empty string when all were merged. Only the section BODY: do NOT include the '# Unprocessed' heading line itself."
}

## Output Rules:
- Output Language: write ALL output text (knowledge entries, explanations) in {{output_language}}. Keep JSON keys in English.
`;

// src/workflow/aggregate-content.md
var aggregate_content_default = `You are a knowledge curator. The content below was too long for one pass and was analyzed in parts. Combine the per-part results into ONE coherent result for the whole content.

## Content
**Title:** {{title}}
**Source:** {{url}}

## Per-Part Summaries
{{chunk_summaries}}

{{questions}}

## Task
{{content_task_default}}

## Output Format
Respond in this EXACT JSON format (no markdown, no code fence, just the JSON object):
{
  "titleVerdict": "direct answer to the title's question",
  "coreSummary": ["bullet 1", "bullet 2"],
  "customQuestionAnswers": [
    {"question": "exact question text", "answer": "direct answer"}
  ]
}

## Output Rules
- customQuestionAnswers: one entry per DISTINCT user question (empty array when none).
{{shared_output_rules}}
`;

// src/workflow/aggregate-egg.md
var aggregate_egg_default = 'You are a knowledge curator for the egg file "{{egg_file}}". The content was too long for one pass and was analyzed against this egg in parts. Decide for the content AS A WHOLE and synthesize knowledge entries across parts.\n\n## Egg Instructions\n{{egg_instructions}}\n\n## Per-Part Findings\n{{chunk_findings}}\n\n## Task\n1. Synthesize Knowledge Entries across parts into "novelDelta":\n   - Connect and assemble related findings that spread across different parts (e.g. principles of a framework, steps of a methodology, or concepts introduced in one part and expanded in another) into complete, unified knowledge entries.\n   - When a concept was partially mentioned in an earlier part and fully explained in a later part, merge them into the single complete entry.\n   - For standalone insights from individual parts, preserve them as formatted entries.\n   - Determine "parent" in the Knowledge Tree for each entry.\n2. Answer each Key Question (if any) for the whole content, directly and concisely.\n3. Apply the Rejection Criteria to the whole content \u2014 set rejected to true with a one-line reason when it is noise for this egg.\n4. Decide: should the user spend time reading/watching this fully? Consider the reject criteria and whether the parts together add new insight.\n\n## Output Format\nRespond in this EXACT JSON format (no markdown, no code fence, just the JSON object):\n{\n  "novelDelta": [\n    {"parent": "parent heading in knowledge tree or empty string", "kind": "insight", "content": "- formatted entry text\\n  - sub bullets"}\n  ],\n  "keyQuestionAnswers": [\n    {"question": "exact question text", "answer": "direct answer"}\n  ],\n  "rejected": false,\n  "rejectReason": "",\n  "readVerdict": true,\n  "readVerdictReason": "one-line reason"\n}\n\n## Output Rules:\n{{shared_output_rules}}\n';

// src/workflow/egg-compare.md
var egg_compare_default = `You are a knowledge curator for the egg file "{{egg_file}}".
Your task is to compare newly extracted candidate knowledge entries from a source against this egg's existing Knowledge tree and Unprocessed entries to identify genuinely NEW insights and decide if the source is worth reading.

## Existing Knowledge in Egg
### Current Knowledge Tree
{{current_knowledge}}

### Unprocessed Entries (pending merge)
{{unprocessed}}

## Rejection Criteria
{{rejection_criteria}}

## Candidate Knowledge Entries Extracted from Source
**Source Title:** {{title}}
**Source URL:** {{url}}

{{extracted_entries}}

## Task
1. Novel Delta: compare each candidate knowledge entry against the Current Knowledge Tree AND the Unprocessed entries.
   - Compare by CONCEPT: an insight is new only when its core concept is not already covered in the existing knowledge. The same concept with different wording or a different minor example is a DUPLICATE, not new.
   - Classify EVERY candidate entry into either "novelDelta" (genuinely new) or "redundantEntries" (already covered/known in the existing knowledge tree).
   - EXCEPTION \u2014 structured content: when an entry is a well-organized enumeration (a numbered list, a named framework like "Seven Principles of X", a step-by-step process), preserve the COMPLETE list intact in novelDelta unless the entire framework already exists in the tree.
   - For each kept novel entry: determine "parent" \u2014 the EXACT text of the existing bullet or heading in the Current Knowledge tree that best fits as a parent topic to nest under (use "" if no suitable parent exists in the tree).
   - For each redundant entry: determine "existingParent" \u2014 the existing concept or heading it was already covered under.
2. Rejection Criteria:
   - If the content violates the Rejection Criteria or has NO new/novel knowledge for this egg, set "rejected": true and give a one-line "rejectReason".
3. Read Verdict:
   - Decide if the user should spend time reading/watching this source fully ("readVerdict": true/false).
   - If novel, valuable insights were found, set "readVerdict": true with a one-line "readVerdictReason".
   - If redundant, superficial, or noise, set "readVerdict": false with a one-line "readVerdictReason".

## Output Format
Respond in this EXACT JSON format (no markdown, no code fence, just the JSON object):
{
  "novelDelta": [
    {"parent": "exact parent bullet text from knowledge tree or empty string", "kind": "insight", "content": "- formatted entry text\\n  - sub bullets"}
  ],
  "redundantEntries": [
    {"existingParent": "matched concept or heading in knowledge tree", "content": "- candidate entry text that was already known"}
  ],
  "rejected": false,
  "rejectReason": "",
  "readVerdict": true,
  "readVerdictReason": "one-line explanation"
}

## Output Rules:
- "parent" must match the exact text of a heading or bullet in Current Knowledge ("" if none).
- "kind" is "insight" or "list".
{{shared_output_rules}}
`;

// src/workflow/localize-egg.md
var localize_egg_default = 'You are a knowledge curator for NutEgg.\n\n## Egg Description\n{{description}}\n\n## Egg Template\n{{template}}\n\n## Task\nTranslate and adapt the concrete instructions, questions, criteria, and rule descriptions in the template above so they use the SAME LANGUAGE as the egg description: "{{description}}".\n\n## Output Rules:\n1. Language: All explanations, questions, criteria, and rule guidance must be written in the same language as the egg description: "{{description}}".\n2. Egg Parser Structure: The structure and these exact labels MUST remain in English:\n   - Frontmatter (`---`, `topic: ...`, `status: ...`, `last_updated: ...`, `language: <detected language name in English, e.g. English, Chinese, Japanese, Korean, Spanish, French, German, Russian>`)\n   - Callout: `> [!abstract]- Instructions:`\n   - Bold section labels: `> **Scope:**`, `> **Action Guide:**`, `> **Key Questions:**`, `> **Rejection Criteria:**`, `> **Formatting Rules:**`\n   - Step labels in Action Guide: `1. Title Verdict:`, `2. Core Summary:`, `3. Chapter Map (Long-form only):`, `4. Novel Delta:`, `5. Decide:`\n   - Headings: `# Knowledge` and `# Unprocessed`\n   - Tag names in Formatting Rules: `[concept]`, `[architecture]`, `[method]`, `[benchmark]`, `[explain]`, `[fact]`, `[example]`\n\nOutput ONLY the complete updated egg file markdown. Do NOT wrap in markdown code fences.\n\n';

// src/workflow/shared-output-rules.md
var shared_output_rules_default = '- Grounding: The content is the ONLY source of truth for every answer and summary you produce. Report what the content actually says even when it contradicts common sense or well-known facts \u2014 never correct, refute, or supplement it with outside knowledge. If the content does not address a question, say "Not covered in this content".\n- Output Language: Write ALL output text (verdicts, summaries, answers, knowledge entries, reasons) in {{output_language}}. Keep all JSON keys in English.';

// src/prompt-templates.ts
var PROMPTS = {
  /** Phase 1 — content summary + chapter map + custom question answers. */
  contentAnalysis: content_analysis_default,
  /** Step 1 extraction — content against one egg using instructions only. */
  eggAnalysis: egg_analysis_default,
  /** Step 2 comparison — candidate knowledge entries vs egg knowledge tree. */
  eggCompare: egg_compare_default,
  /** Follow-up questions after the initial analysis. */
  followUp: follow_up_default,
  /** Egg routing — match content to egg files from _index.md. */
  eggRouting: egg_routing_default,
  /** Default content analysis task (Title Verdict, Core Summary, Chapter Map). */
  contentTaskDefault: content_task_default_default.trim(),
  /** Merge 20+ Unprocessed entries into the Knowledge tree. */
  mergeUnprocessed: merge_unprocessed_default,
  /** Combine per-part results into one result for long content. */
  aggregateContent: aggregate_content_default,
  /** Per-egg verdict + key questions for long content (after per-part delta). */
  aggregateEgg: aggregate_egg_default,
  /** Localize egg template matching the description language while keeping parser structure in English. */
  localizeEgg: localize_egg_default,
  /** Shared output rules (grounding + language reference) injected into prompts. */
  sharedOutputRules: shared_output_rules_default.trim()
};
function renderPrompt(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = vars[key];
    return value === void 0 ? "" : String(value);
  });
}

// src/ai-processor.ts
var DEFAULT_CHUNK_WINDOW_CHARS = 3e4;
var DEFAULT_SECTION_SECS = 300;
var MERGE_THRESHOLD = 20;
var AIProcessor = class {
  plugin;
  constructor(plugin) {
    this.plugin = plugin;
  }
  get chunkWindowChars() {
    const val = this.plugin?.settings?.chunkWindowChars;
    return typeof val === "number" && val > 0 ? val : DEFAULT_CHUNK_WINDOW_CHARS;
  }
  get sectionGridSeconds() {
    const val = this.plugin?.settings?.sectionGridSeconds;
    return typeof val === "number" && val > 0 ? val : DEFAULT_SECTION_SECS;
  }
  getPrompt(key) {
    return this.plugin.workflowManager?.getPrompt(key) || PROMPTS[key] || "";
  }
  /**
   * Output rules for Stage 1 content analysis (follows settings.contentOutputLanguage).
   */
  getContentOutputRules() {
    const langSetting = this.plugin.settings?.contentOutputLanguage || "same-as-content";
    const isSame = langSetting === "same-as-content";
    const outputLanguage = isSame ? "the same language as the captured content" : langSetting;
    const tpl = this.getPrompt("sharedOutputRules");
    return renderPrompt(tpl, { output_language: outputLanguage }).trim();
  }
  /**
   * Output rules for Stage 2 egg analysis (follows the egg's language property).
   */
  getEggOutputRules(eggOrLanguage = "", fallbackDescription = "") {
    let lang = "";
    let desc = fallbackDescription;
    if (typeof eggOrLanguage === "object" && eggOrLanguage !== null) {
      lang = (eggOrLanguage.language || "").trim();
      desc = desc || (eggOrLanguage.indexDescription || "").trim();
    } else {
      lang = (eggOrLanguage || "").trim();
    }
    const pluginSetting = this.plugin.settings?.contentOutputLanguage;
    const pluginLang = pluginSetting && pluginSetting !== "same-as-content" ? pluginSetting.trim() : "";
    const outputLanguage = lang ? lang.includes(" ") && !/^[A-Za-z]+$/.test(lang) ? `the same language as this reference: "${lang}"` : lang : pluginLang ? pluginLang : "the same language as this egg note's existing knowledge (or the captured content if the egg has no existing knowledge)";
    const tpl = this.getPrompt("sharedOutputRules");
    return renderPrompt(tpl, {
      output_language: outputLanguage
    }).trim();
  }
  async analyze(capture, eggs) {
    if (!isAIConfigured(this.plugin.settings)) {
      return this.fallbackAnalysis(capture, eggs);
    }
    const contentAnalysis = await this.analyzeContent(capture);
    return this.analyzeEggs(capture, eggs, contentAnalysis);
  }
  /**
   * Stage 1 — content summary + chapter map + custom question answers.
   * Handles long-form chunked content with aggregation or single-chunk content.
   */
  async analyzeContent(capture) {
    if (!isAIConfigured(this.plugin.settings)) {
      return {
        titleVerdict: capture.title,
        coreSummary: [capture.title],
        isLongForm: false,
        chapterMap: [],
        customQuestionAnswers: (capture.questions || []).map((q) => ({
          question: q,
          answer: "No API key configured \u2014 cannot answer."
        }))
      };
    }
    const chunks = this.chunkContent(capture.content, capture.chapters || []);
    if (chunks.length > 1) {
      const partResults = await Promise.all(
        chunks.map(
          (chunk) => this.callContentChunk(
            {
              ...capture,
              content: chunk.content,
              chapters: chunk.chapters,
              sections: chunk.sections,
              questions: []
            },
            this.partNote(chunk)
          )
        )
      );
      const summary = await this.aggregateContent(
        capture,
        partResults.map((r, i) => ({
          part: i + 1,
          startTime: chunks[i].startTime,
          bullets: r.coreSummary
        }))
      );
      const chapterMap = partResults.flatMap((r) => r.chapterMap);
      return {
        titleVerdict: summary.titleVerdict,
        coreSummary: summary.coreSummary,
        isLongForm: true,
        chapterMap,
        customQuestionAnswers: summary.customQuestionAnswers
      };
    }
    const single = chunks[0];
    const effective = {
      ...capture,
      chapters: single?.chapters,
      sections: single?.sections
    };
    return this.callContentChunk(effective, "");
  }
  /**
   * Stage 2 — per-egg extraction, comparison against egg knowledge tree,
   * and final read verdict synthesis. Works identically for 1 or N eggs.
   */
  async analyzeEggs(capture, eggs, contentAnalysis) {
    if (!isAIConfigured(this.plugin.settings) || eggs.length === 0) {
      return {
        ...contentAnalysis,
        shouldRead: eggs.length === 0 ? false : true,
        shouldReadReason: eggs.length === 0 ? "No matching egg found in vault." : this.plugin.settings.aiProvider === "local" ? "Local LLM not configured." : "No API key configured.",
        matchedEggs: eggs.map((e) => e.fileName),
        eggResults: [],
        newKnowledge: []
      };
    }
    const chunks = this.chunkContent(capture.content, capture.chapters || []);
    let eggResults = [];
    if (chunks.length > 1) {
      for (const egg of eggs) {
        const partEggs = await Promise.all(
          chunks.map(
            (chunk) => this.analyzeAgainstEgg(
              { ...capture, content: chunk.content },
              egg,
              this.partNote(chunk)
            )
          )
        );
        const aggregate = await this.aggregateEgg(
          egg,
          chunks.map((chunk, i) => ({
            part: i + 1,
            startTime: chunk.startTime,
            delta: partEggs[i]?.novelDelta || []
          }))
        );
        const novelDelta = aggregate.novelDelta && aggregate.novelDelta.length > 0 ? aggregate.novelDelta : this.mergePerPartDeltas(partEggs.flatMap((r) => r?.novelDelta || []));
        const redundantEntries = partEggs.flatMap((r) => r?.redundantEntries || []);
        const existingKnowledge = partEggs.find((r) => r?.existingKnowledge)?.existingKnowledge || egg.knowledge;
        eggResults.push({
          egg: egg.fileName,
          keyQuestionAnswers: aggregate.keyQuestionAnswers,
          novelDelta,
          redundantEntries,
          existingKnowledge,
          rejected: aggregate.rejected,
          rejectReason: aggregate.rejectReason,
          readVerdict: aggregate.readVerdict,
          readVerdictReason: aggregate.readVerdictReason
        });
      }
    } else {
      eggResults = (await Promise.all(
        eggs.map((egg) => this.analyzeAgainstEgg(capture, egg))
      )).filter((r) => r !== null);
    }
    const verdict = this.mergeVerdict(eggResults);
    const newKnowledge = eggResults.flatMap(
      (r) => r.novelDelta.map((d) => ({
        egg: r.egg,
        parent: d.parent,
        content: d.content
      }))
    );
    return {
      ...contentAnalysis,
      ...verdict,
      matchedEggs: eggs.map((e) => e.fileName),
      eggResults,
      newKnowledge
    };
  }
  /** Phase 1 — content-level summary + chapter map + custom question answers. */
  async callContentChunk(capture, partNote = "") {
    const prompt = renderPrompt(this.getPrompt("contentAnalysis"), {
      content_task_default: this.getPrompt("contentTaskDefault"),
      title: capture.title,
      url: capture.url,
      source_type: capture.sourceType,
      part_note: partNote,
      chapters: this.chaptersBlock(capture.chapters),
      sections: this.sectionsBlock(capture.sections),
      questions: this.questionsBlock(
        capture.questions,
        "User Questions (answer each directly and concisely)"
      ),
      content: this.truncate(capture.content, this.chunkWindowChars),
      shared_output_rules: this.getContentOutputRules()
    });
    const configuredMax = this.plugin?.settings?.contentAnalysisMaxTokens || 16384;
    const response = await this.callAI(prompt, configuredMax);
    const parsed = this.parseJson(response, "content-analysis");
    return {
      titleVerdict: String(parsed.titleVerdict || "Could not generate a verdict."),
      coreSummary: Array.isArray(parsed.coreSummary) ? parsed.coreSummary.map(String).slice(0, 3) : [],
      isLongForm: parsed.isLongForm === true,
      chapterMap: this.completeChapterMap(
        Array.isArray(parsed.chapterMap) ? parsed.chapterMap.filter((c) => c && (c.time || c.title)).map((c) => ({
          time: String(c.time || ""),
          title: String(c.title || ""),
          summary: String(c.summary || "")
        })) : [],
        capture.sections
      ),
      customQuestionAnswers: this.parseKeyAnswers(parsed.customQuestionAnswers)
    };
  }
  /**
   * Multiple eggs — per-egg analysis:
   *   Step 1: Extract candidate knowledge entries + key question answers using ONLY the egg's instructions.
   *   Step 2: Compare candidate entries against egg's Knowledge tree & Unprocessed entries to find novel delta and read verdict.
   */
  async analyzeAgainstEgg(capture, egg, partNote = "") {
    const prompt = renderPrompt(this.getPrompt("eggAnalysis"), {
      egg_file: egg.fileName,
      egg_instructions: this.plugin.eggParser.formatEggInstructionsForPrompt(egg),
      title: capture.title,
      url: capture.url,
      source_type: capture.sourceType,
      part_note: partNote,
      content: this.truncate(capture.content, this.chunkWindowChars),
      shared_output_rules: this.getEggOutputRules(egg)
    });
    try {
      const tokenBudget = this.plugin?.settings?.contentAnalysisMaxTokens || 16384;
      const response = await this.callAI(prompt, tokenBudget);
      const parsed = this.parseJson(response, "egg-analysis");
      const keyQuestionAnswers = this.parseKeyAnswers(parsed.keyQuestionAnswers);
      const extractedEntries = this.parseExtractedEntries(parsed.extractedEntries);
      const detectedLanguage = typeof parsed.language === "string" ? parsed.language.trim() : "";
      if (!egg.language && detectedLanguage) {
        egg.language = detectedLanguage;
        try {
          const file = this.plugin.app.vault.getAbstractFileByPath(egg.fileName);
          if (file) {
            const content = await this.plugin.app.vault.read(file);
            const updated = insertEggLanguage(content, detectedLanguage);
            if (updated !== content) {
              await this.plugin.app.vault.modify(file, updated);
            }
          }
        } catch (err) {
          console.warn(`[NutEgg] Failed to persist LLM-detected language to ${egg.fileName}:`, err);
        }
      }
      const diff = await this.compareEggKnowledge(capture, egg, extractedEntries);
      return {
        egg: egg.fileName,
        language: detectedLanguage || egg.language || void 0,
        keyQuestionAnswers,
        extractedEntries,
        novelDelta: diff.novelDelta,
        redundantEntries: diff.redundantEntries,
        existingKnowledge: diff.existingKnowledge,
        rejected: diff.rejected,
        rejectReason: diff.rejectReason,
        readVerdict: diff.readVerdict,
        readVerdictReason: diff.readVerdictReason
      };
    } catch (err) {
      if (err instanceof AIError)
        throw err;
      console.error(`[NutEgg] Egg analysis failed for ${egg.fileName}:`, err);
      return null;
    }
  }
  /**
   * Step 2 — Compare extracted candidate knowledge entries against the egg's
   * existing Knowledge tree and Unprocessed entries to find novel delta and read verdict.
   */
  async compareEggKnowledge(capture, egg, extractedEntries) {
    const existingKnowledge = egg.knowledge || "";
    if (extractedEntries.length === 0) {
      return {
        novelDelta: [],
        redundantEntries: [],
        existingKnowledge,
        rejected: false,
        rejectReason: "",
        readVerdict: false,
        readVerdictReason: "No knowledge entries extracted matching this egg's scope."
      };
    }
    const prompt = renderPrompt(this.getPrompt("eggCompare"), {
      egg_file: egg.fileName,
      title: capture.title,
      url: capture.url,
      current_knowledge: existingKnowledge || "(empty)",
      unprocessed: egg.unprocessed || "(empty)",
      rejection_criteria: egg.rejectionCriteria.length > 0 ? egg.rejectionCriteria.map((c) => `- ${c}`).join("\n") : "(none)",
      extracted_entries: extractedEntries.map((e, i) => `### Entry ${i + 1} (${e.kind || "insight"})
${e.content}`).join("\n\n"),
      shared_output_rules: this.getEggOutputRules(egg)
    });
    try {
      const tokenBudget = this.plugin?.settings?.contentAnalysisMaxTokens || 16384;
      const response = await this.callAI(prompt, tokenBudget);
      const parsed = this.parseJson(response, "egg-compare");
      const novelDelta = Array.isArray(parsed.novelDelta) ? parsed.novelDelta.filter((d) => d && d.content).map((d) => ({
        parent: String(d.parent || ""),
        content: String(d.content)
      })) : [];
      const rawRedundant = Array.isArray(parsed.redundantEntries) ? parsed.redundantEntries : Array.isArray(parsed.duplicateEntries) ? parsed.duplicateEntries : Array.isArray(parsed.duplicates) ? parsed.duplicates : [];
      const redundantEntries = rawRedundant.filter((r) => r && r.content).map((r) => ({
        existingParent: String(r.existingParent || r.parent || ""),
        content: String(r.content)
      }));
      for (const ext of extractedEntries) {
        const extClean = ext.content.trim().toLowerCase();
        const isInDelta = novelDelta.some((n) => {
          const nClean = n.content.trim().toLowerCase();
          return nClean === extClean || nClean.includes(extClean) || extClean.includes(nClean);
        });
        const isInRedundant = redundantEntries.some((r) => {
          const rClean = r.content.trim().toLowerCase();
          return rClean === extClean || rClean.includes(extClean) || extClean.includes(rClean);
        });
        if (!isInDelta && !isInRedundant) {
          redundantEntries.push({
            existingParent: "Existing Knowledge Tree",
            content: ext.content
          });
        }
      }
      return {
        novelDelta,
        redundantEntries,
        existingKnowledge,
        rejected: parsed.rejected === true,
        rejectReason: String(parsed.rejectReason || ""),
        readVerdict: parsed.readVerdict !== false,
        readVerdictReason: String(parsed.readVerdictReason || "")
      };
    } catch (err) {
      if (err instanceof AIError)
        throw err;
      console.error(`[NutEgg] Knowledge comparison failed for ${egg.fileName}:`, err);
      return {
        novelDelta: extractedEntries.map((e) => ({ parent: "", content: e.content })),
        redundantEntries: [],
        existingKnowledge,
        rejected: false,
        rejectReason: "",
        readVerdict: true,
        readVerdictReason: "Extracted novel knowledge entries."
      };
    }
  }
  /** Normalize a candidate knowledge entries array from the AI response. */
  parseExtractedEntries(raw) {
    if (!Array.isArray(raw))
      return [];
    return raw.filter((e) => e && (typeof e === "string" || e.content)).map((e) => {
      if (typeof e === "string") {
        return { kind: "insight", content: e.trim() };
      }
      return {
        kind: e.kind === "list" ? "list" : "insight",
        content: String(e.content).trim()
      };
    }).filter((e) => e.content.length > 0);
  }
  /**
   * Deduplicate and merge per-part deltas. When multiple parts report on the same concept,
   * prefer the fuller, more comprehensive entry over a partial or stub mention.
   */
  mergePerPartDeltas(deltas) {
    const conceptMap = /* @__PURE__ */ new Map();
    const result = [];
    for (const d of deltas) {
      const match = d.content.match(/\*\*([^*]+)\*\*/);
      const conceptKey = match ? match[1].trim().toLowerCase() : "";
      if (!conceptKey) {
        if (!result.some((r) => r.parent === d.parent && r.content === d.content)) {
          result.push(d);
        }
        continue;
      }
      const existing = conceptMap.get(conceptKey);
      if (!existing) {
        conceptMap.set(conceptKey, d);
        result.push(d);
      } else if (d.content.length > existing.content.length) {
        const idx = result.indexOf(existing);
        if (idx !== -1) {
          result[idx] = d;
        }
        conceptMap.set(conceptKey, d);
      }
    }
    return result;
  }
  /** Aggregate the per-part content summaries into one result. */
  async aggregateContent(capture, chunkSummaries) {
    const prompt = renderPrompt(this.getPrompt("aggregateContent"), {
      title: capture.title,
      url: capture.url,
      chunk_summaries: chunkSummaries.map((c) => {
        const at = c.startTime ? ` (${c.startTime})` : "";
        const bullets = c.bullets.map((b) => `- ${b}`).join("\n");
        return `## Part ${c.part} of ${chunkSummaries.length}${at}
${bullets || "- (no summary)"}`;
      }).join("\n\n"),
      questions: this.questionsBlock(
        capture.questions,
        "User Questions (answer each directly and concisely)"
      ),
      content_task_default: this.getPrompt("contentTaskDefault"),
      shared_output_rules: this.getContentOutputRules()
    });
    const response = await this.callAI(prompt, 800);
    const parsed = this.parseJson(response, "aggregate-content");
    return {
      titleVerdict: String(parsed.titleVerdict || "Could not generate a verdict."),
      coreSummary: Array.isArray(parsed.coreSummary) ? parsed.coreSummary.map(String).slice(0, 3) : [],
      customQuestionAnswers: this.parseKeyAnswers(parsed.customQuestionAnswers)
    };
  }
  /** Aggregate per-part delta findings into the egg's key answers + verdict. */
  async aggregateEgg(egg, chunkFindings) {
    const prompt = renderPrompt(this.getPrompt("aggregateEgg"), {
      egg_file: egg.fileName,
      egg_instructions: this.plugin.eggParser.formatEggForPrompt(egg),
      chunk_findings: chunkFindings.map((f) => {
        const at = f.startTime ? ` (${f.startTime})` : "";
        const delta = f.delta.map((d) => d.content).join("\n");
        return `## Part ${f.part} of ${chunkFindings.length}${at}
${delta || "- (no novel delta)"}`;
      }).join("\n\n"),
      shared_output_rules: this.getEggOutputRules(egg)
    });
    const response = await this.callAI(prompt, 1500);
    const parsed = this.parseJson(response, "aggregate-egg");
    const novelDelta = Array.isArray(parsed.novelDelta) ? parsed.novelDelta.filter((d) => d && d.content).map((d) => ({
      parent: String(d.parent || ""),
      content: String(d.content)
    })) : void 0;
    return {
      novelDelta,
      keyQuestionAnswers: this.parseKeyAnswers(parsed.keyQuestionAnswers),
      rejected: parsed.rejected === true,
      rejectReason: String(parsed.rejectReason || ""),
      readVerdict: parsed.readVerdict !== false,
      readVerdictReason: String(parsed.readVerdictReason || "")
    };
  }
  /**
   * Localize an egg template (from templates/egg.md) into the same language as
   * the egg description. Keeps the structure and parser keywords in English.
   * Returns null when unavailable (no API key, AI error).
   */
  async localizeEggTemplate(templateContent, description) {
    if (!isAIConfigured(this.plugin.settings))
      return null;
    try {
      const prompt = renderPrompt(this.getPrompt("localizeEgg"), {
        description,
        template: templateContent
      });
      const maxTokens = Math.max(8192, this.plugin?.settings?.contentAnalysisMaxTokens || 8192);
      const response = await this.callAI(prompt, maxTokens);
      let text = response.trim();
      text = text.replace(/^```[a-z]*\s*\n/i, "").replace(/\n```$/g, "").trim();
      if (text.includes("[!abstract]") && text.includes("**Scope:**") && text.includes("**Action Guide:**") && text.includes("# Knowledge") && text.includes("# Unprocessed")) {
        const language = extractEggLanguage(text);
        return { content: text, language };
      }
      return null;
    } catch (err) {
      console.warn("[NutEgg] AI egg template localization failed:", err);
      return null;
    }
  }
  // --- Chunking ---
  /**
   * Split content into ≤chunkWindowChars parts. Timestamped transcripts
   * (YouTube) are split at caption lines and chapters are attached to the
   * chunk covering their start time; plain text is split at paragraphs.
   */
  chunkContent(content, chapters) {
    const lines = content.split("\n");
    const firstTsIdx = lines.findIndex((l) => this.lineSeconds(l) !== null);
    if (firstTsIdx !== -1) {
      return this.timestampedChunks(lines, firstTsIdx, chapters);
    }
    const chunkSize = this.chunkWindowChars;
    if (content.length <= chunkSize) {
      return [
        { index: 0, total: 1, content, chapters, startTime: "", sections: [] }
      ];
    }
    return this.paragraphChunks(content, chapters);
  }
  paragraphChunks(content, chapters) {
    const chunkSize = this.chunkWindowChars;
    const paras = content.split(/\n\n+/);
    const chunks = [];
    let buf = [];
    let bufChars = 0;
    const flush = () => {
      if (!buf.length)
        return;
      chunks.push({ index: 0, total: 0, content: buf.join("\n\n"), chapters: [], startTime: "", sections: [] });
      buf = [];
      bufChars = 0;
    };
    for (const p of paras) {
      if (p.length > chunkSize) {
        flush();
        for (let i = 0; i < p.length; i += chunkSize) {
          chunks.push({
            index: 0,
            total: 0,
            content: p.slice(i, i + chunkSize),
            chapters: [],
            startTime: "",
            sections: []
          });
        }
        continue;
      }
      if (bufChars + p.length > chunkSize)
        flush();
      buf.push(p);
      bufChars += p.length + 2;
    }
    flush();
    if (chunks.length === 0) {
      chunks.push({ index: 0, total: 1, content, chapters, startTime: "", sections: [] });
    }
    chunks.forEach((c, i) => {
      c.index = i;
      c.total = chunks.length;
    });
    if (chunks.length === 1)
      chunks[0].chapters = chapters;
    return chunks;
  }
  timestampedChunks(lines, firstTsIdx, chapters) {
    const preambleLines = lines.slice(0, firstTsIdx);
    const filteredPreamble = [];
    let inChaptersSection = false;
    for (const line of preambleLines) {
      if (line.trim().startsWith("## Chapters")) {
        inChaptersSection = true;
        continue;
      }
      if (inChaptersSection && line.trim().startsWith("#")) {
        inChaptersSection = false;
      }
      if (!inChaptersSection) {
        filteredPreamble.push(line);
      }
    }
    const cleanPreamble = filteredPreamble.join("\n").trim();
    const units = [];
    let lastCaptionSec = 0;
    for (let i = firstTsIdx; i < lines.length; i++) {
      const sec = this.lineSeconds(lines[i]);
      if (sec === null)
        continue;
      units.push({ sec, line: lines[i] });
      lastCaptionSec = Math.max(lastCaptionSec, sec);
    }
    const chunks = [];
    let buf = [];
    let bufChars = 0;
    let startSec = 0;
    const flush = () => {
      if (!buf.length)
        return;
      chunks.push({
        index: 0,
        total: 0,
        content: buf.join("\n"),
        chapters: [],
        startTime: this.formatSeconds(startSec),
        sections: []
      });
      buf = [];
      bufChars = 0;
    };
    const chunkSize = this.chunkWindowChars;
    for (const u of units) {
      if (bufChars + u.line.length > chunkSize)
        flush();
      if (!buf.length)
        startSec = u.sec;
      buf.push(u.line);
      bufChars += u.line.length + 1;
    }
    flush();
    if (chunks.length === 0) {
      return this.paragraphChunks(lines.join("\n"), chapters);
    }
    const starts = chunks.map((c) => this.toSeconds(c.startTime));
    for (const ch of chapters) {
      const t = this.toSeconds(ch.time);
      let idx = 0;
      for (let i = starts.length - 1; i >= 0; i--) {
        if (t >= starts[i]) {
          idx = i;
          break;
        }
      }
      chunks[idx].chapters.push(ch);
    }
    if (chapters.length === 0) {
      const begins = chunks.map((c) => this.toSeconds(c.startTime));
      for (let t = 0; t < lastCaptionSec + 1; t += this.sectionGridSeconds) {
        let idx = 0;
        for (let i = begins.length - 1; i >= 0; i--) {
          if (t >= begins[i]) {
            idx = i;
            break;
          }
        }
        chunks[idx].sections.push(this.formatSeconds(t));
      }
    }
    chunks.forEach((c, i) => {
      c.index = i;
      c.total = chunks.length;
      if (chunks.length === 1) {
        c.content = `${preambleLines.join("\n")}

${c.content}`;
      } else if (cleanPreamble) {
        c.content = `${cleanPreamble}

${c.content}`;
      }
    });
    return chunks;
  }
  /** `**Part:** i of N (from MM:SS)` label for per-part calls. */
  partNote(chunk) {
    const at = chunk.startTime ? ` (from ${chunk.startTime})` : "";
    return `**Part:** ${chunk.index + 1} of ${chunk.total}${at}`;
  }
  /** Seconds of a `[MM:SS]` / `[H:MM:SS]` caption line, or null. */
  lineSeconds(line) {
    const m = line.trim().match(/^\[(\d{1,2}:)?(\d{1,2}):(\d{2})\]/);
    if (!m)
      return null;
    const parts = m[0].slice(1, -1).split(":").map(Number);
    if (parts.length === 3)
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2)
      return parts[0] * 60 + parts[1];
    return null;
  }
  /** "MM:SS" / "H:MM:SS" → seconds (0 when unparseable). */
  toSeconds(time) {
    const parts = time.split(":").map(Number);
    if (parts.some((n) => Number.isNaN(n)))
      return 0;
    if (parts.length === 3)
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2)
      return parts[0] * 60 + parts[1];
    return 0;
  }
  /** Seconds → "MM:SS" / "H:MM:SS". */
  formatSeconds(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor(sec % 3600 / 60);
    const s = Math.floor(sec % 60);
    const mm = String(m).padStart(2, "0");
    const ss = String(s).padStart(2, "0");
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  }
  /** Combine per-egg verdicts into one global read recommendation. */
  mergeVerdict(eggResults) {
    if (eggResults.length === 0) {
      return {
        shouldRead: true,
        shouldReadReason: "No matching egg found \u2014 review the summary above."
      };
    }
    const rejectedAll = eggResults.every((r) => r.rejected);
    if (rejectedAll) {
      return {
        shouldRead: false,
        shouldReadReason: eggResults.map((r) => r.rejectReason).filter(Boolean).join(" ") || "Rejected by all matched eggs."
      };
    }
    const forReading = eggResults.filter((r) => r.readVerdict);
    const reasons = forReading.map((r) => r.readVerdictReason).filter(Boolean);
    return {
      shouldRead: forReading.length > 0,
      shouldReadReason: reasons.join(" ") || (forReading.length > 0 ? "See key question answers and novel delta below." : "No new knowledge found \u2014 the summary above likely covers it.")
    };
  }
  /** No-API-key fallback: naive content summary, no egg analysis. */
  fallbackAnalysis(capture, eggs) {
    const firstSentence = capture.content.match(/^[^.!?]+[.!?]/)?.[0]?.trim() || capture.title;
    return {
      titleVerdict: firstSentence,
      coreSummary: [
        `Source: ${capture.title}`,
        "(Configure an API key in NutEgg settings for AI analysis)"
      ],
      isLongForm: false,
      chapterMap: [],
      customQuestionAnswers: (capture.questions || []).map((q) => ({
        question: q,
        answer: "No API key configured \u2014 cannot answer."
      })),
      shouldRead: true,
      shouldReadReason: "No API key configured \u2014 cannot analyze.",
      matchedEggs: eggs.map((e) => e.fileName),
      eggResults: [],
      newKnowledge: []
    };
  }
  /**
   * Answer follow-up questions after the initial analysis — one lightweight
   * call, grounded in the same content. Previous Q&A pairs are included as
   * context so the model can refer back instead of repeating answers.
   */
  async askFollowUp(capture, questions, priorQa = []) {
    if (questions.length === 0)
      return [];
    if (!isAIConfigured(this.plugin.settings)) {
      const msg = this.plugin.settings.aiProvider === "local" ? "Local LLM not configured \u2014 cannot answer." : "No API key configured \u2014 cannot answer.";
      return questions.map((q) => ({
        question: q,
        answer: msg
      }));
    }
    const priorBlock = priorQa.length > 0 ? `## Previous Questions & Answers (context \u2014 refer back instead of repeating)
${priorQa.map((qa) => `Q: ${qa.question}
A: ${qa.answer}`).join("\n")}` : "";
    const prompt = renderPrompt(this.getPrompt("followUp"), {
      title: capture.title,
      url: capture.url,
      source_type: capture.sourceType,
      prior_qa: priorBlock,
      content: this.truncate(capture.content, this.chunkWindowChars),
      questions: questions.map((q, i) => `${i + 1}. ${q}`).join("\n"),
      shared_output_rules: this.getContentOutputRules()
    });
    try {
      const response = await this.callAI(prompt, 2e3);
      const parsed = this.parseJson(response, "follow-up");
      const answers = this.parseKeyAnswers(parsed.answers);
      const byQuestion = new Map(answers.map((a) => [a.question, a]));
      return questions.map((q) => ({
        question: q,
        answer: byQuestion.get(q)?.answer || "No answer returned \u2014 please try again."
      }));
    } catch (err) {
      if (err instanceof AIError)
        throw err;
      console.error("[NutEgg] Follow-up question failed:", err);
      return questions.map((q) => ({
        question: q,
        answer: "Failed to answer \u2014 please try again."
      }));
    }
  }
  /**
   * Merge an egg's Unprocessed entries into its Knowledge tree on demand.
   * Merges whenever there is at least 1 unprocessed entry.
   */
  async mergeEgg(fileName) {
    const egg = await this.plugin.eggParser.readEgg(fileName);
    if (!egg)
      return null;
    const entries = this.plugin.eggParser.countUnprocessed(egg);
    if (entries === 0) {
      console.log(`[NutEgg] ${fileName} has no unprocessed entries to merge`);
      return null;
    }
    if (!isAIConfigured(this.plugin.settings)) {
      console.log(
        `[NutEgg] ${fileName} has ${entries} unprocessed entries \u2014 skipped merge (AI not configured)`
      );
      return null;
    }
    let fallbackDesc = "";
    if (!egg.language) {
      try {
        const indexContent = await this.plugin.indexReader.getIndexContent();
        const indexEntries = this.plugin.indexReader.parseIndexContent(indexContent);
        const indexEntry = indexEntries.find(
          (e) => e.fileName === fileName || e.fileName.endsWith("/" + fileName)
        );
        fallbackDesc = indexEntry?.description || "";
      } catch {
      }
    }
    const pluginSetting = this.plugin.settings?.contentOutputLanguage;
    const pluginLang = pluginSetting && pluginSetting !== "same-as-content" ? pluginSetting.trim() : "";
    const outputLanguage = egg.language || pluginLang || "the same language as this egg's existing knowledge";
    const prompt = renderPrompt(this.getPrompt("mergeUnprocessed"), {
      egg_file: fileName,
      output_language: outputLanguage,
      egg_description: outputLanguage,
      formatting_rules: egg.formattingRules || "(none)",
      knowledge_tree: egg.knowledge || "(empty)",
      unprocessed: egg.unprocessed,
      unprocessed_count: entries
    });
    try {
      const response = await this.callAI(prompt, 2e3);
      const parsed = this.parseJson(response, "merge-unprocessed");
      const knowledge = typeof parsed.knowledge === "string" ? parsed.knowledge.trim() : "";
      if (!knowledge) {
        console.warn(
          `[NutEgg] Merge for ${fileName} returned no knowledge \u2014 egg untouched`
        );
        return null;
      }
      const unprocessed = typeof parsed.unprocessed === "string" ? parsed.unprocessed.trim() : "";
      await this.plugin.eggParser.applyMerge(fileName, knowledge, unprocessed);
      console.log(`[NutEgg] Merged ${entries} unprocessed entries into ${fileName}`);
      return { egg: fileName, entries };
    } catch (err) {
      console.error(`[NutEgg] Merge failed for ${fileName}:`, err);
      return null;
    }
  }
  /**
   * Threshold-based merge helper (kept for backward compatibility and testing).
   */
  async maybeMergeEgg(fileName) {
    const egg = await this.plugin.eggParser.readEgg(fileName);
    if (!egg)
      return null;
    const entries = this.plugin.eggParser.countUnprocessed(egg);
    if (entries < MERGE_THRESHOLD)
      return null;
    return this.mergeEgg(fileName);
  }
  // --- Prompt building helpers ---
  /** `## Video Chapters (use these EXACT timestamps)` block, or "". */
  chaptersBlock(chapters) {
    if (!chapters?.length)
      return "";
    return `## Video Chapters (use these EXACT timestamps)
${chapters.map((c) => `- ${c.time} \u2014 ${c.title}`).join("\n")}`;
  }
  /** 5-minute section grid for videos without chapters, or "". */
  sectionsBlock(sections) {
    if (!sections?.length)
      return "";
    return `## Video Sections (one chapterMap entry per section, EXACT start time)
${sections.map((s) => `- [${s}]`).join("\n")}`;
  }
  /**
   * Guarantee the chapter map covers the whole video: when a section grid
   * was provided, keep one entry per section (the AI's title/summary for
   * matching times, blank for any section the model skipped).
   */
  completeChapterMap(parsed, sections) {
    if (!sections?.length)
      return parsed;
    const byTime = new Map(parsed.map((e) => [this.toSeconds(e.time), e]));
    return sections.map((s) => {
      const e = byTime.get(this.toSeconds(s));
      return { time: s, title: e?.title || "", summary: e?.summary || "" };
    });
  }
  /** Numbered questions block with a heading, or "". */
  questionsBlock(questions, heading) {
    if (!questions?.length)
      return "";
    return `## ${heading}
${questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`;
  }
  async callAI(prompt, maxTokens) {
    return await this.plugin.aiClient.chat(prompt, maxTokens);
  }
  /** Normalize a `[{question, answer}]` array from the AI response. */
  parseKeyAnswers(raw) {
    return Array.isArray(raw) ? raw.filter((qa) => qa && qa.question && qa.answer).map((qa) => ({
      question: String(qa.question),
      answer: String(qa.answer)
    })) : [];
  }
  /**
   * Parse an AI response that should be JSON, stripping markdown fences.
   * Sanitizes unescaped control characters (\n, \r, \t) in strings and
   * recovers partial/truncated JSON when responses are cut off mid-stream.
   * `context` names the prompt for diagnostics when parsing fails.
   */
  parseJson(response, context = "response") {
    let jsonStr = (response || "").trim();
    if (!jsonStr) {
      console.warn(`[NutEgg] Empty AI response received for (${context}).`);
      return {};
    }
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    } else if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }
    try {
      return JSON.parse(jsonStr);
    } catch {
    }
    const sanitized = sanitizeJsonString(jsonStr);
    try {
      return JSON.parse(sanitized);
    } catch {
    }
    const braceMatch = sanitized.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      try {
        return JSON.parse(braceMatch[0]);
      } catch {
      }
    }
    try {
      const target = braceMatch ? braceMatch[0].trim() : sanitized.trim();
      if (target.startsWith("{") && target.endsWith("}")) {
        const obj = Function("return (" + target + ")")();
        if (obj && typeof obj === "object" && !Array.isArray(obj)) {
          return obj;
        }
      }
    } catch {
    }
    const repaired = repairTruncatedJson(sanitized);
    if (repaired) {
      try {
        const res = JSON.parse(repaired);
        console.warn(`[NutEgg] Recovered truncated JSON response (${context})`);
        return res;
      } catch {
        try {
          const repTrim = repaired.trim();
          if (repTrim.startsWith("{") && repTrim.endsWith("}")) {
            const obj = Function("return (" + repTrim + ")")();
            if (obj && typeof obj === "object" && !Array.isArray(obj)) {
              console.warn(`[NutEgg] Recovered truncated JSON expression (${context})`);
              return obj;
            }
          }
        } catch {
        }
      }
    }
    console.warn(
      `[NutEgg] Failed to parse AI JSON response (${context}) [length=${jsonStr.length}]:`,
      jsonStr.slice(0, 500)
    );
    return {};
  }
  truncate(text, maxChars) {
    if (text.length <= maxChars)
      return text;
    return text.substring(0, maxChars) + "\n\n[...truncated]";
  }
};
function repairTruncatedJson(jsonStr) {
  const firstBrace = jsonStr.indexOf("{");
  if (firstBrace === -1)
    return null;
  let text = jsonStr.slice(firstBrace).trim();
  const stack = [];
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (c === "\\") {
        escaped = true;
      } else if (c === '"') {
        inString = false;
      }
      continue;
    }
    if (c === '"') {
      inString = true;
    } else if (c === "{" || c === "[") {
      stack.push(c);
    } else if (c === "}") {
      if (stack[stack.length - 1] === "{")
        stack.pop();
    } else if (c === "]") {
      if (stack[stack.length - 1] === "[")
        stack.pop();
    }
  }
  if (stack.length === 0 && !inString) {
    return text;
  }
  if (inString) {
    text += '"';
  }
  if (stack[stack.length - 1] === "{") {
    text = text.replace(/,?\s*"[^"]*"\s*:\s*$/, "");
    text = text.replace(/(?:\{|,)\s*"[^"]*"\s*$/, (m) => m.startsWith("{") ? "{" : "");
  }
  text = text.replace(/,\s*$/, "").trim();
  const finalStack = [];
  let inStr = false;
  let esc = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc)
        esc = false;
      else if (c === "\\")
        esc = true;
      else if (c === '"')
        inStr = false;
      continue;
    }
    if (c === '"')
      inStr = true;
    else if (c === "{" || c === "[")
      finalStack.push(c);
    else if (c === "}") {
      if (finalStack[finalStack.length - 1] === "{")
        finalStack.pop();
    } else if (c === "]") {
      if (finalStack[finalStack.length - 1] === "[")
        finalStack.pop();
    }
  }
  while (finalStack.length > 0) {
    const open = finalStack.pop();
    if (open === "{")
      text += "}";
    else if (open === "[")
      text += "]";
  }
  return text;
}
function sanitizeJsonString(str) {
  let result = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (inString) {
      if (escaped) {
        escaped = false;
        result += c;
      } else if (c === "\\") {
        escaped = true;
        result += c;
      } else if (c === '"') {
        inString = false;
        result += c;
      } else if (c === "\n") {
        result += "\\n";
      } else if (c === "\r") {
        result += "\\r";
      } else if (c === "	") {
        result += "\\t";
      } else if (c.charCodeAt(0) < 32) {
        result += "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0");
      } else {
        result += c;
      }
    } else {
      if (c === '"')
        inString = true;
      result += c;
    }
  }
  return result.replace(/,\s*([}\]])/g, "$1");
}

// src/knowledge-base.ts
var KnowledgeBase = class {
  plugin;
  constructor(plugin) {
    this.plugin = plugin;
  }
  /**
   * Save the captured content to the raw folder.
   * File naming: YYYY-MM-DD-HH-MM-Source-Author-title.md
   */
  async saveRaw(capture) {
    const folder = this.plugin.settings.rawFolder;
    await this.ensureFolder(folder);
    const safeTitle = this.sanitizeFileName(capture.title);
    const now = /* @__PURE__ */ new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const timestamp = [
      now.getFullYear(),
      pad(now.getMonth() + 1),
      pad(now.getDate()),
      pad(now.getHours()),
      pad(now.getMinutes())
    ].join("-");
    const source = this.sanitizeFileName(capture.sourceType);
    const publishedAt = capture.metadata?.published || "unknown";
    const savedAt = (/* @__PURE__ */ new Date()).toISOString();
    const author = capture.metadata?.author || capture.metadata?.channel || capture.metadata?.handle || "unknown";
    const safeAuthor = this.sanitizeFileName(author);
    const fileName = `${folder}/${timestamp}-${source}-${safeAuthor}-${safeTitle}.md`;
    const sourceUrl = capture.url;
    const processingResult = capture.processingResult;
    const timeEstimate = capture.metadata?.time_estimate_minutes || String(Math.max(1, Math.ceil((capture.content?.split(/\s+/)?.length || 0) / 200)));
    const summary = capture.summary || "";
    const eggFiles = capture.matchedEggs || [];
    const frontmatterLines = [
      "---",
      `source_url: "${this.escapeYaml(capture.url)}"`,
      `source_type: ${capture.sourceType}`,
      `published_at: "${publishedAt === "unknown" ? "unknown" : this.escapeYaml(publishedAt)}"`,
      `saved_at: "${savedAt}"`,
      `author: "${author === "unknown" ? "unknown" : this.escapeYaml(author)}"`,
      `processing_result: ${processingResult}`,
      `time_estimate_minutes: ${timeEstimate}`
    ];
    if (summary) {
      const escapedSummary = summary.replace(/"/g, '\\"').replace(/\n/g, "\\n");
      frontmatterLines.push(`summary: "${escapedSummary}"`);
    }
    if (eggFiles.length > 0) {
      frontmatterLines.push(`egg_files:`);
      for (const egg of eggFiles) {
        frontmatterLines.push(`  - ${egg}`);
      }
    }
    frontmatterLines.push(`tags: []`);
    if (capture.metadata) {
      const passthroughKeys = ["published", "author", "channel", "handle", "time_estimate_minutes"];
      for (const [key, value] of Object.entries(capture.metadata)) {
        if (!passthroughKeys.includes(key) && value) {
          frontmatterLines.push(`${key}: "${this.escapeYaml(value)}"`);
        }
      }
    }
    frontmatterLines.push("---");
    frontmatterLines.push("");
    frontmatterLines.push(`# ${capture.title}`);
    frontmatterLines.push("");
    frontmatterLines.push(`**Source:** ${capture.url}`);
    frontmatterLines.push("");
    frontmatterLines.push(capture.content);
    const noteContent = frontmatterLines.join("\n");
    await this.plugin.app.vault.create(fileName, noteContent);
    console.log(`[NutEgg] Saved raw: ${fileName}`);
    return fileName;
  }
  /**
   * Append new knowledge entries to each egg's Unprocessed section (insight +
   * examples from the AI, plus mechanical author/source lines). Entries are
   * merged into the Knowledge tree later, once 20+ accumulate per egg.
   */
  async appendKnowledge(newKnowledge, sourceTitle, sourceUrl, author) {
    const { EggParser: EggParser2 } = await Promise.resolve().then(() => (init_egg_parser(), egg_parser_exports));
    const eggParser = new EggParser2(this.plugin);
    for (const item of newKnowledge) {
      await eggParser.appendUnprocessed(
        item.egg,
        item.content,
        author,
        sourceTitle,
        sourceUrl
      );
    }
  }
  escapeYaml(value) {
    return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }
  async ensureFolder(folder) {
    const parts = folder.split("/");
    let currentPath = "";
    for (const part of parts) {
      currentPath += (currentPath ? "/" : "") + part;
      const exists = await this.plugin.app.vault.adapter.exists(currentPath);
      if (!exists) {
        await this.plugin.app.vault.createFolder(currentPath);
      }
    }
  }
  sanitizeFileName(name) {
    return name.replace(/[\\/:*?"<>|#^\[\]]/g, "").replace(/\s+/g, "-").substring(0, 80);
  }
};

// src/index-reader.ts
var IndexReader = class {
  plugin;
  constructor(plugin) {
    this.plugin = plugin;
  }
  /**
   * Parse _index.md and return all egg entries.
   * Each non-empty line should be in format: `file.md: description`
   * Lines starting with `#` are comments, skipped.
   */
  async getIndex() {
    const indexPath = this.plugin.settings.indexFile;
    const file = this.plugin.app.vault.getAbstractFileByPath(indexPath);
    if (!file) {
      console.warn(`[NutEgg] Index file not found: ${indexPath}`);
      return [];
    }
    const content = await this.plugin.app.vault.read(file);
    return this.parseIndexContent(content);
  }
  /**
   * Use AI to determine which egg files are relevant to the content.
   * Returns the matched index entries.
   */
  async matchEggs(content, index) {
    if (index.length === 0)
      return [];
    if (index.length === 1)
      return index;
    if (!isAIConfigured(this.plugin.settings)) {
      return [index[0]];
    }
    const indexText = index.map((e) => `- ${e.fileName}: ${e.description}`).join("\n");
    const promptTemplate = this.plugin.workflowManager?.getPrompt("eggRouting") || PROMPTS.eggRouting;
    const prompt = renderPrompt(promptTemplate, {
      title: content.title,
      url: content.url,
      content: this.truncate(content.content, 8e3),
      index: indexText
    });
    try {
      const response = await this.plugin.aiClient.chat(prompt, 800);
      return this.parseMatchedEggs(response, index);
    } catch (err) {
      console.warn("[NutEgg] Egg routing failed, falling back to all index entries:", err);
      return index;
    }
  }
  /**
   * Parse matching egg files from the AI routing response.
   * Tolerates JSON arrays, bullet points (- / *), numbering, backticks,
   * quotes, path prefixes (nutegg/file.md vs file.md), and conversational text.
   */
  parseMatchedEggs(response, index) {
    if (!response || !response.trim() || index.length === 0)
      return [];
    const text = response.trim();
    const isExplicitNone = /^\s*(\[\]|none|no\s+match|no\s+matching\s+eggs?)\.?\s*$/i.test(text);
    const entryMap = /* @__PURE__ */ new Map();
    for (const entry of index) {
      const full = entry.fileName.trim().toLowerCase();
      const base = entry.fileName.split("/").pop().trim().toLowerCase();
      const stem = base.replace(/\.md$/, "");
      entryMap.set(entry, { full, base, stem });
    }
    const matchedEntries = /* @__PURE__ */ new Set();
    const jsonMatch = text.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            const str = String(item).trim().toLowerCase();
            for (const [entry, names] of entryMap.entries()) {
              if (str === names.full || str === names.base || str.endsWith("/" + names.base)) {
                matchedEntries.add(entry);
              }
            }
          }
        }
      } catch {
      }
    }
    const mdMatches = text.match(/[\w\-./\\]+\.md\b/gi) || [];
    for (const rawMatch of mdMatches) {
      const clean = rawMatch.replace(/^[\\/]+/, "").trim().toLowerCase();
      for (const [entry, names] of entryMap.entries()) {
        if (clean === names.full || clean === names.base || clean.endsWith("/" + names.base)) {
          matchedEntries.add(entry);
        }
      }
    }
    const lines = text.split("\n");
    for (const rawLine of lines) {
      let line = rawLine.trim();
      if (!line)
        continue;
      line = line.replace(/^```[a-z]*\s*/i, "").replace(/```$/, "").replace(/^[\s*\-•+]+/, "").replace(/^\d+[.)]\s*/, "").replace(/^[`"']+|[`"']+$/g, "").replace(/[.:;,!?]+$/, "").trim().toLowerCase();
      if (!line)
        continue;
      for (const [entry, names] of entryMap.entries()) {
        if (line === names.full || line === names.base || line.endsWith("/" + names.base)) {
          matchedEntries.add(entry);
        }
      }
    }
    if (matchedEntries.size === 0 && !isExplicitNone) {
      for (const [entry, names] of entryMap.entries()) {
        const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const basePattern = new RegExp(`(^|[^a-z0-9_-])${escapeRegExp(names.base)}($|[^a-z0-9_-])`, "i");
        const fullPattern = new RegExp(`(^|[^a-z0-9_-])${escapeRegExp(names.full)}($|[^a-z0-9_-])`, "i");
        if (basePattern.test(text) || fullPattern.test(text)) {
          matchedEntries.add(entry);
        }
      }
    }
    return Array.from(matchedEntries);
  }
  /**
   * Get the full content of _index.md as a string, for passing to the main analysis prompt.
   */
  async getIndexContent() {
    const indexPath = this.plugin.settings.indexFile;
    const file = this.plugin.app.vault.getAbstractFileByPath(indexPath);
    if (!file)
      return "(No _index.md found)";
    return await this.plugin.app.vault.read(file);
  }
  parseIndexContent(content) {
    const entries = [];
    for (const rawLine of content.split("\n")) {
      const trimmed = rawLine.trim();
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith(">"))
        continue;
      const line = trimmed.replace(/^[*\-+]\s+/, "");
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1)
        continue;
      const fileName = line.substring(0, colonIdx).trim();
      const description = line.substring(colonIdx + 1).trim();
      if (fileName.endsWith(".md")) {
        entries.push({ fileName, description });
      }
    }
    return entries;
  }
  truncate(text, maxChars) {
    if (text.length <= maxChars)
      return text;
    return text.substring(0, maxChars) + "\n\n[...truncated]";
  }
};

// src/main.ts
init_egg_parser();

// src/db.ts
function loadSqliteModule() {
  try {
    return require("node:sqlite").DatabaseSync;
  } catch (err) {
    return null;
  }
}
var NutEggDatabase = class {
  plugin;
  db = null;
  /** Tokenized corpus cache for search — invalidated on upsert. */
  corpusCache = null;
  get available() {
    return this.db !== null;
  }
  constructor(plugin) {
    this.plugin = plugin;
  }
  /** Database file inside the vault: `nutegg/.nutegg.db`. */
  get dbPath() {
    return `${this.plugin.settings.rawFolder}/../.nutegg.db`;
  }
  /** Open the DB and create schema. Never throws — see `available`. */
  async init() {
    try {
      const DatabaseSync = loadSqliteModule();
      if (!DatabaseSync) {
        throw new Error("node:sqlite is not available in this Obsidian version");
      }
      await this.ensureFolder(this.dbPath.split("/").slice(0, -1).join("/"));
      const basePath = this.plugin.app.vault.adapter.getBasePath();
      this.db = new DatabaseSync(`${basePath}/${this.dbPath}`);
      this.db.exec("PRAGMA journal_mode = DELETE;");
      this.createSchema();
      console.log("[NutEgg] SQLite database ready:", this.dbPath);
    } catch (err) {
      console.error(
        "[NutEgg] SQLite unavailable \u2014 dedup cache, replay and search disabled:",
        err
      );
      this.db = null;
    }
  }
  close() {
    try {
      this.db?.close();
    } catch {
    }
    this.db = null;
  }
  // --- Schema ---
  createSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS nuts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        source_type TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        saved_at TEXT NOT NULL,
        published_at TEXT,
        author TEXT,
        time_estimate_minutes REAL NOT NULL DEFAULT 0,
        processing_result TEXT NOT NULL DEFAULT 'unprocessed',
        summary TEXT,
        matched_eggs TEXT,
        file_name TEXT,
        analysis_result TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_nuts_url ON nuts(url);
    `);
  }
  // --- Nuts ---
  /**
   * Insert a NEW capture row. URLs are versioned — each analysis is its own
   * record; re-analyzing never overwrites earlier captures.
   */
  insertNut(row) {
    if (!this.db)
      return null;
    this.corpusCache = null;
    try {
      const res = this.db.prepare(
        `INSERT INTO nuts (url, title, source_type, content, saved_at, published_at, author,
             time_estimate_minutes, processing_result, summary, matched_eggs, file_name, analysis_result)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        row.url,
        row.title,
        row.sourceType,
        row.content,
        row.savedAt,
        row.publishedAt || null,
        row.author || null,
        row.timeEstimateMinutes,
        row.processingResult,
        row.summary || null,
        JSON.stringify(row.matchedEggs),
        row.fileName || null,
        row.analysisResult ? JSON.stringify(row.analysisResult) : null
      );
      return Number(res.lastInsertRowid);
    } catch (err) {
      console.error("[NutEgg] insertNut failed:", err);
      return null;
    }
  }
  /** Latest capture of a URL (newest first history entry). */
  getNutByUrl(url) {
    if (!this.db)
      return null;
    const row = this.db.prepare("SELECT * FROM nuts WHERE url = ? ORDER BY id DESC LIMIT 1").get(url);
    return row ? this.mapRow(row) : null;
  }
  /** All captures of a URL, newest first. */
  getNutHistory(url) {
    if (!this.db)
      return [];
    const rows = this.db.prepare("SELECT * FROM nuts WHERE url = ? ORDER BY id DESC").all(url);
    return rows.map((r) => this.mapRow(r));
  }
  /** Captures of a URL matching a LIKE pattern (e.g. YouTube video ID or status ID). */
  getNutHistoryByPattern(pattern) {
    if (!this.db)
      return [];
    const rows = this.db.prepare("SELECT * FROM nuts WHERE url LIKE ? ORDER BY id DESC").all(pattern);
    return rows.map((r) => this.mapRow(r));
  }
  getNutById(id) {
    if (!this.db)
      return null;
    const row = this.db.prepare("SELECT * FROM nuts WHERE id = ?").get(id);
    return row ? this.mapRow(row) : null;
  }
  /** Update the save state of one capture row (called by /confirm). */
  updateNut(id, patch) {
    if (!this.db)
      return;
    this.corpusCache = null;
    const sets = [];
    const params = [];
    if (patch.processingResult) {
      sets.push("processing_result = ?");
      params.push(patch.processingResult);
    }
    if (patch.fileName !== void 0) {
      sets.push("file_name = ?");
      params.push(patch.fileName);
    }
    if (sets.length === 0)
      return;
    params.push(id);
    try {
      this.db.prepare(`UPDATE nuts SET ${sets.join(", ")} WHERE id = ?`).run(...params);
    } catch (err) {
      console.error("[NutEgg] updateNut failed:", err);
    }
  }
  /** Aggregate stats over the nuts table (RAG corpus size + time saved). */
  getStats() {
    if (!this.db)
      return { nuts: 0, timeSavedMinutes: 0 };
    const row = this.db.prepare(
      "SELECT COUNT(*) AS nuts, COALESCE(SUM(time_estimate_minutes), 0) AS timeSavedMinutes FROM nuts"
    ).get();
    return { nuts: row.nuts, timeSavedMinutes: row.timeSavedMinutes };
  }
  /** BM25 keyword retrieval over saved nuts, ranked, with text snippets. */
  search(query, limit = 10) {
    if (!this.db)
      return [];
    const qTerms = tokenize(query);
    if (qTerms.length === 0)
      return [];
    const docs = this.getCorpus();
    if (docs.length === 0)
      return [];
    const df = /* @__PURE__ */ new Map();
    for (const term of qTerms) {
      let count = 0;
      for (const doc of docs) {
        if (doc.termSet.has(term))
          count++;
      }
      df.set(term, count);
    }
    const n = docs.length;
    const scored = docs.map((doc) => {
      let score = 0;
      for (const term of qTerms) {
        const dft = df.get(term) || 0;
        if (dft === 0)
          continue;
        const idf = Math.log((n - dft + 0.5) / (dft + 0.5) + 1);
        let tf = 0;
        for (const t of doc.tokens) {
          if (t === term)
            tf++;
        }
        score += idf * tf;
      }
      return { title: doc.title, url: doc.url, score, text: doc.text };
    }).filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
    return scored.map((s) => ({
      title: s.title,
      url: s.url,
      snippet: makeSnippet(s.text, qTerms)
    }));
  }
  getCorpus() {
    if (this.corpusCache)
      return this.corpusCache;
    const rows = this.db.prepare("SELECT title, url, summary, content FROM nuts").all();
    this.corpusCache = rows.map((r) => {
      const text = `${r.title}
${r.summary || ""}
${r.content || ""}`;
      const tokens = tokenize(text);
      return { title: r.title, url: r.url, text, tokens, termSet: new Set(tokens) };
    });
    return this.corpusCache;
  }
  // --- Helpers ---
  mapRow(row) {
    let matchedEggs = [];
    try {
      matchedEggs = row.matched_eggs ? JSON.parse(row.matched_eggs) : [];
    } catch {
    }
    let analysisResult = null;
    try {
      analysisResult = row.analysis_result ? JSON.parse(row.analysis_result) : null;
    } catch {
    }
    return {
      id: row.id,
      url: row.url,
      title: row.title,
      sourceType: row.source_type,
      content: row.content,
      savedAt: row.saved_at,
      publishedAt: row.published_at || "",
      author: row.author || "",
      timeEstimateMinutes: row.time_estimate_minutes || 0,
      processingResult: row.processing_result || "unprocessed",
      summary: row.summary || "",
      matchedEggs,
      fileName: row.file_name || "",
      analysisResult
    };
  }
  async ensureFolder(folder) {
    const parts = folder.split("/");
    let cur = "";
    for (const part of parts) {
      cur += (cur ? "/" : "") + part;
      if (!await this.plugin.app.vault.adapter.exists(cur)) {
        await this.plugin.app.vault.createFolder(cur);
      }
    }
  }
};
function tokenize(text) {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 1);
}
function makeSnippet(text, terms) {
  const lower = text.toLowerCase();
  let idx = -1;
  for (const term of terms) {
    const i = lower.indexOf(term);
    if (i !== -1) {
      idx = i;
      break;
    }
  }
  if (idx === -1)
    return text.slice(0, 120);
  const start = Math.max(0, idx - 60);
  const end = Math.min(text.length, idx + 60);
  return (start > 0 ? "..." : "") + text.slice(start, end).replace(/\s+/g, " ").trim() + (end < text.length ? "..." : "");
}

// src/merge-widget.ts
var import_obsidian3 = require("obsidian");
var import_view = require("@codemirror/view");
function findInstructionTargetLine(docText) {
  const lines = docText.split("\n");
  const calloutStart = lines.findIndex(
    (l) => /^>\s*\[!\w+\]-?\s*(?:instructions?|scope)?/i.test(l.trim())
  );
  if (calloutStart !== -1) {
    let calloutEnd = calloutStart;
    for (let i = calloutStart + 1; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed.startsWith(">")) {
        calloutEnd = i;
      } else if (trimmed === "") {
        let moreCallout = false;
        for (let j = i + 1; j < Math.min(lines.length, i + 10); j++) {
          const nextTrimmed = lines[j].trim();
          if (nextTrimmed === "")
            continue;
          if (nextTrimmed.startsWith(">"))
            moreCallout = true;
          break;
        }
        if (moreCallout)
          continue;
        break;
      } else {
        break;
      }
    }
    return calloutEnd + 1;
  }
  const headingIdx = lines.findIndex(
    (l) => /^#+\s*instructions?\s*:?$/i.test(l.trim())
  );
  if (headingIdx !== -1) {
    return headingIdx + 1;
  }
  const unprocIdx = lines.findIndex((l) => /^#\s*Unprocessed\s*$/i.test(l.trim()));
  if (unprocIdx !== -1) {
    return unprocIdx + 1;
  }
  return null;
}
async function runMerge(plugin, filePath, currentDoc) {
  if (currentDoc !== null) {
    const file = plugin.app.vault.getAbstractFileByPath(filePath);
    if (file) {
      const disk = await plugin.app.vault.read(file);
      if (disk !== currentDoc) {
        await plugin.app.vault.modify(file, currentDoc);
        console.log(`[NutEgg] Saved unsaved edits in ${filePath} before merge`);
      }
    }
  }
  return plugin.aiProcessor.mergeEgg(filePath);
}
function appendCreditPill(plugin, targetBadge) {
  if (typeof plugin.aiClient?.checkCredit !== "function")
    return;
  const creditPill = document.createElement("span");
  creditPill.className = "nutegg-merge-credit";
  creditPill.style.opacity = "0.75";
  creditPill.style.marginLeft = "8px";
  creditPill.style.fontSize = "0.85em";
  plugin.aiClient.checkCredit(plugin.settings).then((credit) => {
    if (credit.hasBalance && credit.balanceFormatted) {
      creditPill.textContent = `\u2022 \u{1FA99} ${credit.providerLabel}: ${credit.balanceFormatted}`;
      creditPill.title = `NutEgg AI: ${credit.statusText}`;
      targetBadge.appendChild(creditPill);
    } else if (credit.providerLabel) {
      const label = plugin.settings.aiProvider === "openrouter" ? "OpenRouter" : credit.providerLabel;
      creditPill.textContent = `\u2022 \u{1FA99} ${label}`;
      creditPill.title = `NutEgg AI: ${credit.statusText}`;
      targetBadge.appendChild(creditPill);
    }
  }).catch(() => {
  });
}
function registerMergeWidget(plugin) {
  plugin.registerMarkdownPostProcessor(async (el, ctx) => {
    if (!ctx.sourcePath || ctx.sourcePath.includes("/_raw/") || ctx.sourcePath.endsWith("_index.md")) {
      return;
    }
    let targetElement = null;
    const callouts = el.querySelectorAll(".callout");
    for (let i = 0; i < callouts.length; i++) {
      const c = callouts[i];
      const title = c.querySelector(".callout-title, .callout-title-inner")?.textContent?.toLowerCase() || "";
      const type = c.getAttribute("data-callout")?.toLowerCase() || "";
      if (title.includes("instruction") || type === "abstract" || type === "info") {
        targetElement = c;
        break;
      }
    }
    if (!targetElement) {
      const headings = el.querySelectorAll("h1, h2, h3");
      for (let i = 0; i < headings.length; i++) {
        const h = headings[i];
        const text = h.textContent?.trim().toLowerCase() || "";
        if (text.startsWith("instruction") || text.includes("instruction")) {
          targetElement = h;
          break;
        }
      }
    }
    if (!targetElement) {
      const headings = el.querySelectorAll("h1, h2, h3");
      for (let i = 0; i < headings.length; i++) {
        const h = headings[i];
        const text = h.textContent?.trim().toLowerCase() || "";
        if (text === "unprocessed" || text.startsWith("unprocessed")) {
          targetElement = h;
          break;
        }
      }
    }
    if (!targetElement)
      return;
    if (targetElement.parentElement?.querySelector(".nutegg-merge-container")) {
      return;
    }
    const egg = await plugin.eggParser.readEgg(ctx.sourcePath);
    if (!egg)
      return;
    const count = plugin.eggParser.countUnprocessed(egg);
    const container = document.createElement("div");
    container.className = "nutegg-merge-container";
    const badge = document.createElement("div");
    badge.className = "nutegg-merge-badge";
    badge.textContent = count > 0 ? `\u{1F95A} ${count} unprocessed ${count === 1 ? "entry" : "entries"}` : "\u2705 Knowledge tree is up to date";
    appendCreditPill(plugin, badge);
    container.appendChild(badge);
    if (count > 0) {
      const button = document.createElement("button");
      button.className = "nutegg-merge-btn mod-cta";
      button.textContent = "\u26A1 Merge into Knowledge Tree";
      button.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (button.disabled)
          return;
        button.disabled = true;
        const originalText = button.textContent;
        button.textContent = "\u23F3 Merging with AI...";
        try {
          const result = await runMerge(plugin, ctx.sourcePath, null);
          if (result && result.entries > 0) {
            new import_obsidian3.Notice(`[NutEgg] Merged ${result.entries} entries into knowledge tree`);
            button.textContent = "\u2705 Merged!";
            badge.textContent = "\u2705 Knowledge tree is up to date";
            setTimeout(() => {
              button.remove();
            }, 2e3);
          } else {
            new import_obsidian3.Notice("[NutEgg] Merge returned no changes or failed. Check console.");
            button.disabled = false;
            button.textContent = originalText;
          }
        } catch (err) {
          console.error("[NutEgg] Merge button click failed:", err);
          new import_obsidian3.Notice(`[NutEgg] Merge failed: ${err instanceof Error ? err.message : String(err)}`);
          button.disabled = false;
          button.textContent = originalText;
        }
      });
      container.appendChild(button);
    }
    targetElement.insertAdjacentElement("afterend", container);
  });
}
var MergeButtonWidget = class extends import_view.WidgetType {
  constructor(plugin, view, filePath, count) {
    super();
    this.plugin = plugin;
    this.view = view;
    this.filePath = filePath;
    this.count = count;
  }
  toDOM() {
    const wrap = document.createElement("div");
    wrap.className = "nutegg-merge-container nutegg-merge-editor-widget";
    const badge = document.createElement("div");
    badge.className = "nutegg-merge-badge";
    badge.textContent = this.count > 0 ? `\u{1F95A} ${this.count} unprocessed ${this.count === 1 ? "entry" : "entries"}` : "\u2705 Knowledge tree is up to date";
    appendCreditPill(this.plugin, badge);
    wrap.appendChild(badge);
    if (this.count > 0) {
      const button = document.createElement("button");
      button.className = "nutegg-merge-btn mod-cta";
      button.textContent = "\u26A1 Merge into Knowledge Tree";
      button.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (button.disabled)
          return;
        button.disabled = true;
        const originalText = button.textContent;
        button.textContent = "\u23F3 Merging...";
        try {
          const result = await runMerge(
            this.plugin,
            this.filePath,
            this.view.state.doc.toString()
          );
          if (result && result.entries > 0) {
            new import_obsidian3.Notice(`[NutEgg] Merged ${result.entries} entries into knowledge tree`);
          } else {
            new import_obsidian3.Notice("[NutEgg] Merge returned no changes or failed. Check console.");
            button.disabled = false;
            button.textContent = originalText;
          }
        } catch (err) {
          console.error("[NutEgg] Editor merge failed:", err);
          new import_obsidian3.Notice(`[NutEgg] Merge failed: ${err instanceof Error ? err.message : String(err)}`);
          button.disabled = false;
          button.textContent = originalText;
        }
      });
      wrap.appendChild(button);
    }
    return wrap;
  }
};
var EggMergeEditorPlugin = class {
  constructor(plugin, view) {
    this.plugin = plugin;
    this.view = view;
    this.decorations = this.build();
  }
  decorations;
  /** Last built state — logged once per transition, not per keystroke. */
  lastState = "";
  update(update) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = this.build();
    }
  }
  /** The vault path of the file rendered by this editor view. */
  filePath() {
    for (const leaf of this.plugin.app.workspace.getLeavesOfType("markdown")) {
      if (leaf.view?.editor?.cm === this.view) {
        return leaf.view.file?.path || "";
      }
    }
    return this.plugin.app.workspace.getActiveFile()?.path || "";
  }
  build() {
    const docText = this.view.state.doc.toString();
    const lineNo = findInstructionTargetLine(docText);
    if (lineNo === null) {
      return this.logState("no-target", import_view.Decoration.none);
    }
    const egg = this.plugin.eggParser.parseEggFile(this.filePath(), docText);
    const count = this.plugin.eggParser.countUnprocessed(egg);
    const state = count === 0 ? "up-to-date" : `count-${count}`;
    const line = this.view.state.doc.line(lineNo);
    return this.logState(
      state,
      import_view.Decoration.set([
        import_view.Decoration.widget({
          widget: new MergeButtonWidget(this.plugin, this.view, this.filePath(), count),
          // CM block widgets can't come from plugins — an inline decoration
          // whose DOM displays as a block is the portable equivalent (the
          // CSS gives it width:100% so it sits on its own line).
          side: 1
        }).range(line.to)
      ])
    );
  }
  logState(state, decorations) {
    if (state !== this.lastState) {
      this.lastState = state;
      const detail = state === "no-target" ? "no instruction block or heading in this file" : state === "up-to-date" ? "0 entries \u2014 showing up-to-date badge" : `${state.replace("count-", "")} entries \u2014 showing merge button`;
      console.log(`[NutEgg] Editor merge widget (${this.filePath() || "?"}): ${detail}`);
    }
    return decorations;
  }
};
function mergeEditorExtension(plugin) {
  return import_view.ViewPlugin.fromClass(
    class extends EggMergeEditorPlugin {
      constructor(view) {
        super(plugin, view);
      }
    },
    // Required: fromClass only wires decorations into the editor when the
    // spec declares them — an instance `decorations` field alone is ignored.
    { decorations: (v) => v.decorations }
  );
}
function registerMergeEditorExtension(plugin) {
  plugin.registerEditorExtension(mergeEditorExtension(plugin));
}

// src/index-widget.ts
var import_obsidian4 = require("obsidian");
var import_view2 = require("@codemirror/view");
var CreateEggModal = class extends import_obsidian4.Modal {
  plugin;
  defaultName;
  defaultDescription;
  constructor(app, plugin, defaultName = "", defaultDescription = "") {
    super(app);
    this.plugin = plugin;
    this.defaultName = defaultName;
    this.defaultDescription = defaultDescription;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("nutegg-create-egg-modal");
    contentEl.createEl("h2", { text: "\u{1F423} Create New Egg" });
    const nameGroup = contentEl.createEl("div", {
      cls: "nutegg-modal-field-group"
    });
    nameGroup.style.marginBottom = "14px";
    nameGroup.createEl("label", {
      text: "Egg Name (file name):",
      cls: "nutegg-modal-label"
    }).style.cssText = "display: block; font-weight: 600; margin-bottom: 4px;";
    const nameInput = nameGroup.createEl("input", {
      type: "text",
      value: this.defaultName,
      placeholder: "e.g. methodology, invest_strategy, \u65B9\u6CD5\u8BBA..."
    });
    nameInput.style.cssText = "width: 100%; box-sizing: border-box; padding: 6px 10px;";
    const descGroup = contentEl.createEl("div", {
      cls: "nutegg-modal-field-group"
    });
    descGroup.style.marginBottom = "10px";
    descGroup.createEl("label", {
      text: "Description (scope of what it covers):",
      cls: "nutegg-modal-label"
    }).style.cssText = "display: block; font-weight: 600; margin-bottom: 4px;";
    const descInput = descGroup.createEl("textarea", {
      placeholder: "e.g. \u4ECB\u7ECD\u505A\u4E8B\u7684\u5177\u4F53\u65B9\u6CD5 / practical methods and tactics..."
    });
    descInput.value = this.defaultDescription;
    descInput.rows = 3;
    descInput.style.cssText = "width: 100%; box-sizing: border-box; padding: 6px 10px; resize: vertical;";
    const hint = contentEl.createEl("p", {
      cls: "nutegg-modal-hint",
      text: "\u{1F310} Language of instructions and knowledge output will match the description language."
    });
    hint.style.cssText = "font-size: 0.85em; opacity: 0.75; margin: 4px 0 10px 0;";
    const btnRow = contentEl.createEl("div", {
      cls: "nutegg-modal-buttons"
    });
    btnRow.style.cssText = "display: flex; justify-content: flex-end; gap: 8px;";
    const cancelBtn = btnRow.createEl("button", { text: "Cancel" });
    cancelBtn.addEventListener("click", () => this.close());
    const submitBtn = btnRow.createEl("button", {
      cls: "mod-cta",
      text: "Create Egg"
    });
    const submit = async () => {
      const safeName = sanitizeEggName(nameInput.value);
      const description = descInput.value.trim();
      if (!safeName) {
        new import_obsidian4.Notice("NutEgg: Please enter a valid egg name.");
        nameInput.focus();
        return;
      }
      submitBtn.disabled = true;
      cancelBtn.disabled = true;
      const originalText = submitBtn.textContent;
      submitBtn.textContent = "\u23F3 Creating egg...";
      try {
        const result = await this.plugin.indexSync.createEgg(
          safeName,
          description
        );
        this.close();
        const detected = result.language;
        const currentSetting = this.plugin.settings.contentOutputLanguage || "same-as-content";
        const isDifferent = detected && detected.toLowerCase() !== currentSetting.toLowerCase() && !(currentSetting === "same-as-content" && detected.toLowerCase() === "english");
        if (isDifferent) {
          const notice = new import_obsidian4.Notice("", 8e3);
          const frag = notice.noticeEl.createDiv();
          frag.createSpan({
            text: `NutEgg: Created ${result.path} (${detected}). `
          });
          const switchBtn = frag.createEl("button", {
            text: `Set Content Language to ${detected}`
          });
          switchBtn.style.cssText = "margin-left: 6px; padding: 2px 6px; font-size: 0.85em;";
          switchBtn.addEventListener("click", async () => {
            this.plugin.settings.contentOutputLanguage = detected;
            await this.plugin.saveSettings();
            notice.hide();
            new import_obsidian4.Notice(
              `NutEgg: Content analysis output language set to ${detected}`
            );
          });
        } else if (result.alreadyExists) {
          new import_obsidian4.Notice(`NutEgg: ${result.path} already exists.`);
        } else {
          new import_obsidian4.Notice(`NutEgg: Created ${result.path}`);
        }
        const file = this.app.vault.getAbstractFileByPath(result.path);
        if (file) {
          const leaf = this.app.workspace.getLeaf(false);
          await leaf.openFile(file);
        }
      } catch (err) {
        console.error("[NutEgg] Failed to create egg from modal:", err);
        new import_obsidian4.Notice(
          `NutEgg: Failed to create egg: ${err instanceof Error ? err.message : String(err)}`
        );
        submitBtn.disabled = false;
        cancelBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    };
    submitBtn.addEventListener("click", submit);
    nameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        descInput.focus();
      }
    });
    setTimeout(() => nameInput.focus(), 50);
  }
};
function renderSyncButton(plugin, container) {
  const btn = container.createEl("button", {
    cls: "nutegg-sync-btn",
    text: "Checking..."
  });
  btn.style.cssText = "display: inline-flex; align-items: center; gap: 4px; font-size: 0.85em; padding: 4px 10px; cursor: pointer;";
  const update = async () => {
    try {
      const status = await plugin.indexSync.getDiffStatus();
      if (status.totalDiffs === 0) {
        btn.textContent = "\u2713 In Sync";
        btn.className = "nutegg-sync-btn mod-muted";
        btn.title = "Everything is in sync. Click to re-check.";
      } else {
        const details = [];
        if (status.missingEggs.length) {
          details.push(`${status.missingEggs.length} missing egg file(s)`);
        }
        if (status.unindexedEggs.length) {
          details.push(`${status.unindexedEggs.length} unindexed egg note(s)`);
        }
        if (status.invalidEntries.length) {
          details.push(`${status.invalidEntries.length} invalid entry(ies)`);
        }
        btn.textContent = `\u{1F504} Sync (${status.totalDiffs} diff${status.totalDiffs > 1 ? "s" : ""})`;
        btn.className = "nutegg-sync-btn mod-warning";
        btn.title = `${details.join(", ")}. Click to sync.`;
      }
    } catch (err) {
      console.warn("[NutEgg] Failed to get index diff status:", err);
    }
  };
  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const originalText = btn.textContent;
    btn.textContent = "Syncing...";
    btn.disabled = true;
    try {
      const res = await plugin.indexSync.sync();
      const parts = [];
      if (res.createdEggs.length) {
        parts.push(`+${res.createdEggs.length} egg(s) created`);
      }
      if (res.addedIndexEntries.length) {
        parts.push(`+${res.addedIndexEntries.length} entry(ies) added`);
      }
      if (res.prunedIndexEntries.length) {
        parts.push(`-${res.prunedIndexEntries.length} invalid pruned`);
      }
      if (res.fixedIndexPaths.length) {
        parts.push(`${res.fixedIndexPaths.length} path(s) normalized`);
      }
      if (parts.length > 0) {
        new import_obsidian4.Notice(`[NutEgg] Index synced: ${parts.join(", ")}`);
      } else {
        new import_obsidian4.Notice("[NutEgg] Everything is in sync.");
      }
      await update();
    } catch (err) {
      new import_obsidian4.Notice(`[NutEgg] Sync failed: ${err instanceof Error ? err.message : String(err)}`);
      btn.textContent = originalText;
    } finally {
      btn.disabled = false;
    }
  });
  plugin.indexSync.onDiffChanged(() => {
    update();
  });
  update();
  return btn;
}
function registerIndexWidget(plugin) {
  plugin.registerMarkdownPostProcessor(
    async (el, ctx) => {
      if (!ctx.sourcePath || !ctx.sourcePath.endsWith("_index.md") && ctx.sourcePath !== plugin.settings.indexFile) {
        return;
      }
      if (el.querySelector(".nutegg-index-action-bar"))
        return;
      const targetElement = el.querySelector(".callout") || el.querySelector("h1, h2") || el.firstElementChild;
      if (!targetElement)
        return;
      const bar = document.createElement("div");
      bar.className = "nutegg-index-action-bar";
      bar.style.cssText = "margin: 12px 0 16px 0; display: flex; align-items: center; gap: 8px;";
      const btn = document.createElement("button");
      btn.className = "nutegg-new-egg-btn mod-cta";
      btn.textContent = "\u{1F423} + New Egg";
      btn.title = "Create a new egg file and add to index";
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        new CreateEggModal(plugin.app, plugin).open();
      });
      bar.appendChild(btn);
      renderSyncButton(plugin, bar);
      targetElement.insertAdjacentElement("afterend", bar);
    }
  );
}
var IndexActionBarWidget = class extends import_view2.WidgetType {
  constructor(plugin) {
    super();
    this.plugin = plugin;
  }
  toDOM() {
    const wrap = document.createElement("div");
    wrap.className = "nutegg-index-action-bar nutegg-index-editor-widget";
    wrap.style.cssText = "margin: 10px 0 14px 0; display: flex; align-items: center; gap: 8px; width: 100%;";
    const btn = document.createElement("button");
    btn.className = "nutegg-new-egg-btn mod-cta";
    btn.textContent = "\u{1F423} + New Egg";
    btn.title = "Create a new egg file and add to index";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      new CreateEggModal(this.plugin.app, this.plugin).open();
    });
    wrap.appendChild(btn);
    renderSyncButton(this.plugin, wrap);
    return wrap;
  }
};
var IndexActionBarEditorPlugin = class {
  constructor(plugin, view) {
    this.plugin = plugin;
    this.view = view;
    this.decorations = this.build();
  }
  decorations;
  update(update) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = this.build();
    }
  }
  isIndexFile() {
    let filePath = "";
    for (const leaf of this.plugin.app.workspace.getLeavesOfType("markdown")) {
      if (leaf.view?.editor?.cm === this.view) {
        filePath = leaf.view.file?.path || "";
        break;
      }
    }
    if (!filePath) {
      filePath = this.plugin.app.workspace.getActiveFile()?.path || "";
    }
    return filePath.endsWith("_index.md") || filePath === this.plugin.settings.indexFile;
  }
  build() {
    if (!this.isIndexFile()) {
      return import_view2.Decoration.none;
    }
    const doc = this.view.state.doc;
    const docText = doc.toString();
    const lines = docText.split("\n");
    let targetLineNo = 1;
    let inCallout = false;
    for (let i = 0; i < lines.length; i++) {
      const line2 = lines[i].trim();
      if (line2.startsWith(">")) {
        inCallout = true;
        targetLineNo = i + 1;
      } else if (inCallout) {
        break;
      } else if (line2.startsWith("#")) {
        targetLineNo = i + 1;
      }
    }
    const line = doc.line(Math.min(targetLineNo, doc.lines));
    return import_view2.Decoration.set([
      import_view2.Decoration.widget({
        widget: new IndexActionBarWidget(this.plugin),
        side: 1
      }).range(line.to)
    ]);
  }
};
function registerIndexEditorExtension(plugin) {
  plugin.registerEditorExtension(
    import_view2.ViewPlugin.fromClass(
      class extends IndexActionBarEditorPlugin {
        constructor(view) {
          super(plugin, view);
        }
      },
      {
        decorations: (v) => v.decorations
      }
    )
  );
}

// src/workflow-manager.ts
var import_obsidian5 = require("obsidian");

// src/workflow/README.md
var README_default = '# NutEgg AI Workflow & Prompt Reference\n\nWelcome to the **NutEgg Workflow Engine**. The files in this folder define the prompts, instructions, and schemas that power NutEgg\'s AI extraction and knowledge synthesis pipeline.\n\n- \u{1F310} **Chrome Extension:** [NutEgg on Chrome Web Store](https://chromewebstore.google.com/detail/nutegg/bmdmdiicembobejibggoeiahaonphcol)\n- \u{1F48E} **Obsidian Plugin:** [NutEgg on Obsidian Community Plugins](https://community.obsidian.md/plugins/nutegg)\n\n> [!TIP]\n> You can freely edit and customize any file in this directory to tailor NutEgg\'s analysis to your specific needs (e.g. changing the tone, adding domain-specific perspectives, or adjusting extraction depth).\n\n---\n\n## Architecture Overview\n\nNutEgg uses a **Two-Stage Analysis Architecture** designed for high precision, token efficiency, and user control. Rather than running a monolithic prompt, NutEgg separates broad content understanding from deep, egg-specific knowledge comparison.\n\n```\n                    \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510\n                    \u2502      Captured Web Content     \u2502\n                    \u2502   (Article / YouTube / Tweet) \u2502\n                    \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518\n                                    \u2502\n                                    \u25BC\n       ===========================================================\n       STAGE 1: Content Analysis & Summary-Based Egg Routing\n       ===========================================================\n                                    \u2502\n                         Is content >30k chars?\n                            \u251C\u2500\u2500 No  \u2500\u2500\u25BA [content-analysis.md]\n                            \u2514\u2500\u2500 Yes \u2500\u2500\u25BA Chunks + [aggregate-content.md]\n                                    \u2502\n                                    \u25BC\n                   Produces: Title Verdict, 3-Bullet Summary,\n                   Chapter Map, & Custom Question Answers\n                                    \u2502\n                                    \u25BC\n                           [egg-routing.md]\n           (Routes matched eggs from _index.md using the\n            concise Stage 1 summary instead of raw content)\n                                    \u2502\n                                    \u25BC\n       ===========================================================\n       INTERACTIVE CHOICE / EXECUTION MODE (Chrome Extension)\n       ===========================================================\n                                    \u2502\n                        Which mode is selected?\n                            \u2502\n            \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510\n            \u25BC                               \u25BC\n       [Fast Mode]                 [Confirm Eggs Mode]\n       Automatically proceeds      User reviews matched eggs:\n       to Stage 2 with all         \u251C\u2500\u2500 "Collect Nut Only" (skip Stage 2)\n       matched eggs.               \u2514\u2500\u2500 Add/remove eggs \u2500\u2500\u25BA Proceed\n            \u2502                               \u2502\n            \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518\n                            \u25BC\n       ===========================================================\n       STAGE 2: Per-Egg Knowledge Extraction & Novelty Comparison\n       ===========================================================\n                            \u2502\n               For each confirmed egg (1 or N):\n                            \u2502\n                            \u25BC\n                    [egg-analysis.md]\n              (Extract candidate knowledge entries\n               & key questions scoped to this egg)\n                            \u2502\n                            \u25BC\n                    [egg-compare.md]\n              (Diffs candidate entries against the\n               egg\'s existing # Knowledge tree to find\n               true novel insights & decide read verdict)\n                            \u2502\n                            \u25BC\n                 Results returned to Popup\n                 (Ready to Save Nut & Eggs)\n```\n\n> [!NOTE]\n> **Why Summary-Based Routing?**\n> Passing the Stage 1 summary to `egg-routing.md` instead of full raw articles or multi-hour video transcripts saves tens of thousands of tokens per capture and dramatically improves routing accuracy by focusing on distilled, high-signal semantic themes.\n\n---\n\n### Execution Modes\n\n| Mode | Behavior | Best Used For |\n|---|---|---|\n| **Fast Mode** | Runs Stage 1 content analysis, routes eggs automatically, and immediately executes Stage 2 knowledge comparison in one uninterrupted pass. | Everyday reading and quick captures when you trust automatic egg matching. |\n| **Confirm Eggs Mode** | Runs Stage 1 content analysis, then pauses in the popup. Shows matched eggs alongside your vault\'s full egg list. You can add/remove eggs, proceed with knowledge comparison, or click **Collect Nut Only** to save the note immediately without comparing against eggs. | Deep research, ambiguous topics, or when you only want a quick summary without updating egg knowledge trees. |\n\n---\n\n### Long Content (>30k Chars) Pipeline\n\nFor long articles, papers, or video transcripts (>30k characters), content is automatically split into timestamped or paragraph chunks (<=30k chars each) and aggregated in both stages:\n\n```\n  Captured Long Content \u2500\u2500\u25BA Split into Chunks (Part 1, Part 2, ... Part N)\n                                \u2502\n       \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510\n       \u25BC                                                 \u25BC\n  Stage 1: Content Summary                          Stage 2: Per-Egg Knowledge\n  Run [content-analysis.md]                         For each confirmed egg:\n  for each chunk                                    Run [egg-analysis.md] + [egg-compare.md]\n       \u2502                                            for each chunk\n       \u25BC                                                 \u2502\n  [aggregate-content.md]                                 \u25BC\n  Merges chunk summaries into ONE                   [aggregate-egg.md]\n  cohesive title verdict, 3-bullet                  Synthesizes cross-part findings\n  core summary, and custom Q&A.                     into unified novel delta, answers\n       \u2502                                            key questions, & read verdict.\n       \u25BC                                                 \u2502\n  [egg-routing.md]                                       \u2502\n  (Routes eggs via aggregated summary)                   \u2502\n       \u2502                                                 \u2502\n       \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518\n                                \u2502\n                                \u25BC\n                    Results returned to Popup\n```\n\n---\n\n### Other Workflows (Independent of Capture)\n\n```\n  User asks follow-up questions in Chrome popup\n     \u2514\u2500\u2500\u25BA [follow-up.md] (interactive Q&A, 1 AI call per batch)\n\n  Unprocessed entries accumulate in an egg note (20+ threshold or manual button)\n     \u2514\u2500\u2500\u25BA [merge-unprocessed.md] (merge into # Knowledge tree, 1 AI call)\n\n  User creates a new egg with a non-English description\n     \u2514\u2500\u2500\u25BA [localize-egg.md] (translate egg template, 1 AI call)\n```\n\n---\n\n## Prompt Dependency & Injection Map\n\nSome prompt files are **shared fragments** that are not executed independently, but are injected into other prompts via `{{placeholder}}` variables at runtime:\n\n```mermaid\nflowchart TD\n    subgraph Shared ["1. Shared Fragments (Injected via Placeholders)"]\n        direction TB\n        SOR["shared-output-rules.md<br/><i>(Grounding directive & output language)</i>"]\n        CTD["content-task-default.md<br/><i>(Default content analysis tasks)</i>"]\n    end\n\n    subgraph Capture ["2. Content Capture & Synthesis Pipeline"]\n        direction TB\n        CA["content-analysis.md<br/><i>(Stage 1: Content summary & Q&A)</i>"]\n        ROUT["egg-routing.md<br/><i>(Stage 1: Summary-based egg routing)</i>"]\n        EA["egg-analysis.md<br/><i>(Stage 2: Per-egg knowledge extraction)</i>"]\n        CMP["egg-compare.md<br/><i>(Stage 2: Knowledge tree diff)</i>"]\n        AC["aggregate-content.md<br/><i>(Stage 1 chunk aggregation)</i>"]\n        AE["aggregate-egg.md<br/><i>(Stage 2 chunk aggregation)</i>"]\n\n        CA --> ROUT\n        ROUT --> EA\n        EA --> CMP\n    end\n\n    subgraph Independent ["3. Independent Features"]\n        direction TB\n        FU["follow-up.md<br/><i>(Interactive popup Q&A)</i>"]\n        MU["merge-unprocessed.md<br/><i>(20+ entries knowledge merge)</i>"]\n        LOC["localize-egg.md<br/><i>(Translate new egg template)</i>"]\n        FU ~~~ MU ~~~ LOC\n    end\n\n    Shared ~~~ Capture\n    Capture ~~~ Independent\n\n    %% Injection connections\n    CTD -.->|"{{content_task_default}}"| CA\n    CTD -.->|"{{content_task_default}}"| AC\n\n    SOR -.->|"{{shared_output_rules}}"| CA\n    SOR -.->|"{{shared_output_rules}}"| EA\n    SOR -.->|"{{shared_output_rules}}"| CMP\n    SOR -.->|"{{shared_output_rules}}"| AC\n    SOR -.->|"{{shared_output_rules}}"| AE\n    SOR -.->|"{{shared_output_rules}}"| FU\n```\n\n---\n\n## Anatomy of an Egg File & How Instructions Work\n\nAn **Egg file** (`nutegg/*.md`) is both a curated knowledge repository and an instruction manual that guides NutEgg\'s AI pipeline whenever content touches that domain.\n\n### 1. Structural Blueprint\n\n```markdown\n---\ntopic: "AI Architecture & Multi-Agent Systems"\nstatus: "active"\nlast_updated: "2026-09-10"\nlanguage: "English"\n---\n\n> [!abstract]- Instructions:\n> **Scope:** Multi-agent architectures, tool calling, memory layers, and LLM evaluation.\n> **Action Guide:** Focus on actionable design patterns, scalability tradeoffs, and real failure modes.\n> **Key Questions:**\n> 1. How are agent memory loops bounded to prevent context window overflow?\n> 2. What coordination mechanism is used between subagents?\n> **Rejection Criteria:**\n> - Ignore basic beginner tutorials or high-level sales pitches without technical substance.\n> - Discard speculative claims lacking empirical benchmarks or code evidence.\n> **Formatting Rules:**\n> - Prefix each insight with a bracketed tag: `[concept]`, `[architecture]`, `[method]`, `[benchmark]`, `[explain]`, `[fact]`, `[example]`.\n> - Use the structure: `- [tag] **Concept Name**` followed by an indented explanation and concrete examples (`- \u{1F3AF} Example:`).\n\n# Knowledge\n## Agent Memory\n- [architecture] **Bounded Replay Buffers**\n    - Ephemeral short-term memory expires after session goals terminate to conserve token budget.\n    - \u{1F3AF} Example: Tool calling trace logs stored in vector stores with sliding window eviction.\n\n# Unprocessed\n(Newly hatched insights land here from captures until auto-merged)\n```\n\n### 2. How to Write Egg Instructions\n\nEach field in the `> [!abstract]- Instructions:` callout controls a specific behavior in the AI workflow:\n\n| Field | Purpose & Best Practices | Workflow Usage |\n|---|---|---|\n| **`**Scope:**`** | 1\u20132 sentences defining the topical boundaries of this egg. Specify what technologies, domains, or concepts are included and excluded. | Injected into [`egg-analysis.md`](./egg-analysis.md) (Stage 2) so the AI extracts knowledge through this domain lens. |\n| **`**Action Guide:**`** | 2-step instructions for Stage 2 egg analysis: Step 1 (Novel Delta: extract only genuinely new insights) and Step 2 (Decide: whether user should spend time reading). | Injected into [`egg-analysis.md`](./egg-analysis.md) and [`egg-compare.md`](./egg-compare.md) (Stage 2). |\n| **`**Key Questions:**`** | Numbered list of recurring questions you want answered whenever content touches this domain (e.g. *"What are the hidden tradeoffs?", "What is the token cost?"*). | Injected into [`egg-analysis.md`](./egg-analysis.md) (Stage 2). Answered in the popup and raw capture notes. |\n| **`**Rejection Criteria:**`** | Bulleted list of low-signal filters (e.g. *"Ignore beginner tutorials", "Reject speculative price talk"*). | Injected into [`egg-compare.md`](./egg-compare.md) (Stage 2). If matched, flags `rejected: true`, sets `readVerdict: false`, and gives a skip reason. |\n| **`**Formatting Rules:**`** | Standards for phrasing, tags (`[concept]`, `[architecture]`, `[method]`, etc.), and hierarchical indentation. | Injected into [`egg-analysis.md`](./egg-analysis.md) (Stage 2). Guarantees candidate entries match your notes\' formatting. |\n\n### 3. Knowledge Tree vs. Unprocessed Queue\n\n- **`# Knowledge` (Curated Knowledge Tree)**:\n  - Structured with markdown headings (`##`, `###`) and indented bullet points.\n  - Injected as `{{knowledge_tree}}` into [`egg-compare.md`](./egg-compare.md) (Stage 2). The AI compares extracted candidate insights against this tree to filter out redundant concepts and surface only true **Novel Delta**.\n- **`# Unprocessed` (Staging Queue)**:\n  - When you click **\u{1F95A} Hatch Egg** in the browser, fresh insights are safely appended to `# Unprocessed` first. This prevents AI runs from corrupting your curated knowledge tree.\n  - When 20+ entries accumulate (or when you click **Merge** in the Obsidian reading view widget), [`merge-unprocessed.md`](./merge-unprocessed.md) runs automatically to deduplicate and nest pending entries under appropriate parent concepts in `# Knowledge`.\n\n### 4. End-to-End Workflow Mapping\n\n```\n                                  [Captured Web Content]\n                                            \u2502\n               Stage 1: Content Analysis    \u25BC    _index.md (Topic routing guide)\n               \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n               \u2022 Uses content-task-default.md (fixed content tasks)\n               \u2022 Generates Title Verdict, 3-Bullet Summary, Chapter Map\n               \u2022 egg-routing.md matches egg descriptions via Stage 1 summary\n                                            \u2502\n                                            \u25BC\n               Interactive Review: User confirms or selects target eggs\n                                            \u2502\n               Stage 2: Per-Egg Deep Dive   \u25BC    Target Egg File (nutegg/*.md)\n               \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n               \u2022 Scope, Key Questions, Formatting Rules \u2500\u2500\u25BA egg-analysis.md\n                 (Extracts candidate knowledge entries and answers questions)\n               \u2022 Rejection Criteria, # Knowledge Tree \u2500\u2500\u25BA egg-compare.md\n                 (Diffs candidates against existing tree, drops redundant entries)\n                                            \u2502\n                                            \u25BC\n               Hatch Egg: Confirmed novel entries appended to # Unprocessed\n                                            \u2502\n               Merge Cycle (20+ entries or button click)\n               \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n               \u2022 merge-unprocessed.md nests and integrates entries into # Knowledge\n```\n\n---\n\n## Workflow File Directory\n\n### 1. Shared Fragments\n\nThese are **not standalone prompts** \u2014 they are modular snippets injected as `{{placeholders}}` into other prompts.\n\n| File | Injected As | Injected Into | Purpose |\n|---|---|---|---|\n| [`shared-output-rules.md`](./shared-output-rules.md) | `{{shared_output_rules}}` | `content-analysis`, `egg-analysis`, `egg-compare`, `aggregate-content`, `aggregate-egg`, `follow-up` | Combined grounding directive (content as sole truth) and multi-lingual output language reference rule. |\n| [`content-task-default.md`](./content-task-default.md) | `{{content_task_default}}` | `content-analysis`, `aggregate-content` | Default fixed tasks for content analysis: Title Verdict, 3-Bullet Core Summary, and Chapter Map. |\n\n### 2. Content Capture Pipeline\n\n| File | Pipeline Stage | Purpose | Output Format |\n|---|---|---|---|\n| [`content-analysis.md`](./content-analysis.md) | Stage 1: Content Analysis | Content-level summary: title verdict, 3-bullet summary, chapter map, and custom user question answers. | JSON (`titleVerdict`, `coreSummary`, `isLongForm`, `chapterMap`, `customQuestionAnswers`) |\n| [`egg-routing.md`](./egg-routing.md) | Stage 1: Summary-Based Routing | Matches the Stage 1 content summary against egg descriptions in `_index.md` to select matching eggs with minimal tokens. | Plain text list of filenames (one per line) |\n| [`egg-analysis.md`](./egg-analysis.md) | Stage 2: Egg Extraction | Per-egg extraction: candidate knowledge entries and key question answers scoped strictly to one egg\'s instructions. | JSON (`keyQuestionAnswers`, `extractedEntries`) |\n| [`egg-compare.md`](./egg-compare.md) | Stage 2: Knowledge Diff | Diffs candidate entries against the egg\'s existing `# Knowledge` tree and `# Unprocessed` to find novel insights and determine read verdict. | JSON (`novelDelta`, `redundantEntries`, `rejected`, `rejectReason`, `readVerdict`, `readVerdictReason`) |\n\n### 3. Long Content Aggregation\n\nUsed only when content exceeds ~30k characters (long articles, 1-2 hour videos). Each chunk is processed through extraction first, then these prompts synthesize the per-chunk results.\n\n| File | Pipeline Stage | Purpose | Output Format |\n|---|---|---|---|\n| [`aggregate-content.md`](./aggregate-content.md) | Stage 1 Aggregation | Merges per-chunk summaries into one cohesive title verdict, core summary, and user Q&A for the whole content. | JSON (`titleVerdict`, `coreSummary`, `customQuestionAnswers`) |\n| [`aggregate-egg.md`](./aggregate-egg.md) | Stage 2 Aggregation | Synthesizes per-chunk findings into unified knowledge entries, key question answers, and read verdict for each egg. | JSON (`novelDelta`, `keyQuestionAnswers`, `rejected`, `rejectReason`, `readVerdict`, `readVerdictReason`) |\n\n### 4. Independent Features\n\n| File | Trigger | Purpose | Output Format |\n|---|---|---|---|\n| [`follow-up.md`](./follow-up.md) | User asks questions in Chrome popup | Answers follow-up questions about the captured content with conversation history context. | JSON (`answers`: `[{"question", "answer"}]`) |\n| [`merge-unprocessed.md`](./merge-unprocessed.md) | Manual button or 20+ entries threshold | Deduplicates and nests accumulated `# Unprocessed` entries into the structured `# Knowledge` tree. | JSON (`knowledge`, `unprocessed`) |\n| [`localize-egg.md`](./localize-egg.md) | New egg with non-English description | Translates the egg template into the language of the egg\'s description while keeping parser-critical headings in English. | Full egg note (Markdown) |\n\n---\n\n## Customization Rules & Guidelines\n\n### \u2705 What You Can Safely Customize\n- **Tone and Perspective**: You can instruct the AI to be more critical, more technical, or focus on specific themes.\n- **Summary Depth**: You can change how concise or detailed summaries should be.\n- **Language / Idiom Preferences**: You can tweak phrasing, formatting preferences, or custom analytical lenses.\n- **Shared Output Rules**: Edit `shared-output-rules.md` to adjust how strictly the AI stays grounded to the source content or handles output languages across all prompts.\n\n### \u26A0\uFE0F What You Must Preserve (To Prevent Parser Errors)\n1. **`{{placeholders}}`**: The strings enclosed in double curly braces (e.g. `{{content}}`, `{{egg_description}}`, `{{knowledge_tree}}`) are replaced dynamically by the engine. Do not delete or rename them.\n2. **JSON Schemas**: Prompts that output JSON must keep the exact JSON key names specified in the template. The TypeScript engine parses these exact keys.\n3. **Markdown Structural Headings**: In prompts that output markdown (`localize-egg.md`), structural labels and headings like `# Knowledge` and `# Unprocessed` must remain verbatim in English for the note parser.\n\n---\n\n## Updates & Conflict Resolution\n\nWhen NutEgg updates to a newer version:\n- **If you haven\'t edited a workflow file**: The plugin automatically updates it to the latest version.\n- **If you have customized a workflow file**: NutEgg will **never overwrite your custom version**. Instead, it writes `[filename].new.md` alongside your file so you can inspect what changed in the update.\n- **Obsolete prompt cleanup**: Any unedited prompt files that were removed in a newer release of NutEgg are automatically pruned so your `_workflow/` folder stays clean.\n- **Use Defaults (Clean Reset)**: You can reset all workflow files back to factory defaults at any time from `Obsidian Settings \u2192 NutEgg \u2192 Use Default Workflow Prompts` by clicking **Use Defaults**. This safely moves all your existing files to a timestamped backup folder (`_workflow/_backup/<timestamp>/`), clears obsolete files, and restores clean built-in defaults.\n';

// src/workflow-manager.ts
var WORKFLOW_FILE_MAP = {
  contentAnalysis: "content-analysis.md",
  eggAnalysis: "egg-analysis.md",
  eggCompare: "egg-compare.md",
  followUp: "follow-up.md",
  eggRouting: "egg-routing.md",
  contentTaskDefault: "content-task-default.md",
  mergeUnprocessed: "merge-unprocessed.md",
  aggregateContent: "aggregate-content.md",
  aggregateEgg: "aggregate-egg.md",
  localizeEgg: "localize-egg.md",
  sharedOutputRules: "shared-output-rules.md"
};
var BUILTIN_WORKFLOW_FILES = {
  "README.md": README_default,
  "content-analysis.md": PROMPTS.contentAnalysis,
  "egg-analysis.md": PROMPTS.eggAnalysis,
  "egg-compare.md": PROMPTS.eggCompare,
  "follow-up.md": PROMPTS.followUp,
  "egg-routing.md": PROMPTS.eggRouting,
  "content-task-default.md": PROMPTS.contentTaskDefault,
  "merge-unprocessed.md": PROMPTS.mergeUnprocessed,
  "aggregate-content.md": PROMPTS.aggregateContent,
  "aggregate-egg.md": PROMPTS.aggregateEgg,
  "localize-egg.md": PROMPTS.localizeEgg,
  "shared-output-rules.md": PROMPTS.sharedOutputRules
};
function simpleHash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = hash * 33 ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}
var WorkflowManager = class {
  plugin;
  cache = /* @__PURE__ */ new Map();
  initialized = false;
  constructor(plugin) {
    this.plugin = plugin;
  }
  get workflowFolder() {
    if (this.plugin.settings?.workflowFolder) {
      return this.plugin.settings.workflowFolder;
    }
    const base = this.plugin.vaultFolder || "nutegg";
    return `${base}/_workflow`;
  }
  /** Initialize watcher, seed files, and load cache */
  async init() {
    if (!this.initialized && this.plugin.app?.vault?.on) {
      this.plugin.app.vault.on("modify", (file) => {
        this.onFileChanged(file);
      });
      this.plugin.app.vault.on("create", (file) => {
        this.onFileChanged(file);
      });
      this.plugin.app.vault.on("delete", (file) => {
        this.onFileDeleted(file);
      });
      this.initialized = true;
    }
    await this.ensureWorkflowFiles();
  }
  /**
   * Ensure the workflow folder and all built-in files exist in the vault.
   * Detects version updates non-destructively:
   * - Unmodified files are updated cleanly.
   * - User-customized files are preserved, and new versions are written as `*.new.md`.
   */
  async ensureWorkflowFiles() {
    const folder = this.workflowFolder;
    await this.ensureFolder(folder);
    if (!this.plugin.settings.workflowHashes) {
      this.plugin.settings.workflowHashes = {};
    }
    let settingsChanged = false;
    for (const [filename, builtinContent] of Object.entries(BUILTIN_WORKFLOW_FILES)) {
      const filePath = `${folder}/${filename}`;
      const builtinHash = simpleHash(builtinContent);
      let file = this.plugin.app.vault.getAbstractFileByPath(filePath);
      const existsOnDisk = await this.plugin.app.vault.adapter.exists(filePath);
      if (!file && !existsOnDisk) {
        try {
          await this.plugin.app.vault.create(filePath, builtinContent);
          this.cache.set(filename, builtinContent);
          this.plugin.settings.workflowHashes[filename] = builtinHash;
          settingsChanged = true;
          console.log(`[NutEgg] Seeded workflow file: ${filePath}`);
        } catch (err) {
          console.warn(`[NutEgg] Could not create ${filePath}:`, err);
        }
      } else {
        try {
          let vaultContent;
          if (file instanceof import_obsidian5.TFile) {
            vaultContent = await this.plugin.app.vault.read(file);
          } else {
            vaultContent = await this.plugin.app.vault.adapter.read(filePath);
          }
          this.cache.set(filename, vaultContent);
          const currentVaultHash = simpleHash(vaultContent);
          const recordedHash = this.plugin.settings.workflowHashes[filename];
          if (currentVaultHash === builtinHash) {
            if (recordedHash !== builtinHash) {
              this.plugin.settings.workflowHashes[filename] = builtinHash;
              settingsChanged = true;
            }
          } else if (recordedHash && recordedHash === currentVaultHash) {
            if (file instanceof import_obsidian5.TFile) {
              await this.plugin.app.vault.modify(file, builtinContent);
            } else {
              await this.plugin.app.vault.adapter.write(filePath, builtinContent);
            }
            this.cache.set(filename, builtinContent);
            this.plugin.settings.workflowHashes[filename] = builtinHash;
            settingsChanged = true;
            console.log(`[NutEgg] Auto-updated unmodified workflow file: ${filePath}`);
          } else if (!recordedHash) {
            this.plugin.settings.workflowHashes[filename] = currentVaultHash;
            settingsChanged = true;
          } else {
            const baseName = filename.replace(/\.md$/, "");
            const newPath = `${folder}/${baseName}.new.md`;
            const existingNew = this.plugin.app.vault.getAbstractFileByPath(newPath);
            const newExistsOnDisk = await this.plugin.app.vault.adapter.exists(newPath);
            if (!existingNew && !newExistsOnDisk) {
              try {
                await this.plugin.app.vault.create(newPath, builtinContent);
                console.log(`[NutEgg] Saved updated workflow template to: ${newPath}`);
                new import_obsidian5.Notice(
                  `[NutEgg] Workflow update available for ${filename}. Your custom file was preserved; see ${baseName}.new.md to compare.`,
                  8e3
                );
              } catch {
              }
            }
          }
        } catch (err) {
          console.warn(`[NutEgg] Error reading workflow file ${filePath}:`, err);
        }
      }
    }
    const localFiles = this.getWorkflowFiles();
    for (const file of localFiles) {
      const relName = file.path.slice(folder.length + 1);
      if (!(relName in BUILTIN_WORKFLOW_FILES) && !relName.endsWith(".new.md")) {
        const recordedHash = this.plugin.settings.workflowHashes[relName];
        if (recordedHash) {
          const content = await this.plugin.app.vault.read(file);
          if (simpleHash(content) === recordedHash) {
            await this.plugin.app.vault.delete(file);
            delete this.plugin.settings.workflowHashes[relName];
            this.cache.delete(relName);
            settingsChanged = true;
            console.log(`[NutEgg] Auto-removed obsolete unmodified workflow file: ${file.path}`);
          }
        }
      }
    }
    if (settingsChanged) {
      await this.plugin.saveSettings();
    }
  }
  /** Retrieve all workflow files in workflowFolder, excluding _backup/ */
  getWorkflowFiles() {
    const folder = this.workflowFolder;
    const vault = this.plugin.app.vault;
    let allFiles = [];
    if (typeof vault.getFiles === "function") {
      allFiles = vault.getFiles();
    } else if (typeof vault.getMarkdownFiles === "function") {
      allFiles = vault.getMarkdownFiles();
    }
    return allFiles.filter(
      (f) => f.path.startsWith(`${folder}/`) && !f.path.startsWith(`${folder}/_backup/`) && !f.path.endsWith("/_backup")
    );
  }
  /** Retrieve prompt text dynamically from vault cache, falling back to built-in */
  getPrompt(key) {
    const filename = WORKFLOW_FILE_MAP[key];
    if (!filename)
      return "";
    const cached = this.cache.get(filename);
    if (cached && cached.trim().length > 0) {
      return cached;
    }
    return BUILTIN_WORKFLOW_FILES[filename] || "";
  }
  /**
   * Reset workflow files to built-in defaults:
   * 1. Moves ALL current files in workflowFolder to a timestamped backup folder.
   * 2. Copies clean built-in prompt files into workflowFolder.
   * 3. Resets cache and workflow hashes.
   */
  async resetToDefaults() {
    const folder = this.workflowFolder;
    const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const backupFolder = `${folder}/_backup/${timestamp}`;
    await this.ensureFolder(backupFolder);
    const existingFiles = this.getWorkflowFiles();
    for (const file of existingFiles) {
      const relName = file.path.slice(folder.length + 1);
      const lastSlash = relName.lastIndexOf("/");
      if (lastSlash !== -1) {
        await this.ensureFolder(`${backupFolder}/${relName.slice(0, lastSlash)}`);
      }
      const content = await this.plugin.app.vault.read(file);
      await this.plugin.app.vault.create(`${backupFolder}/${relName}`, content);
      await this.plugin.app.vault.delete(file);
    }
    this.cache.clear();
    this.plugin.settings.workflowHashes = {};
    for (const [filename, builtinContent] of Object.entries(BUILTIN_WORKFLOW_FILES)) {
      const filePath = `${folder}/${filename}`;
      await this.plugin.app.vault.create(filePath, builtinContent);
      this.cache.set(filename, builtinContent);
      this.plugin.settings.workflowHashes[filename] = simpleHash(builtinContent);
    }
    await this.plugin.saveSettings();
    new import_obsidian5.Notice(`[NutEgg] Reset workflow files to defaults. Previous files moved to ${backupFolder}`);
  }
  /** Alias for backward compatibility */
  async syncToDefaults() {
    return this.resetToDefaults();
  }
  async onFileChanged(file) {
    if (!(file instanceof import_obsidian5.TFile) || !file.path.startsWith(this.workflowFolder)) {
      return;
    }
    const filename = file.name;
    if (filename in BUILTIN_WORKFLOW_FILES) {
      const content = await this.plugin.app.vault.read(file);
      this.cache.set(filename, content);
    }
  }
  onFileDeleted(file) {
    if (!file.path.startsWith(this.workflowFolder)) {
      return;
    }
    const parts = file.path.split("/");
    const filename = parts[parts.length - 1];
    if (this.cache.has(filename)) {
      this.cache.delete(filename);
    }
  }
  async ensureFolder(path) {
    const parts = path.split("/");
    let currentPath = "";
    for (const part of parts) {
      if (!part)
        continue;
      currentPath += (currentPath ? "/" : "") + part;
      try {
        const exists = await this.plugin.app.vault.adapter.exists(currentPath);
        if (!exists) {
          await this.plugin.app.vault.createFolder(currentPath);
        }
      } catch {
      }
    }
  }
};

// src/main.ts
var NutEggPlugin = class extends import_obsidian6.Plugin {
  aiClient;
  server;
  aiProcessor;
  knowledgeBase;
  indexReader;
  eggParser;
  indexSync;
  workflowManager;
  db;
  creditStatusBarItem = null;
  get vaultFolder() {
    return this.settings?.indexFile ? this.settings.indexFile.replace(/\/[^/]+$/, "") : "nutegg";
  }
  async onload() {
    await this.loadSettings();
    this.workflowManager = new WorkflowManager(this);
    this.aiClient = new AIClient(this.settings);
    this.aiProcessor = new AIProcessor(this);
    this.knowledgeBase = new KnowledgeBase(this);
    this.indexReader = new IndexReader(this);
    this.eggParser = new EggParser(this);
    this.indexSync = new IndexSync(this);
    this.indexSync.init();
    this.db = new NutEggDatabase(this);
    try {
      await this.db.init();
    } catch (err) {
      console.warn("[NutEgg] DB init warning:", err);
    }
    this.server = new NutEggServer(this, this.settings.serverPort);
    try {
      await this.server.start();
      new import_obsidian6.Notice(`NutEgg server started on port ${this.settings.serverPort}`);
    } catch (err) {
      console.error("[NutEgg] Failed to start server:", err);
      new import_obsidian6.Notice("NutEgg: Failed to start server. Check console for details.");
    }
    this.addSettingTab(new NutEggSettingTab(this.app, this));
    const runPostLayoutInit = async () => {
      try {
        await this.initializeVault();
      } catch (err) {
        console.error("[NutEgg] Vault initialization failed:", err);
      }
      try {
        await this.indexSync.checkAndFix();
      } catch (err) {
        console.error("[NutEgg] Index sync check failed:", err);
      }
      this.updateCreditStatusBar();
    };
    if (this.app?.workspace?.onLayoutReady) {
      this.app.workspace.onLayoutReady(runPostLayoutInit);
    } else {
      runPostLayoutInit();
    }
    this.addRibbonIcon("egg", "NutEgg: Open Index", async () => {
      const indexPath = this.settings.indexFile;
      const file = this.app.vault.getAbstractFileByPath(indexPath);
      if (file) {
        const leaf = this.app.workspace.getLeaf(false);
        await leaf.openFile(file);
      }
    });
    this.addRibbonIcon("coins", "NutEgg: Check AI Credit & Balance", async () => {
      await this.updateCreditStatusBar(true);
    });
    this.addCommand({
      id: "nutegg-new-egg",
      name: "Create a new egg file",
      callback: () => {
        new CreateEggModal(this.app, this).open();
      }
    });
    this.addCommand({
      id: "nutegg-open-index",
      name: "Open index file",
      callback: async () => {
        const indexPath = this.settings.indexFile;
        const file = this.app.vault.getAbstractFileByPath(indexPath);
        if (file) {
          const leaf = this.app.workspace.getLeaf(false);
          await leaf.openFile(file);
        } else {
          new import_obsidian6.Notice(`NutEgg: ${indexPath} not found. Click the egg icon to create it.`);
        }
      }
    });
    this.addCommand({
      id: "nutegg-merge-current-egg",
      name: "Merge unprocessed entries in current egg",
      callback: async () => {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
          new import_obsidian6.Notice("NutEgg: No active file");
          return;
        }
        if (!isEggPath(activeFile.path, this.vaultFolder)) {
          new import_obsidian6.Notice("NutEgg: Active file is not an egg note");
          return;
        }
        new import_obsidian6.Notice(`NutEgg: Merging unprocessed entries in ${activeFile.basename}...`);
        const activeView = this.app.workspace.getActiveViewOfType(import_obsidian6.MarkdownView);
        const cm = activeView?.editor?.cm;
        const docText = cm ? cm.state.doc.toString() : null;
        const result = await runMerge(this, activeFile.path, docText);
        if (result && result.entries > 0) {
          new import_obsidian6.Notice(`[NutEgg] Merged ${result.entries} entries into knowledge tree`);
        } else {
          new import_obsidian6.Notice("[NutEgg] No unprocessed entries to merge or merge failed.");
        }
      }
    });
    this.addCommand({
      id: "nutegg-check-credit",
      name: "Check AI provider credit & balance",
      callback: async () => {
        await this.updateCreditStatusBar(true);
      }
    });
    this.addCommand({
      id: "nutegg-use-default-workflow-prompts",
      name: "Use default workflow prompts (backup existing)",
      callback: async () => {
        await this.workflowManager.resetToDefaults();
      }
    });
    this.creditStatusBarItem = this.addStatusBarItem();
    this.creditStatusBarItem.addClass("nutegg-statusbar-credit");
    this.creditStatusBarItem.setText("\u{1FA99} NutEgg AI");
    this.creditStatusBarItem.addEventListener("click", () => {
      this.updateCreditStatusBar(true);
    });
    this.updateCreditStatusBar();
    this.registerInterval(
      window.setInterval(() => {
        this.updateCreditStatusBar();
      }, 10 * 60 * 1e3)
    );
    registerMergeWidget(this);
    registerMergeEditorExtension(this);
    registerIndexWidget(this);
    registerIndexEditorExtension(this);
    console.log("[NutEgg] Plugin loaded");
  }
  /**
   * Update the status bar credit item with live balance or status.
   */
  async updateCreditStatusBar(showNotice = false) {
    if (!this.creditStatusBarItem)
      return;
    try {
      const credit = await this.aiClient.checkCredit(this.settings);
      if (credit.hasBalance && credit.balanceFormatted) {
        this.creditStatusBarItem.setText(`\u{1FA99} ${credit.balanceFormatted}`);
        this.creditStatusBarItem.setAttribute(
          "aria-label",
          `NutEgg AI (${credit.providerLabel}): ${credit.statusText} (Click to refresh)`
        );
        if (showNotice) {
          new import_obsidian6.Notice(`[NutEgg] ${credit.providerLabel}: ${credit.statusText}`);
        }
      } else {
        const label = this.settings.aiProvider === "openrouter" ? "OpenRouter" : credit.providerLabel;
        this.creditStatusBarItem.setText(`\u{1FA99} ${label}`);
        this.creditStatusBarItem.setAttribute(
          "aria-label",
          `NutEgg AI: ${credit.statusText} (Click to refresh)`
        );
        if (showNotice) {
          new import_obsidian6.Notice(`[NutEgg] AI Provider: ${credit.statusText}`);
        }
      }
    } catch {
      this.creditStatusBarItem.setText("\u{1FA99} AI");
    }
  }
  async onunload() {
    await this.server.stop();
    this.db.close();
    console.log("[NutEgg] Plugin unloaded");
  }
  async loadSettings() {
    const data = await this.loadData() || {};
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  /**
   * Create the nutegg/ directory structure and boilerplate _index.md on first run.
   */
  async initializeVault() {
    try {
      await this.ensureFolder(this.vaultFolder);
      await this.ensureFolder(this.settings.rawFolder);
      await this.workflowManager.init();
      const indexPath = this.settings.indexFile;
      const existing = await this.app.vault.adapter.exists(indexPath);
      if (!existing) {
        await this.app.vault.create(indexPath, INDEX_TEMPLATE);
        console.log(`[NutEgg] Created ${indexPath}`);
        for (const { path, content } of EXAMPLE_EGGS) {
          if (!await this.app.vault.adapter.exists(path)) {
            try {
              await this.app.vault.create(path, content);
              console.log(`[NutEgg] Created ${path}`);
            } catch {
            }
          }
        }
      }
    } catch (err) {
      console.error("[NutEgg] Vault initialization error:", err);
    }
  }
  async ensureFolder(folder) {
    const parts = folder.split("/");
    let currentPath = "";
    for (const part of parts) {
      if (!part)
        continue;
      currentPath += (currentPath ? "/" : "") + part;
      try {
        const exists = await this.app.vault.adapter.exists(currentPath);
        if (!exists) {
          await this.app.vault.createFolder(currentPath);
        }
      } catch {
      }
    }
  }
};
