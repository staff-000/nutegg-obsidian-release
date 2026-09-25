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

// ../shared/src/egg-format.ts
function sanitizeEggName(name) {
  return String(name || "").trim().toLowerCase().replace(/[^\p{L}\p{N}_-]+/gu, "_").replace(/^_+|_+$/g, "").slice(0, 60);
}
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
function formatEggInstructionsForPrompt(egg) {
  const parts = [];
  parts.push(`**Scope:** ${egg.scope || "(not specified)"}`);
  if (egg.keyQuestions && egg.keyQuestions.length > 0) {
    parts.push(
      `**Key Questions:**
${egg.keyQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`
    );
  }
  if (egg.rejectionCriteria && egg.rejectionCriteria.length > 0) {
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
function formatEggKnowledgeForPrompt(egg) {
  const parts = [];
  parts.push(`**Current Knowledge:**
${egg.knowledge || "(empty)"}`);
  if (egg.unprocessed && egg.unprocessed.trim()) {
    parts.push(`**Unprocessed (pending merge):**
${egg.unprocessed}`);
  }
  return parts.join("\n\n");
}
function formatEggForPrompt(egg) {
  return [
    formatEggInstructionsForPrompt(egg),
    formatEggKnowledgeForPrompt(egg)
  ].join("\n\n");
}
function countUnprocessed(egg) {
  const indentOf = (l) => (l.match(/^\s*/) || [""])[0].length;
  const bullets = (egg.unprocessed || "").split("\n").map((l) => l.replace(/\s+$/, "")).filter((l) => /^\s*[-*]\s/.test(l));
  if (bullets.length === 0)
    return 0;
  const base = Math.min(...bullets.map(indentOf));
  return bullets.filter((l) => indentOf(l) === base).length;
}
var init_egg_format = __esm({
  "../shared/src/egg-format.ts"() {
  }
});

// ../shared/src/egg-parser.ts
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
function parseEggFile(fileName, content) {
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
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (fmMatch) {
    for (const line of fmMatch[1].split(/\r?\n/)) {
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
  const callout = extractCallout(content);
  const sections = callout ? splitLabeledSections(callout) : /* @__PURE__ */ new Map();
  result.scope = (sections.get("scope") || "").trim();
  result.actionGuide = (sections.get("action guide") || "").trim();
  result.keyQuestions = parseListItems(sections.get("key questions") || "");
  result.rejectionCriteria = parseListItems(sections.get("rejection criteria") || "");
  result.formattingRules = (sections.get("formatting rules") || "").trim();
  const lines = content.split(/\r?\n/);
  const knowledgeSection = findSection(lines, "knowledge");
  if (knowledgeSection) {
    result.knowledge = sectionBody(lines, knowledgeSection, "knowledge");
  }
  const unprocessedSection = findSection(lines, "unprocessed");
  if (unprocessedSection) {
    result.unprocessed = sectionBody(lines, unprocessedSection, "unprocessed");
  }
  return result;
}
function findSection(lines, name) {
  const wanted = name.toLowerCase();
  const start = lines.findIndex((l) => headingName(l) === wanted);
  if (start === -1)
    return null;
  let end = -1;
  if (wanted === "knowledge") {
    end = lines.findIndex(
      (l, i) => i > start && headingName(l) === "unprocessed"
    );
  }
  if (end === -1) {
    end = lines.findIndex((l, i) => {
      if (i <= start)
        return false;
      const head = headingName(l);
      return head !== null && head !== wanted;
    });
  }
  return { start, end: end === -1 ? lines.length : end };
}
function headingName(line) {
  const m = line.trim().match(/^#\s+(.+?)\s*#*\s*$/);
  if (!m)
    return null;
  return m[1].trim().toLowerCase();
}
function sectionBody(lines, section, name) {
  const body = lines.slice(section.start + 1, section.end);
  while (body.length > 0 && (body[0].trim() === "" || headingName(body[0]) === name.toLowerCase())) {
    body.shift();
  }
  return body.join("\n").replace(/\n+$/g, "");
}
function stripSectionHeading(body, name) {
  const lines = body.split("\n");
  const wanted = name.toLowerCase();
  while (lines.length > 0 && (lines[0].trim() === "" || headingName(lines[0]) === wanted)) {
    lines.shift();
  }
  return lines.join("\n").replace(/\s+$/g, "");
}
function extractCallout(content) {
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
function splitLabeledSections(text) {
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
function parseListItems(text) {
  return text.split("\n").map((l) => l.trim()).filter((l) => /^(?:\d+[.)]|[-*])\s+/.test(l)).map((l) => l.replace(/^(?:\d+[.)]|[-*])\s+/, ""));
}
var KNOWLEDGE_HEADING, UNPROCESSED_HEADING;
var init_egg_parser = __esm({
  "../shared/src/egg-parser.ts"() {
    init_egg_format();
    KNOWLEDGE_HEADING = "# Knowledge";
    UNPROCESSED_HEADING = "# Unprocessed";
  }
});

// src/egg-parser.ts
var egg_parser_exports = {};
__export(egg_parser_exports, {
  EggParser: () => EggParser,
  KNOWLEDGE_HEADING: () => KNOWLEDGE_HEADING,
  UNPROCESSED_HEADING: () => UNPROCESSED_HEADING,
  countUnprocessed: () => countUnprocessed,
  extractCallout: () => extractCallout,
  extractEggLanguage: () => extractEggLanguage,
  findSection: () => findSection,
  formatEggForPrompt: () => formatEggForPrompt,
  formatEggInstructionsForPrompt: () => formatEggInstructionsForPrompt,
  formatEggKnowledgeForPrompt: () => formatEggKnowledgeForPrompt,
  headingName: () => headingName,
  insertEggLanguage: () => insertEggLanguage,
  isEggPath: () => isEggPath,
  matchesEggFormat: () => matchesEggFormat,
  parseEggFile: () => parseEggFile,
  parseListItems: () => parseListItems,
  sanitizeEggName: () => sanitizeEggName,
  sectionBody: () => sectionBody,
  splitLabeledSections: () => splitLabeledSections,
  stripSectionHeading: () => stripSectionHeading
});
var EggParser;
var init_egg_parser2 = __esm({
  "src/egg-parser.ts"() {
    "use strict";
    init_egg_parser();
    init_egg_parser();
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
        return parseEggFile(fileName, content);
      }
      formatEggInstructionsForPrompt(egg) {
        return formatEggInstructionsForPrompt(egg);
      }
      formatEggKnowledgeForPrompt(egg) {
        return formatEggKnowledgeForPrompt(egg);
      }
      formatEggForPrompt = (egg) => {
        return formatEggForPrompt(egg);
      };
      countUnprocessed(egg) {
        return countUnprocessed(egg);
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
        const section = findSection(lines, "unprocessed");
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
        knowledge = stripSectionHeading(knowledge, "knowledge");
        unprocessed = stripSectionHeading(unprocessed, "unprocessed");
        const kLines = knowledge.split("\n");
        const uIdx = kLines.findIndex((l) => headingName(l) === "unprocessed");
        if (uIdx !== -1) {
          const rest = stripSectionHeading(
            kLines.slice(uIdx).join("\n"),
            "unprocessed"
          );
          knowledge = kLines.slice(0, uIdx).join("\n").replace(/\s+$/g, "");
          if (!unprocessed)
            unprocessed = rest;
        }
        const existing = await this.plugin.app.vault.read(file);
        let lines = existing.replace(/\n+$/, "").split("\n");
        const knowledgeSection = findSection(lines, "knowledge");
        if (knowledgeSection) {
          lines = [
            ...lines.slice(0, knowledgeSection.start + 1),
            "",
            ...knowledge.trim().split("\n"),
            ...lines.slice(knowledgeSection.end)
          ];
        } else {
          const unprocessedSection2 = findSection(lines, "unprocessed");
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
        const unprocessedSection = findSection(lines, "unprocessed");
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
    };
  }
});

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => NutEggPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian7 = require("obsidian");

// src/settings.ts
var import_obsidian2 = require("obsidian");

// ../shared/src/catalog.ts
var OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
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
    officialEndpoint: OPENROUTER_ENDPOINT,
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
  if (!settings)
    return false;
  const provider = settings.chromeAiProvider || settings.aiProvider || "gemini";
  const apiKey = (settings.chromeAiApiKey !== void 0 ? settings.chromeAiApiKey : settings.aiApiKey) || "";
  if (provider === "local") {
    const localEndpoint = settings.chromeAiEndpoint || settings.localEndpoint || settings.aiEndpoint;
    return Boolean(
      localEndpoint && localEndpoint.trim().length > 0 || PROVIDER_CATALOG.local.officialEndpoint
    );
  }
  return Boolean(apiKey && apiKey.trim().length > 0);
}
function resolveConfig(settings) {
  const providerId = settings.chromeAiProvider || settings.aiProvider || "anthropic";
  const isLocal = providerId === "local";
  const isOpenRouter = providerId === "openrouter";
  const rawKey = settings.chromeAiApiKey !== void 0 ? settings.chromeAiApiKey : settings.aiApiKey;
  const apiKey = (rawKey || "").trim();
  if (isLocal) {
    const isOllama = settings.localApiType === "ollama";
    const defaultEndpoint = isOllama ? "http://127.0.0.1:11434/api/chat" : "http://127.0.0.1:11434/v1/chat/completions";
    const rawEndpoint = settings.chromeAiEndpoint || settings.localEndpoint || settings.aiEndpoint;
    const model2 = (settings.chromeAiModel || settings.aiModel || "default").trim();
    return {
      provider: "local",
      endpoint: rawEndpoint || defaultEndpoint,
      apiKey,
      model: model2,
      apiFormat: isOllama ? "ollama" : "openai-compatible",
      isLocal: true,
      extraHeaders: {}
    };
  }
  if (isOpenRouter) {
    return {
      provider: "openrouter",
      endpoint: OPENROUTER_ENDPOINT,
      apiKey,
      model: settings.chromeAiModel || settings.openrouterModel || settings.aiModel || "openai/gpt-6-astra",
      apiFormat: "openai-compatible",
      isLocal: false,
      extraHeaders: {
        "HTTP-Referer": "https://github.com/nutegg",
        "X-Title": "NutEgg"
      }
    };
  }
  const catalog = PROVIDER_CATALOG[providerId] || PROVIDER_CATALOG.anthropic;
  const model = (settings.chromeAiModel || settings.aiModel || catalog.defaultModel || "").trim();
  return {
    provider: providerId,
    endpoint: catalog.officialEndpoint,
    apiKey,
    model,
    apiFormat: catalog.apiFormat,
    isLocal: false,
    extraHeaders: catalog.apiFormat === "anthropic" ? { "anthropic-version": "2023-06-01" } : {}
  };
}

// ../shared/src/client.ts
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
    return new AIError(
      "auth_failed",
      "API key is invalid or missing. Check your API key in NutEgg settings.",
      statusCode
    );
  }
  if (statusCode === 403) {
    return new AIError(
      "forbidden",
      "Access denied. Your API key may not have permission for this model, or your account needs a funded billing plan.",
      statusCode
    );
  }
  if (statusCode === 404 || lower.includes("model not found") || lower.includes("model_not_found")) {
    return new AIError(
      "model_not_found",
      "The selected model was not found. The model name may be incorrect or not available on this endpoint.",
      statusCode
    );
  }
  if (statusCode === 429) {
    return new AIError(
      "rate_limited",
      "Rate limit exceeded. Wait a moment and try again.",
      statusCode
    );
  }
  if (statusCode >= 500) {
    return new AIError(
      "server_error",
      `The AI service returned a server error (${statusCode}). It may be temporarily down \u2014 try again shortly.`,
      statusCode
    );
  }
  if (lower.includes("quota") || lower.includes("insufficient") || lower.includes("balance") || lower.includes("billing")) {
    return new AIError(
      "quota_exceeded",
      "API quota exceeded or insufficient funds. Check your account balance or billing settings.",
      statusCode
    );
  }
  const snippet = body.slice(0, 300);
  return new AIError("unknown", `API error (${statusCode}): ${snippet}`, statusCode);
}
async function chatAnthropic(prompt, maxTokens, config) {
  let response;
  try {
    response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        ...config.extraHeaders || {}
      },
      body: JSON.stringify({
        model: config.model,
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
async function chatOllama(prompt, maxTokens, config) {
  let response;
  const headers = {
    "Content-Type": "application/json",
    ...config.extraHeaders || {}
  };
  if (config.apiKey && config.apiKey.trim().length > 0) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  }
  const bodyPayload = {
    model: config.model || "default",
    messages: [{ role: "user", content: prompt }],
    stream: false,
    options: {
      num_predict: maxTokens,
      temperature: 0.3
    }
  };
  try {
    response = await fetch(config.endpoint, {
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
async function chatOpenAICompatible(prompt, maxTokens, config) {
  let response;
  const headers = {
    "Content-Type": "application/json",
    ...config.extraHeaders || {}
  };
  if (config.apiKey && config.apiKey.trim().length > 0) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  }
  const bodyPayload = {
    model: config.model,
    messages: [{ role: "user", content: prompt }]
  };
  if (config.provider === "openai") {
    bodyPayload.max_completion_tokens = maxTokens;
  } else {
    bodyPayload.max_tokens = maxTokens;
  }
  try {
    response = await fetch(config.endpoint, {
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
        `The AI model (${config.model}) spent all its tokens on internal reasoning before writing the answer. Try increasing Max Tokens in settings.`
      );
    }
  }
  return content;
}
async function chatAI(prompt, maxTokens, config) {
  if (config.provider !== "local" && !config.apiKey) {
    throw new AIError(
      "no_api_key",
      "No AI API key configured. Open settings and enter your API key."
    );
  }
  if (config.apiFormat === "anthropic") {
    return chatAnthropic(prompt, maxTokens, config);
  }
  if (config.apiFormat === "ollama") {
    return chatOllama(prompt, maxTokens, config);
  }
  return chatOpenAICompatible(prompt, maxTokens, config);
}
async function checkCreditAI(settings) {
  const providerId = settings.chromeAiProvider || settings.aiProvider || "gemini";
  const provider = PROVIDER_CATALOG[providerId];
  const source = providerId === "openrouter" ? "openrouter" : "official";
  const apiKey = (settings.chromeAiApiKey !== void 0 ? settings.chromeAiApiKey : settings.aiApiKey) || "";
  const model = settings.chromeAiModel || settings.aiModel || provider?.defaultModel || "";
  const baseInfo = {
    provider: providerId,
    providerLabel: provider?.label || providerId,
    source,
    model,
    hasBalance: false,
    statusText: "Checking..."
  };
  if (providerId === "local") {
    const isOllama = settings.localApiType === "ollama";
    const defaultEndpoint = isOllama ? "http://127.0.0.1:11434/api/chat" : "http://127.0.0.1:11434/v1/chat/completions";
    const endpoint = settings.chromeAiEndpoint || settings.localEndpoint || settings.aiEndpoint || defaultEndpoint;
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
  if (providerId === "openrouter") {
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
  if (providerId === "deepseek") {
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
  if (providerId === "kimi") {
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
    statusText: `${provider?.label || providerId} (Pay-as-you-go / Direct)`
  };
}
var AIClient = class {
  config;
  constructor(settings) {
    this.config = resolveConfig(settings);
  }
  async checkCredit(settings) {
    return checkCreditAI(settings);
  }
  async chat(prompt, maxTokens) {
    return chatAI(prompt, maxTokens, this.config);
  }
};

// src/i18n/en.ts
var en = {
  // Settings
  settingsTitle: "NutEgg Settings",
  chromeCompanionName: "Chrome Extension Companion",
  chromeCompanionDesc: "Capture and analyze articles, YouTube videos, and tweets directly from your browser into Obsidian.",
  getChromeExtension: "Get Chrome Extension \u2197",
  reportBugName: "Report a Bug",
  reportBugDesc: "Found an issue, unexpected behavior, or need help? Report it on GitHub issues.",
  reportBugBtn: "\u{1F41B} Report Bug on GitHub \u2197",
  vaultPathsHeader: "Vault Paths",
  rawFolder: "Raw Content Folder",
  rawFolderDesc: "Folder for saved raw content",
  indexFile: "Index File",
  indexFileDesc: "File that maps eggs to their markdown files",
  workflowFolder: "Workflow Engine Folder",
  workflowFolderDesc: "Folder where AI prompts, schemas, and pipeline rules are stored as editable markdown files",
  useDefaultWorkflows: "Use Default Workflow Prompts",
  useDefaultWorkflowsDesc: "Moves all current files in nutegg/_workflow to a timestamped backup folder under _backup/ and restores clean built-in prompt defaults.",
  useDefaultsBtn: "Use Defaults",
  devMode: "Developer mode",
  devModeOn: "Advanced settings are visible below",
  devModeOff: "Show advanced settings (AI provider, API key, server port)",
  aiModelConfig: "AI Model Configuration",
  localModelConfig: "Local LLM Configuration",
  aiProvider: "1. AI Provider",
  aiProviderDesc: "Choose a local runner (Ollama, LM Studio), OpenRouter, or cloud AI provider",
  localApiType: "API Type",
  localApiTypeDesc: "Protocol format used by your local runner",
  localEndpoint: "Local Server Endpoint",
  localEndpointOllamaDesc: "Ollama native chat URL (default: http://127.0.0.1:11434/api/chat)",
  localEndpointOpenAiDesc: "OpenAI-compatible chat completions URL for your local runner",
  localPresets: "Presets: ",
  localApiKeyDesc: "Optional for local LLMs. Leave empty if your local server does not require authentication.",
  aiModelFamily: "2. Model Family",
  aiModelFamilyDesc: "Choose model vendor or architecture group on OpenRouter",
  modelVersion: "3. Model Version",
  modelVersionDesc: 'Sent to OpenRouter as "{model}"',
  aiModel: "2. Model",
  aiModelDesc: "Model to use for analysis ({provider})",
  customModel: "Custom Model Name",
  customModelDesc: "Enter the model ID (e.g., mistralai/mistral-large)",
  aiApiKey: "API Key",
  openRouterApiKeyDesc: "Your OpenRouter API key (openrouter.ai/keys)",
  providerApiKeyDesc: "Your {provider} API key",
  creditStatusTitleLocal: "Local LLM connection status",
  creditStatusTitleCloud: "AI credit & balance",
  creditCheckingLocal: "Checking local server connection...",
  creditCheckingCloud: "Checking credit balance with provider...",
  refresh: "Refresh",
  checking: "Checking...",
  remainingBalance: "\u{1F4B0} Remaining Balance: {balance} ({status})",
  providerStatus: "\u2139\uFE0F Provider: {provider} \u2014 {status}",
  creditCheckFailed: "\u26A0\uFE0F Failed to check credit: {error}",
  processingHeader: "Processing & Chunking",
  chunkWindowChars: "General chunk window size",
  chunkWindowCharsDesc: "Maximum character length per chunk (~30,000 chars \u2248 8,000 tokens). Long content exceeding this threshold is split into parts and processed with multi-stage map-reduce aggregation.",
  sectionGridSeconds: "Section grid interval",
  sectionGridSecondsDesc: "Time interval in seconds (default: 300s / 5 minutes) used to generate section lattice points and chapter maps for videos lacking native chapter markers.",
  maxTokens: "Max completion tokens",
  maxTokensDesc: "Maximum completion tokens allocated for AI calls (default: 16384). Cloud models (DeepSeek, OpenAI, Anthropic) support large output windows. Local LLM users can adjust this to match their model's context window.",
  serverHeader: "Server",
  serverPort: "Server Port",
  serverPortDesc: "Port for the local HTTP server connecting with Chrome Extension (requires restart)",
  linksHeader: "Links & Resources",
  nuteggChromeStoreName: "NutEgg on Chrome Web Store",
  nuteggChromeStoreDesc: "Install or update the NutEgg companion extension for Google Chrome.",
  openChromeWebStore: "Open Chrome Web Store \u2197",
  nuteggObsidianPluginName: "NutEgg on Obsidian Community Plugins",
  nuteggObsidianPluginDesc: "View NutEgg in the Obsidian Community Plugins directory.",
  openObsidianDirectory: "Open Obsidian Directory \u2197",
  // Commands & Ribbons
  cmdNewEgg: "Create a new egg file",
  cmdOpenIndex: "Open index file",
  cmdMergeCurrent: "Merge unprocessed entries in current egg",
  cmdCheckCredit: "Check AI provider credit & balance",
  cmdUseDefaultWorkflowPrompts: "Use default workflow prompts (backup existing)",
  cmdReportBug: "Report a bug on GitHub",
  ribbonOpenIndex: "NutEgg: Open Index",
  ribbonCheckCredit: "NutEgg: Check AI Credit & Balance",
  // Notices
  serverStarted: "NutEgg server started on port {port}",
  serverFailed: "NutEgg: Failed to start server. Check console for details.",
  indexNotFound: "NutEgg: {path} not found. Click the egg icon to create it.",
  noActiveFile: "NutEgg: No active file",
  notEggNote: "NutEgg: Active file is not an egg note",
  mergingEntries: "NutEgg: Merging unprocessed entries in {name}...",
  mergedEntries: "[NutEgg] Merged {count} entries into knowledge tree",
  noUnprocessed: "[NutEgg] No unprocessed entries to merge or merge failed.",
  mergeFailed: "[NutEgg] Merge failed: {error}",
  workflowReset: "[NutEgg] Reset workflow files to defaults. Previous files moved to {folder}",
  eggNameRequired: "NutEgg: Please enter a valid egg name.",
  eggAlreadyExists: "NutEgg: {path} already exists.",
  eggCreated: "NutEgg: Created {path}",
  indexSynced: "[NutEgg] Index synced: {summary}",
  indexAllSynced: "[NutEgg] Everything is in sync.",
  indexSyncFailed: "[NutEgg] Sync failed: {error}",
  // Modals & Widgets
  createEggTitle: "\u{1F423} Create New Egg",
  eggNameLabel: "Egg Name (file name):",
  eggNamePlaceholder: "e.g. methodology, invest_strategy...",
  eggDescLabel: "Description (scope of what it covers):",
  eggDescPlaceholder: "e.g. practical methods and tactics...",
  eggLangHint: "\u{1F310} Language of instructions and knowledge output will match the description language.",
  cancel: "Cancel",
  createEgg: "Create Egg",
  creatingEgg: "\u23F3 Creating egg...",
  mergeUnprocessed: "Merge Unprocessed Note",
  mergeUnprocessedPlural: "Merge {count} Unprocessed Notes",
  merging: "Merging...",
  mergeButtonText: "\u26A1 Merge into Knowledge Tree",
  mergingWithAi: "\u23F3 Merging with AI...",
  mergedSuccess: "\u2705 Merged!",
  treeUpToDate: "\u2705 Knowledge tree is up to date",
  unprocessedEntries: "\u{1F95A} {count} unprocessed {entries}",
  entrySingle: "entry",
  entryPlural: "entries",
  mergeNoChanges: "[NutEgg] Merge returned no changes or failed. Check console.",
  syncIndex: "Sync Index",
  syncingIndex: "Syncing...",
  newEggButton: "+ New Egg",
  unprocessedBadge: "{count} unprocessed"
};

// src/i18n/zh.ts
var zh = {
  // Settings
  settingsTitle: "NutEgg \u8BBE\u7F6E",
  chromeCompanionName: "Chrome \u6269\u5C55\u914D\u5957",
  chromeCompanionDesc: "\u4ECE\u6D4F\u89C8\u5668\u76F4\u63A5\u63D0\u53D6\u5E76\u5206\u6790\u6587\u7AE0\u3001YouTube \u89C6\u9891\u4E0E\u63A8\u6587\uFF0C\u7ED3\u6784\u5316\u5B58\u5165 Obsidian\u3002",
  getChromeExtension: "\u83B7\u53D6 Chrome \u6269\u5C55 \u2197",
  reportBugName: "\u53CD\u9988\u95EE\u9898",
  reportBugDesc: "\u9047\u5230\u5F02\u5E38\u3001\u95EE\u9898\u6216\u9700\u8981\u5E2E\u52A9\uFF1F\u6B22\u8FCE\u5728 GitHub \u63D0\u4EA4\u53CD\u9988\u3002",
  reportBugBtn: "\u{1F41B} \u5728 GitHub \u63D0\u4EA4\u53CD\u9988 \u2197",
  vaultPathsHeader: "\u5E93\u8DEF\u5F84\u8BBE\u7F6E",
  rawFolder: "\u539F\u59CB\u7D20\u6750\u76EE\u5F55",
  rawFolderDesc: "\u5B58\u653E\u63D0\u53D6\u7684\u539F\u59CB\u7F51\u9875\u4E0E\u97F3\u89C6\u9891\u6587\u7A3F\u76EE\u5F55",
  indexFile: "Egg \u7D22\u5F15\u6587\u4EF6",
  indexFileDesc: "\u8BB0\u5F55\u6240\u6709 Egg \u4E0E\u5BF9\u5E94\u7B14\u8BB0\u8DEF\u5F84\u7684\u7D22\u5F15\u6587\u4EF6",
  workflowFolder: "\u5DE5\u4F5C\u6D41\u5F15\u64CE\u76EE\u5F55",
  workflowFolderDesc: "\u5B58\u653E\u53EF\u7F16\u8F91\u7684 AI \u63D0\u793A\u8BCD\u3001Schema \u4E0E\u7BA1\u7EBF\u89C4\u5219 markdown \u6587\u4EF6\u7684\u76EE\u5F55",
  useDefaultWorkflows: "\u6062\u590D\u9ED8\u8BA4\u5DE5\u4F5C\u6D41\u63D0\u793A\u8BCD",
  useDefaultWorkflowsDesc: "\u5C06\u5F53\u524D nutegg/_workflow \u76EE\u5F55\u4E0B\u7684\u6587\u4EF6\u79FB\u5165\u5E26\u6709\u65F6\u95F4\u6233\u7684 _backup/ \u5907\u4EFD\u76EE\u5F55\uFF0C\u5E76\u6062\u590D\u5185\u7F6E\u7684\u63D0\u793A\u8BCD\u9ED8\u8BA4\u503C\u3002",
  useDefaultsBtn: "\u6062\u590D\u9ED8\u8BA4",
  devMode: "\u5F00\u53D1\u8005\u6A21\u5F0F",
  devModeOn: "\u5DF2\u663E\u793A\u4E0B\u65B9\u7684\u9AD8\u7EA7\u914D\u7F6E\u9879",
  devModeOff: "\u663E\u793A\u9AD8\u7EA7\u8BBE\u7F6E\uFF08AI \u4F9B\u5E94\u5546\u3001API Key\u3001\u672C\u5730\u7AEF\u53E3\u7B49\uFF09",
  aiModelConfig: "AI \u6A21\u578B\u8BBE\u7F6E",
  localModelConfig: "\u672C\u5730\u6A21\u578B\u8BBE\u7F6E",
  aiProvider: "1. AI \u4F9B\u5E94\u5546",
  aiProviderDesc: "\u9009\u62E9\u672C\u5730\u6A21\u578B\uFF08Ollama\u3001LM Studio\uFF09\u3001OpenRouter \u6216\u4E91\u7AEF\u6A21\u578B",
  localApiType: "API \u7C7B\u578B",
  localApiTypeDesc: "\u672C\u5730\u8FD0\u884C\u73AF\u5883\u4F7F\u7528\u7684\u534F\u8BAE\u683C\u5F0F",
  localEndpoint: "\u672C\u5730\u670D\u52A1\u5730\u5740",
  localEndpointOllamaDesc: "Ollama \u539F\u751F\u5BF9\u8BDD\u5730\u5740\uFF08\u9ED8\u8BA4\uFF1Ahttp://127.0.0.1:11434/api/chat\uFF09",
  localEndpointOpenAiDesc: "\u672C\u5730\u517C\u5BB9 OpenAI \u683C\u5F0F\u7684 chat completions \u63A5\u53E3\u5730\u5740",
  localPresets: "\u5FEB\u901F\u9884\u8BBE\uFF1A ",
  localApiKeyDesc: "\u672C\u5730\u6A21\u578B\u53EF\u9009\u3002\u82E5\u672C\u5730\u6A21\u578B\u670D\u52A1\u4E0D\u9700\u8981\u8EAB\u4EFD\u9A8C\u8BC1\uFF0C\u8BF7\u7559\u7A7A\u3002",
  aiModelFamily: "2. \u6A21\u578B\u5BB6\u65CF",
  aiModelFamilyDesc: "\u9009\u62E9 OpenRouter \u4E0A\u53EF\u7528\u7684 AI \u5382\u5546\u6216\u6A21\u578B\u7C7B\u522B",
  modelVersion: "3. \u6A21\u578B\u7248\u672C",
  modelVersionDesc: '\u8BF7\u6C42\u5C06\u4EE5 "{model}" \u53D1\u9001\u7ED9 OpenRouter',
  aiModel: "2. \u6A21\u578B",
  aiModelDesc: "\u7528\u4E8E\u5206\u6790\u7684\u6A21\u578B\uFF08{provider}\uFF09",
  customModel: "\u81EA\u5B9A\u4E49\u6A21\u578B\u540D\u79F0",
  customModelDesc: "\u8F93\u5165\u6A21\u578B ID\uFF08\u4F8B\u5982\uFF1Amistralai/mistral-large\uFF09",
  aiApiKey: "API Key",
  openRouterApiKeyDesc: "\u60A8\u7684 OpenRouter API Key\uFF08openrouter.ai/keys\uFF09",
  providerApiKeyDesc: "\u60A8\u7684 {provider} API Key",
  creditStatusTitleLocal: "\u672C\u5730\u5927\u6A21\u578B\u8FDE\u63A5\u72B6\u6001",
  creditStatusTitleCloud: "AI \u989D\u5EA6\u4E0E\u4F59\u989D",
  creditCheckingLocal: "\u6B63\u5728\u68C0\u67E5\u672C\u5730\u670D\u52A1\u8FDE\u63A5...",
  creditCheckingCloud: "\u6B63\u5728\u5411\u4F9B\u5E94\u5546\u67E5\u8BE2\u989D\u5EA6\u4E0E\u4F59\u989D...",
  refresh: "\u5237\u65B0",
  checking: "\u67E5\u8BE2\u4E2D...",
  remainingBalance: "\u{1F4B0} \u5269\u4F59\u4F59\u989D\uFF1A{balance}\uFF08{status}\uFF09",
  providerStatus: "\u2139\uFE0F \u4F9B\u5E94\u5546\uFF1A{provider} \u2014 {status}",
  creditCheckFailed: "\u26A0\uFE0F \u67E5\u8BE2\u5931\u8D25\uFF1A{error}",
  processingHeader: "\u5904\u7406\u4E0E\u6587\u672C\u5207\u5206",
  chunkWindowChars: "\u5206\u5757\u7A97\u53E3\u5927\u5C0F",
  chunkWindowCharsDesc: "\u8D85\u957F\u5185\u5BB9\u5207\u5206\u5B57\u7B26\u5927\u5C0F\uFF08~30,000 \u5B57\u7B26 \u2248 8,000 tokens\uFF09\u3002\u8D85\u51FA\u6B64\u9608\u503C\u7684\u5185\u5BB9\u5C06\u5206\u5757\u5904\u7406\u5E76\u901A\u8FC7 Map-Reduce \u805A\u5408\u3002",
  sectionGridSeconds: "\u89C6\u9891\u65F6\u95F4\u7F51\u683C\u95F4\u9694",
  sectionGridSecondsDesc: "\u65E0\u7AE0\u8282\u6807\u8BB0\u89C6\u9891\u7684\u65F6\u95F4\u5206\u6BB5\u79D2\u6570\uFF08\u9ED8\u8BA4\uFF1A300 \u79D2 / 5 \u5206\u949F\uFF09\uFF0C\u7528\u4E8E\u751F\u6210\u7F51\u683C\u70B9\u4E0E\u7AE0\u8282\u8109\u7EDC\u3002",
  maxTokens: "\u6700\u5927\u751F\u6210 Token \u6570",
  maxTokensDesc: "AI \u8C03\u7528\u5206\u914D\u7684\u6700\u5927\u8F93\u51FA Token \u6570\uFF08\u9ED8\u8BA4\uFF1A16384\uFF09\u3002\u4E91\u7AEF\u5927\u6A21\u578B\u652F\u6301\u5927\u7A97\u53E3\uFF0C\u672C\u5730\u6A21\u578B\u53EF\u6839\u636E\u4E0A\u4E0B\u6587\u7A97\u53E3\u8C03\u6574\u3002",
  serverHeader: "\u672C\u5730\u670D\u52A1",
  serverPort: "\u672C\u5730\u670D\u52A1\u7AEF\u53E3",
  serverPortDesc: "\u7528\u4E8E\u4E0E Chrome \u6269\u5C55\u901A\u4FE1\u7684\u672C\u5730 HTTP \u670D\u52A1\u7AEF\u53E3\uFF08\u4FEE\u6539\u540E\u9700\u91CD\u542F\uFF09",
  linksHeader: "\u76F8\u5173\u94FE\u63A5\u4E0E\u8D44\u6E90",
  nuteggChromeStoreName: "NutEgg Chrome \u6269\u5C55",
  nuteggChromeStoreDesc: "\u5B89\u88C5\u6216\u66F4\u65B0\u9002\u7528\u4E8E Google Chrome \u7684 NutEgg \u4F34\u968F\u6269\u5C55\u3002",
  openChromeWebStore: "\u8BBF\u95EE Chrome \u5E94\u7528\u5546\u5E97 \u2197",
  nuteggObsidianPluginName: "NutEgg Obsidian \u793E\u533A\u63D2\u4EF6",
  nuteggObsidianPluginDesc: "\u5728 Obsidian \u793E\u533A\u63D2\u4EF6\u5E02\u573A\u67E5\u770B NutEgg\u3002",
  openObsidianDirectory: "\u8BBF\u95EE Obsidian \u793E\u533A\u63D2\u4EF6\u76EE\u5F55 \u2197",
  // Commands & Ribbons
  cmdNewEgg: "\u521B\u5EFA\u65B0\u7684 Egg \u7B14\u8BB0",
  cmdOpenIndex: "\u6253\u5F00\u7D22\u5F15\u6587\u4EF6",
  cmdMergeCurrent: "\u5408\u5E76\u5F53\u524D Egg \u4E2D\u7684\u672A\u5904\u7406\u6761\u76EE",
  cmdCheckCredit: "\u67E5\u8BE2 AI \u4F9B\u5E94\u5546\u989D\u5EA6\u4E0E\u4F59\u989D",
  cmdUseDefaultWorkflowPrompts: "\u6062\u590D\u9ED8\u8BA4\u5DE5\u4F5C\u6D41\u63D0\u793A\u8BCD\uFF08\u5907\u4EFD\u73B0\u6709\u6587\u4EF6\uFF09",
  cmdReportBug: "\u5728 GitHub \u63D0\u4EA4\u53CD\u9988",
  ribbonOpenIndex: "NutEgg\uFF1A\u6253\u5F00\u7D22\u5F15",
  ribbonCheckCredit: "NutEgg\uFF1A\u67E5\u770B AI \u989D\u5EA6\u4E0E\u4F59\u989D",
  // Notices
  serverStarted: "NutEgg \u670D\u52A1\u5DF2\u5728\u7AEF\u53E3 {port} \u542F\u52A8",
  serverFailed: "NutEgg\uFF1A\u670D\u52A1\u542F\u52A8\u5931\u8D25\uFF0C\u8BF7\u67E5\u770B\u63A7\u5236\u53F0\u8BE6\u60C5\u3002",
  indexNotFound: "NutEgg\uFF1A\u672A\u627E\u5230 {path}\u3002\u70B9\u51FB Egg \u56FE\u6807\u4EE5\u521B\u5EFA\u3002",
  noActiveFile: "NutEgg\uFF1A\u5F53\u524D\u65E0\u6D3B\u52A8\u6587\u4EF6",
  notEggNote: "NutEgg\uFF1A\u5F53\u524D\u6D3B\u52A8\u6587\u4EF6\u4E0D\u662F Egg \u7B14\u8BB0",
  mergingEntries: "NutEgg\uFF1A\u6B63\u5728\u5408\u5E76 {name} \u4E2D\u7684\u672A\u5904\u7406\u6761\u76EE...",
  mergedEntries: "[NutEgg] \u5DF2\u5C06 {count} \u6761\u77E5\u8BC6\u5408\u5E76\u5165\u77E5\u8BC6\u5E93",
  noUnprocessed: "[NutEgg] \u6CA1\u6709\u5F85\u5408\u5E76\u7684\u672A\u5904\u7406\u6761\u76EE\uFF0C\u6216\u5408\u5E76\u5931\u8D25\u3002",
  mergeFailed: "[NutEgg] \u5408\u5E76\u5931\u8D25\uFF1A{error}",
  workflowReset: "[NutEgg] \u5DF2\u91CD\u7F6E\u5DE5\u4F5C\u6D41\u63D0\u793A\u8BCD\u4E3A\u9ED8\u8BA4\u503C\u3002\u539F\u6587\u4EF6\u5DF2\u5907\u4EFD\u81F3 {folder}",
  eggNameRequired: "NutEgg\uFF1A\u8BF7\u8F93\u5165\u6709\u6548\u7684 Egg \u540D\u79F0\u3002",
  eggAlreadyExists: "NutEgg\uFF1A{path} \u5DF2\u5B58\u5728\u3002",
  eggCreated: "NutEgg\uFF1A\u5DF2\u6210\u529F\u521B\u5EFA {path}",
  indexSynced: "[NutEgg] \u7D22\u5F15\u5DF2\u540C\u6B65\uFF1A{summary}",
  indexAllSynced: "[NutEgg] \u7D22\u5F15\u5DF2\u662F\u6700\u65B0\u72B6\u6001\u3002",
  indexSyncFailed: "[NutEgg] \u7D22\u5F15\u540C\u6B65\u5931\u8D25\uFF1A{error}",
  // Modals & Widgets
  createEggTitle: "\u{1F423} \u521B\u5EFA\u65B0\u7684 Egg",
  eggNameLabel: "Egg \u540D\u79F0\uFF08\u6587\u4EF6\u540D\uFF09\uFF1A",
  eggNamePlaceholder: "\u4F8B\u5982\uFF1Amethodology, invest_strategy, \u65B9\u6CD5\u8BBA...",
  eggDescLabel: "\u63CF\u8FF0\uFF08\u77E5\u8BC6\u5E93\u8986\u76D6\u8303\u56F4\uFF09\uFF1A",
  eggDescPlaceholder: "\u4F8B\u5982\uFF1A\u4ECB\u7ECD\u505A\u4E8B\u7684\u5177\u4F53\u65B9\u6CD5\u4E0E\u5B9E\u8DF5\u7B56\u7565...",
  eggLangHint: "\u{1F310} \u63D0\u793A\u8BCD\u4E0E\u751F\u6210\u7684\u77E5\u8BC6\u5361\u7247\u8F93\u51FA\u8BED\u8A00\u5C06\u8DDF\u968F\u8BE5\u63CF\u8FF0\u8BED\u8A00\u3002",
  cancel: "\u53D6\u6D88",
  createEgg: "\u521B\u5EFA Egg",
  creatingEgg: "\u23F3 \u6B63\u5728\u521B\u5EFA Egg...",
  mergeUnprocessed: "\u5408\u5E76\u672A\u5904\u7406\u7B14\u8BB0",
  mergeUnprocessedPlural: "\u5408\u5E76 {count} \u7BC7\u672A\u5904\u7406\u7B14\u8BB0",
  merging: "\u6B63\u5728\u5408\u5E76...",
  mergeButtonText: "\u26A1 \u5408\u5E76\u5165\u77E5\u8BC6\u5E93",
  mergingWithAi: "\u23F3 AI \u6B63\u5728\u5408\u5E76...",
  mergedSuccess: "\u2705 \u5DF2\u5408\u5E76\uFF01",
  treeUpToDate: "\u2705 \u77E5\u8BC6\u5E93\u5DF2\u662F\u6700\u65B0\u72B6\u6001",
  unprocessedEntries: "\u{1F95A} {count} \u6761\u672A\u5904\u7406\u5185\u5BB9",
  entrySingle: "\u6761\u76EE",
  entryPlural: "\u6761\u76EE",
  mergeNoChanges: "[NutEgg] \u5408\u5E76\u672A\u4EA7\u751F\u66F4\u6539\u6216\u5931\u8D25\uFF0C\u8BF7\u67E5\u770B\u63A7\u5236\u53F0\u3002",
  syncIndex: "\u540C\u6B65\u7D22\u5F15",
  syncingIndex: "\u6B63\u5728\u540C\u6B65...",
  newEggButton: "+ \u65B0\u5EFA Egg",
  unprocessedBadge: "{count} \u4E2A\u672A\u5904\u7406"
};

// src/i18n/es.ts
var es = {
  "settingsTitle": "Configuraci\xF3n de NutEgg",
  "chromeCompanionName": "Complemento de extensi\xF3n para Chrome",
  "chromeCompanionDesc": "Captura y analiza art\xEDculos, v\xEDdeos de YouTube y tweets directamente desde tu navegador en Obsidian.",
  "getChromeExtension": "Obtener extensi\xF3n de Chrome \u2197",
  "reportBugName": "Reportar un error",
  "reportBugDesc": "\xBFHas encontrado un error, comportamiento inesperado o necesitas ayuda? Inf\xF3rmanos en GitHub.",
  "reportBugBtn": "\u{1F41B} Reportar error en GitHub \u2197",
  "vaultPathsHeader": "Rutas de la b\xF3veda",
  "rawFolder": "Carpeta de contenido sin procesar",
  "rawFolderDesc": "Carpeta para contenido sin procesar guardado",
  "indexFile": "Archivo de \xEDndice",
  "indexFileDesc": "Archivo que mapea los eggs a sus archivos markdown",
  "workflowFolder": "Carpeta del motor de flujo de trabajo",
  "workflowFolderDesc": "Carpeta donde se guardan los prompts de IA, esquemas y reglas como archivos markdown editables",
  "useDefaultWorkflows": "Usar prompts de flujo de trabajo predeterminados",
  "useDefaultWorkflowsDesc": "Mueve todos los archivos actuales en nutegg/_workflow a una carpeta de respaldo con fecha en _backup/ y restaura los valores predeterminados.",
  "useDefaultsBtn": "Restaurar predeterminados",
  "devMode": "Modo desarrollador",
  "devModeOn": "La configuraci\xF3n avanzada est\xE1 visible a continuaci\xF3n",
  "devModeOff": "Mostrar configuraci\xF3n avanzada (proveedor de IA, clave API, puerto del servidor)",
  "aiModelConfig": "Configuraci\xF3n del modelo de IA",
  "localModelConfig": "Configuraci\xF3n de LLM local",
  "aiProvider": "1. Proveedor de IA",
  "aiProviderDesc": "Elige un ejecutor local (Ollama, LM Studio), OpenRouter o un proveedor en la nube",
  "localApiType": "Tipo de API",
  "localApiTypeDesc": "Formato de protocolo utilizado por tu ejecutor local",
  "localEndpoint": "Punto de enlace del servidor local",
  "localEndpointOllamaDesc": "URL nativa de chat de Ollama (por defecto: http://127.0.0.1:11434/api/chat)",
  "localEndpointOpenAiDesc": "URL de chat completions compatible con OpenAI para tu ejecutor local",
  "localPresets": "Preajustes: ",
  "localApiKeyDesc": "Opcional para LLMs locales. Dejar vac\xEDo si tu servidor local no requiere autenticaci\xF3n.",
  "aiModelFamily": "2. Familia del modelo",
  "aiModelFamilyDesc": "Elige el proveedor del modelo o grupo de arquitectura en OpenRouter",
  "modelVersion": "3. Versi\xF3n del modelo",
  "modelVersionDesc": 'Enviado a OpenRouter como "{model}"',
  "aiModel": "2. Modelo",
  "aiModelDesc": "Modelo a utilizar para el an\xE1lisis ({provider})",
  "customModel": "Nombre de modelo personalizado",
  "customModelDesc": "Introduce el ID del modelo (ej. mistralai/mistral-large)",
  "aiApiKey": "Clave API",
  "openRouterApiKeyDesc": "Tu clave API de OpenRouter (openrouter.ai/keys)",
  "providerApiKeyDesc": "Tu clave API de {provider}",
  "creditStatusTitleLocal": "Estado de conexi\xF3n del LLM local",
  "creditStatusTitleCloud": "Cr\xE9dito y saldo de IA",
  "creditCheckingLocal": "Comprobando conexi\xF3n con servidor local...",
  "creditCheckingCloud": "Comprobando saldo con el proveedor...",
  "refresh": "Actualizar",
  "checking": "Comprobando...",
  "remainingBalance": "\u{1F4B0} Saldo restante: {balance} ({status})",
  "providerStatus": "\u2139\uFE0F Proveedor: {provider} \u2014 {status}",
  "creditCheckFailed": "\u26A0\uFE0F Error al comprobar cr\xE9dito: {error}",
  "processingHeader": "Procesamiento y fragmentaci\xF3n",
  "chunkWindowChars": "Tama\xF1o de ventana de fragmento",
  "chunkWindowCharsDesc": "Longitud m\xE1xima de caracteres por fragmento (~30.000 caracteres \u2248 8.000 tokens). Contenido m\xE1s largo se divide en partes.",
  "sectionGridSeconds": "Intervalo de cuadr\xEDcula de secci\xF3n",
  "sectionGridSecondsDesc": "Intervalo de tiempo en segundos (por defecto: 300 s / 5 minutos) para generar puntos de secci\xF3n en v\xEDdeos sin cap\xEDtulos nativos.",
  "maxTokens": "Tokens m\xE1ximos de finalizaci\xF3n",
  "maxTokensDesc": "Tokens de salida m\xE1ximos asignados a llamadas de IA (por defecto: 16384).",
  "serverHeader": "Servidor",
  "serverPort": "Puerto del servidor",
  "serverPortDesc": "Puerto para el servidor HTTP local que conecta con la extensi\xF3n de Chrome (requiere reinicio)",
  "linksHeader": "Enlaces y recursos",
  "nuteggChromeStoreName": "NutEgg en Chrome Web Store",
  "nuteggChromeStoreDesc": "Instala o actualiza la extensi\xF3n complementaria NutEgg para Google Chrome.",
  "openChromeWebStore": "Abrir Chrome Web Store \u2197",
  "nuteggObsidianPluginName": "NutEgg en complementos comunitarios de Obsidian",
  "nuteggObsidianPluginDesc": "Ver NutEgg en el directorio de complementos comunitarios de Obsidian.",
  "openObsidianDirectory": "Abrir directorio de Obsidian \u2197",
  "cmdNewEgg": "Crear un nuevo archivo egg",
  "cmdOpenIndex": "Abrir archivo de \xEDndice",
  "cmdMergeCurrent": "Combinar entradas no procesadas en el egg actual",
  "cmdCheckCredit": "Comprobar cr\xE9dito y saldo del proveedor de IA",
  "cmdUseDefaultWorkflowPrompts": "Usar prompts de flujo de trabajo predeterminados (respaldar actuales)",
  "cmdReportBug": "Reportar un error en GitHub",
  "ribbonOpenIndex": "NutEgg: Abrir \xEDndice",
  "ribbonCheckCredit": "NutEgg: Comprobar cr\xE9dito y saldo de IA",
  "serverStarted": "Servidor NutEgg iniciado en el puerto {port}",
  "serverFailed": "NutEgg: Error al iniciar el servidor. Consulta la consola para m\xE1s detalles.",
  "indexNotFound": "NutEgg: no se encontr\xF3 {path}. Haz clic en el icono del egg para crearlo.",
  "noActiveFile": "NutEgg: No hay archivo activo",
  "notEggNote": "NutEgg: El archivo activo no es una nota egg",
  "mergingEntries": "NutEgg: Combinando entradas no procesadas en {name}...",
  "mergedEntries": "[NutEgg] Se combinaron {count} entradas en el \xE1rbol de conocimiento",
  "noUnprocessed": "[NutEgg] No hay entradas no procesadas para combinar o fall\xF3 la combinaci\xF3n.",
  "mergeFailed": "[NutEgg] Error al combinar: {error}",
  "workflowReset": "[NutEgg] Flujos de trabajo restablecidos a predeterminados. Archivos anteriores movidos a {folder}",
  "eggNameRequired": "NutEgg: Introduce un nombre de egg v\xE1lido.",
  "eggAlreadyExists": "NutEgg: {path} ya existe.",
  "eggCreated": "NutEgg: Creado {path}",
  "indexSynced": "[NutEgg] \xCDndice sincronizado: {summary}",
  "indexAllSynced": "[NutEgg] Todo est\xE1 sincronizado.",
  "indexSyncFailed": "[NutEgg] Fall\xF3 la sincronizaci\xF3n: {error}",
  "createEggTitle": "\u{1F423} Crear nuevo Egg",
  "eggNameLabel": "Nombre del Egg (nombre de archivo):",
  "eggNamePlaceholder": "ej. metodologia, estrategia_inversion...",
  "eggDescLabel": "Descripci\xF3n (alcance de lo que cubre):",
  "eggDescPlaceholder": "ej. m\xE9todos pr\xE1cticos y t\xE1cticas...",
  "eggLangHint": "\u{1F310} El idioma de las instrucciones coincidir\xE1 con el idioma de la descripci\xF3n.",
  "cancel": "Cancelar",
  "createEgg": "Crear Egg",
  "creatingEgg": "\u23F3 Creando egg...",
  "mergeUnprocessed": "Combinar nota no procesada",
  "mergeUnprocessedPlural": "Combinar {count} notas no procesadas",
  "merging": "Combinando...",
  "mergeButtonText": "\u26A1 Combinar en el \xE1rbol de conocimiento",
  "mergingWithAi": "\u23F3 Combinando con IA...",
  "mergedSuccess": "\u2705 \xA1Combinado!",
  "treeUpToDate": "\u2705 El \xE1rbol de conocimiento est\xE1 actualizado",
  "unprocessedEntries": "\u{1F95A} {count} {entries} sin procesar",
  "entrySingle": "entrada",
  "entryPlural": "entradas",
  "mergeNoChanges": "[NutEgg] La combinaci\xF3n no devolvi\xF3 cambios o fall\xF3. Revisa la consola.",
  "syncIndex": "Sincronizar \xEDndice",
  "syncingIndex": "Sincronizando...",
  "newEggButton": "+ Nuevo Egg",
  "unprocessedBadge": "{count} sin procesar"
};

// src/i18n/ja.ts
var ja = {
  "settingsTitle": "NutEgg \u8A2D\u5B9A",
  "chromeCompanionName": "Chrome\u62E1\u5F35\u6A5F\u80FD\u9023\u643A",
  "chromeCompanionDesc": "\u30D6\u30E9\u30A6\u30B6\u304B\u3089\u8A18\u4E8B\u3001YouTube\u52D5\u753B\u3001\u30C4\u30A4\u30FC\u30C8\u3092\u76F4\u63A5Obsidian\u306B\u30AD\u30E3\u30D7\u30C1\u30E3\u30FB\u5206\u6790\u3057\u307E\u3059\u3002",
  "getChromeExtension": "Chrome\u62E1\u5F35\u6A5F\u80FD\u3092\u5165\u624B \u2197",
  "reportBugName": "\u30D0\u30B0\u5831\u544A",
  "reportBugDesc": "\u554F\u984C\u306E\u767A\u751F\u3084\u4E88\u671F\u3057\u306A\u3044\u52D5\u4F5C\u3092\u898B\u3064\u3051\u305F\u5834\u5408\u3001GitHub\u306EIssue\u304B\u3089\u304A\u77E5\u3089\u305B\u304F\u3060\u3055\u3044\u3002",
  "reportBugBtn": "\u{1F41B} GitHub\u3067\u30D0\u30B0\u3092\u5831\u544A \u2197",
  "vaultPathsHeader": "\u4FDD\u7BA1\u5EAB\u306E\u30D1\u30B9\u8A2D\u5B9A",
  "rawFolder": "\u751F\u30B3\u30F3\u30C6\u30F3\u30C4\u30D5\u30A9\u30EB\u30C0",
  "rawFolderDesc": "\u4FDD\u5B58\u3055\u308C\u305F\u751F\u30B3\u30F3\u30C6\u30F3\u30C4\u3092\u683C\u7D0D\u3059\u308B\u30D5\u30A9\u30EB\u30C0",
  "indexFile": "\u30A4\u30F3\u30C7\u30C3\u30AF\u30B9\u30D5\u30A1\u30A4\u30EB",
  "indexFileDesc": "Egg\u3068Markdown\u30D5\u30A1\u30A4\u30EB\u3092\u30DE\u30C3\u30D4\u30F3\u30B0\u3059\u308B\u30A4\u30F3\u30C7\u30C3\u30AF\u30B9\u30D5\u30A1\u30A4\u30EB",
  "workflowFolder": "\u30EF\u30FC\u30AF\u30D5\u30ED\u30FC\u30A8\u30F3\u30B8\u30F3\u30D5\u30A9\u30EB\u30C0",
  "workflowFolderDesc": "AI\u30D7\u30ED\u30F3\u30D7\u30C8\u3001\u30B9\u30AD\u30FC\u30DE\u3001\u30D1\u30A4\u30D7\u30E9\u30A4\u30F3\u30EB\u30FC\u30EB\u3092\u4FDD\u5B58\u3059\u308B\u30D5\u30A9\u30EB\u30C0",
  "useDefaultWorkflows": "\u30C7\u30D5\u30A9\u30EB\u30C8\u306E\u30EF\u30FC\u30AF\u30D5\u30ED\u30FC\u30D7\u30ED\u30F3\u30D7\u30C8\u3092\u4F7F\u7528",
  "useDefaultWorkflowsDesc": "nutegg/_workflow\u5185\u306E\u5168\u30D5\u30A1\u30A4\u30EB\u3092_backup/\u306E\u30BF\u30A4\u30E0\u30B9\u30BF\u30F3\u30D7\u4ED8\u304D\u30D5\u30A9\u30EB\u30C0\u306B\u9000\u907F\u3057\u3001\u30AF\u30EA\u30FC\u30F3\u306A\u521D\u671F\u5024\u306B\u623B\u3057\u307E\u3059\u3002",
  "useDefaultsBtn": "\u521D\u671F\u8A2D\u5B9A\u306B\u623B\u3059",
  "devMode": "\u958B\u767A\u8005\u30E2\u30FC\u30C9",
  "devModeOn": "\u9AD8\u5EA6\u306A\u8A2D\u5B9A\u304C\u8868\u793A\u3055\u308C\u3066\u3044\u307E\u3059",
  "devModeOff": "\u9AD8\u5EA6\u306A\u8A2D\u5B9A\u3092\u8868\u793A\uFF08AI\u30D7\u30ED\u30D0\u30A4\u30C0\u30FC\u3001API\u30AD\u30FC\u3001\u30B5\u30FC\u30D0\u30FC\u30DD\u30FC\u30C8\uFF09",
  "aiModelConfig": "AI\u30E2\u30C7\u30EB\u8A2D\u5B9A",
  "localModelConfig": "\u30ED\u30FC\u30AB\u30EBLLM\u8A2D\u5B9A",
  "aiProvider": "1. AI\u30D7\u30ED\u30D0\u30A4\u30C0\u30FC",
  "aiProviderDesc": "\u30ED\u30FC\u30AB\u30EB\u5B9F\u884C\u74B0\u5883\uFF08Ollama\u3001LM Studio\uFF09\u3001OpenRouter\u3001\u307E\u305F\u306F\u30AF\u30E9\u30A6\u30C9AI\u3092\u9078\u629E",
  "localApiType": "API\u30BF\u30A4\u30D7",
  "localApiTypeDesc": "\u30ED\u30FC\u30AB\u30EB\u74B0\u5883\u3067\u4F7F\u7528\u3059\u308B\u30D7\u30ED\u30C8\u30B3\u30EB\u5F62\u5F0F",
  "localEndpoint": "\u30ED\u30FC\u30AB\u30EB\u30B5\u30FC\u30D0\u30FC\u306E\u30A8\u30F3\u30C9\u30DD\u30A4\u30F3\u30C8",
  "localEndpointOllamaDesc": "Ollama\u30CD\u30A4\u30C6\u30A3\u30D6\u306E\u30C1\u30E3\u30C3\u30C8URL\uFF08\u30C7\u30D5\u30A9\u30EB\u30C8: http://127.0.0.1:11434/api/chat\uFF09",
  "localEndpointOpenAiDesc": "\u30ED\u30FC\u30AB\u30EB\u74B0\u5883\u306EOpenAI\u4E92\u63DB\u30C1\u30E3\u30C3\u30C8URL",
  "localPresets": "\u30D7\u30EA\u30BB\u30C3\u30C8: ",
  "localApiKeyDesc": "\u30ED\u30FC\u30AB\u30EBLLM\u7528\uFF08\u4EFB\u610F\uFF09\u3002\u8A8D\u8A3C\u4E0D\u8981\u306E\u5834\u5408\u306F\u7A7A\u6B04\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  "aiModelFamily": "2. \u30E2\u30C7\u30EB\u30D5\u30A1\u30DF\u30EA\u30FC",
  "aiModelFamilyDesc": "OpenRouter\u306E\u30E2\u30C7\u30EB\u30D9\u30F3\u30C0\u30FC\u307E\u305F\u306F\u30A2\u30FC\u30AD\u30C6\u30AF\u30C1\u30E3\u30B0\u30EB\u30FC\u30D7\u3092\u9078\u629E",
  "modelVersion": "3. \u30E2\u30C7\u30EB\u30D0\u30FC\u30B8\u30E7\u30F3",
  "modelVersionDesc": "OpenRouter\u306B\u300C{model}\u300D\u3068\u3057\u3066\u9001\u4FE1\u3055\u308C\u307E\u3059",
  "aiModel": "2. \u30E2\u30C7\u30EB",
  "aiModelDesc": "\u5206\u6790\u306B\u4F7F\u7528\u3059\u308B\u30E2\u30C7\u30EB\uFF08{provider}\uFF09",
  "customModel": "\u30AB\u30B9\u30BF\u30E0\u30E2\u30C7\u30EB\u540D",
  "customModelDesc": "\u30E2\u30C7\u30EBID\u3092\u5165\u529B\uFF08\u4F8B: mistralai/mistral-large\uFF09",
  "aiApiKey": "API\u30AD\u30FC",
  "openRouterApiKeyDesc": "OpenRouter\u306EAPI\u30AD\u30FC\uFF08openrouter.ai/keys\uFF09",
  "providerApiKeyDesc": "{provider}\u306EAPI\u30AD\u30FC",
  "creditStatusTitleLocal": "\u30ED\u30FC\u30AB\u30EBLLM\u63A5\u7D9A\u30B9\u30C6\u30FC\u30BF\u30B9",
  "creditStatusTitleCloud": "AI\u30AF\u30EC\u30B8\u30C3\u30C8\u6B8B\u9AD8",
  "creditCheckingLocal": "\u30ED\u30FC\u30AB\u30EB\u30B5\u30FC\u30D0\u30FC\u63A5\u7D9A\u3092\u78BA\u8A8D\u4E2D...",
  "creditCheckingCloud": "\u30D7\u30ED\u30D0\u30A4\u30C0\u30FC\u6B8B\u9AD8\u3092\u78BA\u8A8D\u4E2D...",
  "refresh": "\u66F4\u65B0",
  "checking": "\u78BA\u8A8D\u4E2D...",
  "remainingBalance": "\u{1F4B0} \u6B8B\u9AD8: {balance} ({status})",
  "providerStatus": "\u2139\uFE0F \u30D7\u30ED\u30D0\u30A4\u30C0\u30FC: {provider} \u2014 {status}",
  "creditCheckFailed": "\u26A0\uFE0F \u6B8B\u9AD8\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F: {error}",
  "processingHeader": "\u51E6\u7406\u3068\u30C1\u30E3\u30F3\u30AF\u5206\u5272",
  "chunkWindowChars": "\u30C1\u30E3\u30F3\u30AF\u30A6\u30A3\u30F3\u30C9\u30A6\u30B5\u30A4\u30BA",
  "chunkWindowCharsDesc": "\u30C1\u30E3\u30F3\u30AF\u3042\u305F\u308A\u306E\u6700\u5927\u6587\u5B57\u6570\uFF08\u7D0430,000\u6587\u5B57 \u2252 8,000\u30C8\u30FC\u30AF\u30F3\uFF09\u3002\u3053\u308C\u3092\u8D85\u3048\u308B\u9577\u6587\u306F\u8907\u6570\u30D1\u30FC\u30C8\u306B\u5206\u5272\u51E6\u7406\u3055\u308C\u307E\u3059\u3002",
  "sectionGridSeconds": "\u30BB\u30AF\u30B7\u30E7\u30F3\u30B0\u30EA\u30C3\u30C9\u9593\u9694",
  "sectionGridSecondsDesc": "\u6A19\u6E96\u30C1\u30E3\u30D7\u30BF\u30FC\u306E\u306A\u3044\u52D5\u753B\u306B\u30C1\u30E3\u30D7\u30BF\u30FC\u30DE\u30C3\u30D7\u3092\u751F\u6210\u3059\u308B\u6642\u9593\u9593\u9694\uFF08\u79D2\u3001\u30C7\u30D5\u30A9\u30EB\u30C8: 300\u79D2 / 5\u5206\uFF09\u3002",
  "maxTokens": "\u6700\u5927\u51FA\u529B\u30C8\u30FC\u30AF\u30F3\u6570",
  "maxTokensDesc": "AI\u547C\u3073\u51FA\u3057\u306B\u5272\u308A\u5F53\u3066\u308B\u6700\u5927\u30C8\u30FC\u30AF\u30F3\u6570\uFF08\u30C7\u30D5\u30A9\u30EB\u30C8: 16384\uFF09\u3002",
  "serverHeader": "\u30B5\u30FC\u30D0\u30FC",
  "serverPort": "\u30B5\u30FC\u30D0\u30FC\u30DD\u30FC\u30C8",
  "serverPortDesc": "Chrome\u62E1\u5F35\u6A5F\u80FD\u3068\u63A5\u7D9A\u3059\u308B\u305F\u3081\u306E\u30ED\u30FC\u30AB\u30EBHTTP\u30B5\u30FC\u30D0\u30FC\u30DD\u30FC\u30C8\uFF08\u518D\u8D77\u52D5\u304C\u5FC5\u8981\uFF09",
  "linksHeader": "\u30EA\u30F3\u30AF\u3068\u30EA\u30BD\u30FC\u30B9",
  "nuteggChromeStoreName": "Chrome Web Store\u306ENutEgg",
  "nuteggChromeStoreDesc": "Google Chrome\u7528NutEgg\u62E1\u5F35\u6A5F\u80FD\u3092\u30A4\u30F3\u30B9\u30C8\u30FC\u30EB\u307E\u305F\u306F\u66F4\u65B0\u3057\u307E\u3059\u3002",
  "openChromeWebStore": "Chrome Web Store\u3092\u958B\u304F \u2197",
  "nuteggObsidianPluginName": "Obsidian\u30B3\u30DF\u30E5\u30CB\u30C6\u30A3\u30D7\u30E9\u30B0\u30A4\u30F3\u306ENutEgg",
  "nuteggObsidianPluginDesc": "Obsidian\u30B3\u30DF\u30E5\u30CB\u30C6\u30A3\u30D7\u30E9\u30B0\u30A4\u30F3\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u3067NutEgg\u3092\u78BA\u8A8D\u3057\u307E\u3059\u3002",
  "openObsidianDirectory": "Obsidian\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u3092\u958B\u304F \u2197",
  "cmdNewEgg": "\u65B0\u3057\u3044Egg\u30D5\u30A1\u30A4\u30EB\u3092\u4F5C\u6210",
  "cmdOpenIndex": "\u30A4\u30F3\u30C7\u30C3\u30AF\u30B9\u30D5\u30A1\u30A4\u30EB\u3092\u958B\u304F",
  "cmdMergeCurrent": "\u73FE\u5728\u306EEgg\u3067\u672A\u51E6\u7406\u30A8\u30F3\u30C8\u30EA\u3092\u30DE\u30FC\u30B8",
  "cmdCheckCredit": "AI\u30D7\u30ED\u30D0\u30A4\u30C0\u30FC\u306E\u30AF\u30EC\u30B8\u30C3\u30C8\u6B8B\u9AD8\u3092\u78BA\u8A8D",
  "cmdUseDefaultWorkflowPrompts": "\u30C7\u30D5\u30A9\u30EB\u30C8\u306E\u30D7\u30ED\u30F3\u30D7\u30C8\u3092\u4F7F\u7528\uFF08\u65E2\u5B58\u3092\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\uFF09",
  "cmdReportBug": "GitHub\u3067\u30D0\u30B0\u3092\u5831\u544A",
  "ribbonOpenIndex": "NutEgg: \u30A4\u30F3\u30C7\u30C3\u30AF\u30B9\u3092\u958B\u304F",
  "ribbonCheckCredit": "NutEgg: AI\u30AF\u30EC\u30B8\u30C3\u30C8\u6B8B\u9AD8\u3092\u78BA\u8A8D",
  "serverStarted": "NutEgg\u30B5\u30FC\u30D0\u30FC\u304C\u30DD\u30FC\u30C8{port}\u3067\u8D77\u52D5\u3057\u307E\u3057\u305F",
  "serverFailed": "NutEgg: \u30B5\u30FC\u30D0\u30FC\u306E\u8D77\u52D5\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002\u8A73\u7D30\u306F\u30B3\u30F3\u30BD\u30FC\u30EB\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  "indexNotFound": "NutEgg: {path}\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002Egg\u30A2\u30A4\u30B3\u30F3\u3092\u30AF\u30EA\u30C3\u30AF\u3057\u3066\u4F5C\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  "noActiveFile": "NutEgg: \u30A2\u30AF\u30C6\u30A3\u30D6\u306A\u30D5\u30A1\u30A4\u30EB\u304C\u3042\u308A\u307E\u305B\u3093",
  "notEggNote": "NutEgg: \u30A2\u30AF\u30C6\u30A3\u30D6\u306A\u30D5\u30A1\u30A4\u30EB\u306FEgg\u30CE\u30FC\u30C8\u3067\u306F\u3042\u308A\u307E\u305B\u3093",
  "mergingEntries": "NutEgg: {name}\u306E\u672A\u51E6\u7406\u30A8\u30F3\u30C8\u30EA\u3092\u30DE\u30FC\u30B8\u4E2D...",
  "mergedEntries": "[NutEgg] {count}\u4EF6\u306E\u30A8\u30F3\u30C8\u30EA\u3092\u77E5\u8B58\u30C4\u30EA\u30FC\u306B\u30DE\u30FC\u30B8\u3057\u307E\u3057\u305F",
  "noUnprocessed": "[NutEgg] \u30DE\u30FC\u30B8\u3059\u308B\u672A\u51E6\u7406\u30A8\u30F3\u30C8\u30EA\u304C\u306A\u3044\u304B\u3001\u51E6\u7406\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002",
  "mergeFailed": "[NutEgg] \u30DE\u30FC\u30B8\u5931\u6557: {error}",
  "workflowReset": "[NutEgg] \u30EF\u30FC\u30AF\u30D5\u30ED\u30FC\u3092\u521D\u671F\u72B6\u614B\u306B\u30EA\u30BB\u30C3\u30C8\u3057\u307E\u3057\u305F\u3002\u4EE5\u524D\u306E\u30D5\u30A1\u30A4\u30EB\u306F{folder}\u306B\u9000\u907F\u3055\u308C\u307E\u3057\u305F",
  "eggNameRequired": "NutEgg: \u6709\u52B9\u306AEgg\u540D\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  "eggAlreadyExists": "NutEgg: {path}\u306F\u65E2\u306B\u5B58\u5728\u3057\u307E\u3059\u3002",
  "eggCreated": "NutEgg: {path}\u3092\u4F5C\u6210\u3057\u307E\u3057\u305F",
  "indexSynced": "[NutEgg] \u30A4\u30F3\u30C7\u30C3\u30AF\u30B9\u540C\u671F\u5B8C\u4E86: {summary}",
  "indexAllSynced": "[NutEgg] \u3059\u3079\u3066\u6700\u65B0\u72B6\u614B\u3067\u3059\u3002",
  "indexSyncFailed": "[NutEgg] \u540C\u671F\u306B\u5931\u6557\u3057\u307E\u3057\u305F: {error}",
  "createEggTitle": "\u{1F423} \u65B0\u3057\u3044Egg\u3092\u4F5C\u6210",
  "eggNameLabel": "Egg\u540D\uFF08\u30D5\u30A1\u30A4\u30EB\u540D\uFF09:",
  "eggNamePlaceholder": "\u4F8B: methodology, invest_strategy...",
  "eggDescLabel": "\u8AAC\u660E\uFF08\u3053\u306EEgg\u304C\u30AB\u30D0\u30FC\u3059\u308B\u7BC4\u56F2\uFF09:",
  "eggDescPlaceholder": "\u4F8B: \u5B9F\u8DF5\u7684\u306A\u30E1\u30BD\u30C3\u30C9\u3068\u6226\u8853...",
  "eggLangHint": "\u{1F310} \u6307\u793A\u3068\u51FA\u529B\u306E\u8A00\u8A9E\u306F\u8AAC\u660E\u6587\u306E\u8A00\u8A9E\u306B\u4E00\u81F4\u3057\u307E\u3059\u3002",
  "cancel": "\u30AD\u30E3\u30F3\u30BB\u30EB",
  "createEgg": "Egg\u3092\u4F5C\u6210",
  "creatingEgg": "\u23F3 Egg\u3092\u4F5C\u6210\u4E2D...",
  "mergeUnprocessed": "\u672A\u51E6\u7406\u30CE\u30FC\u30C8\u3092\u30DE\u30FC\u30B8",
  "mergeUnprocessedPlural": "{count}\u4EF6\u306E\u672A\u51E6\u7406\u30CE\u30FC\u30C8\u3092\u30DE\u30FC\u30B8",
  "merging": "\u30DE\u30FC\u30B8\u4E2D...",
  "mergeButtonText": "\u26A1 \u77E5\u8B58\u30C4\u30EA\u30FC\u306B\u30DE\u30FC\u30B8",
  "mergingWithAi": "\u23F3 AI\u3067\u30DE\u30FC\u30B8\u4E2D...",
  "mergedSuccess": "\u2705 \u30DE\u30FC\u30B8\u5B8C\u4E86\uFF01",
  "treeUpToDate": "\u2705 \u77E5\u8B58\u30C4\u30EA\u30FC\u306F\u6700\u65B0\u3067\u3059",
  "unprocessedEntries": "\u{1F95A} \u672A\u51E6\u7406\u306E{entries}\uFF08{count}\u4EF6\uFF09",
  "entrySingle": "\u30A8\u30F3\u30C8\u30EA",
  "entryPlural": "\u30A8\u30F3\u30C8\u30EA",
  "mergeNoChanges": "[NutEgg] \u5909\u66F4\u304C\u306A\u3044\u304B\u3001\u30DE\u30FC\u30B8\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002\u30B3\u30F3\u30BD\u30FC\u30EB\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  "syncIndex": "\u30A4\u30F3\u30C7\u30C3\u30AF\u30B9\u3092\u540C\u671F",
  "syncingIndex": "\u540C\u671F\u4E2D...",
  "newEggButton": "+ \u65B0\u3057\u3044Egg",
  "unprocessedBadge": "\u672A\u51E6\u7406 {count}\u4EF6"
};

// src/i18n/ko.ts
var ko = {
  "settingsTitle": "NutEgg \uC124\uC815",
  "chromeCompanionName": "Chrome \uD655\uC7A5 \uD504\uB85C\uADF8\uB7A8 \uB3D9\uBC18\uC790",
  "chromeCompanionDesc": "\uBE0C\uB77C\uC6B0\uC800\uC5D0\uC11C \uAE30\uC0AC, YouTube \uBE44\uB514\uC624, \uD2B8\uC717\uC744 Obsidian\uC73C\uB85C \uC9C1\uC811 \uCEA1\uCC98\uD558\uACE0 \uBD84\uC11D\uD569\uB2C8\uB2E4.",
  "getChromeExtension": "Chrome \uD655\uC7A5 \uD504\uB85C\uADF8\uB7A8 \uBC1B\uAE30 \u2197",
  "reportBugName": "\uBC84\uADF8 \uBCF4\uACE0",
  "reportBugDesc": "\uBB38\uC81C\uB098 \uC608\uAE30\uCE58 \uC54A\uC740 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uAC70\uB098 \uB3C4\uC6C0\uC774 \uD544\uC694\uD558\uC2E0\uAC00\uC694? GitHub \uC774\uC288\uB97C \uD1B5\uD574 \uC54C\uB824\uC8FC\uC138\uC694.",
  "reportBugBtn": "\u{1F41B} GitHub\uC5D0 \uBC84\uADF8 \uBCF4\uACE0 \u2197",
  "vaultPathsHeader": "\uBCFC\uD2B8 \uACBD\uB85C \uC124\uC815",
  "rawFolder": "\uC6D0\uC2DC \uCF58\uD150\uCE20 \uD3F4\uB354",
  "rawFolderDesc": "\uC800\uC7A5\uB41C \uC6D0\uBCF8 \uC6F9 \uCF58\uD150\uCE20\uAC00 \uBCF4\uAD00\uB418\uB294 \uD3F4\uB354",
  "indexFile": "\uC778\uB371\uC2A4 \uD30C\uC77C",
  "indexFileDesc": "Egg\uC640 Markdown \uD30C\uC77C\uC744 \uB9E4\uD551\uD558\uB294 \uC778\uB371\uC2A4 \uD30C\uC77C",
  "workflowFolder": "\uC6CC\uD06C\uD50C\uB85C\uC6B0 \uC5D4\uC9C4 \uD3F4\uB354",
  "workflowFolderDesc": "AI \uD504\uB86C\uD504\uD2B8, \uC2A4\uD0A4\uB9C8, \uD30C\uC774\uD504\uB77C\uC778 \uADDC\uCE59\uC774 \uC800\uC7A5\uB418\uB294 \uD3F4\uB354",
  "useDefaultWorkflows": "\uAE30\uBCF8 \uC6CC\uD06C\uD50C\uB85C\uC6B0 \uD504\uB86C\uD504\uD2B8 \uBCF5\uC6D0",
  "useDefaultWorkflowsDesc": "nutegg/_workflow\uC758 \uBAA8\uB4E0 \uD30C\uC77C\uC744 _backup/ \uD558\uC704\uC758 \uBC31\uC5C5 \uD3F4\uB354\uB85C \uC774\uB3D9\uD558\uACE0 \uAE68\uB057\uD55C \uAE30\uBCF8 \uD504\uB86C\uD504\uD2B8\uB97C \uBCF5\uC6D0\uD569\uB2C8\uB2E4.",
  "useDefaultsBtn": "\uAE30\uBCF8\uAC12 \uC0AC\uC6A9",
  "devMode": "\uAC1C\uBC1C\uC790 \uBAA8\uB4DC",
  "devModeOn": "\uACE0\uAE09 \uC124\uC815\uC774 \uD65C\uC131\uD654\uB418\uC5C8\uC2B5\uB2C8\uB2E4",
  "devModeOff": "\uACE0\uAE09 \uC124\uC815 \uD45C\uC2DC (AI \uC81C\uACF5\uC5C5\uCCB4, API \uD0A4, \uC11C\uBC84 \uD3EC\uD2B8)",
  "aiModelConfig": "AI \uBAA8\uB378 \uAD6C\uC131",
  "localModelConfig": "\uB85C\uCEEC LLM \uAD6C\uC131",
  "aiProvider": "1. AI \uC81C\uACF5\uC5C5\uCCB4",
  "aiProviderDesc": "\uB85C\uCEEC \uC2E4\uD589\uAE30(Ollama, LM Studio), OpenRouter \uB610\uB294 \uD074\uB77C\uC6B0\uB4DC AI \uC81C\uACF5\uC5C5\uCCB4 \uC120\uD0DD",
  "localApiType": "API \uC720\uD615",
  "localApiTypeDesc": "\uB85C\uCEEC \uC2E4\uD589\uAE30\uC5D0\uC11C \uC0AC\uC6A9\uD558\uB294 \uD504\uB85C\uD1A0\uCF5C \uD615\uC2DD",
  "localEndpoint": "\uB85C\uCEEC \uC11C\uBC84 \uC5D4\uB4DC\uD3EC\uC778\uD2B8",
  "localEndpointOllamaDesc": "Ollama \uAE30\uBCF8 \uCC44\uD305 URL (\uAE30\uBCF8\uAC12: http://127.0.0.1:11434/api/chat)",
  "localEndpointOpenAiDesc": "\uB85C\uCEEC \uC2E4\uD589\uAE30\uC6A9 OpenAI \uD638\uD658 \uCC44\uD305 \uC5D4\uB4DC\uD3EC\uC778\uD2B8",
  "localPresets": "\uD504\uB9AC\uC14B: ",
  "localApiKeyDesc": "\uB85C\uCEEC LLM\uC6A9 (\uC120\uD0DD \uC0AC\uD56D). \uC778\uC99D\uC774 \uD544\uC694 \uC5C6\uB294 \uACBD\uC6B0 \uBE44\uC6CC \uB450\uC138\uC694.",
  "aiModelFamily": "2. \uBAA8\uB378 \uD328\uBC00\uB9AC",
  "aiModelFamilyDesc": "OpenRouter\uC758 \uBAA8\uB378 \uBCA4\uB354 \uB610\uB294 \uC544\uD0A4\uD14D\uCC98 \uADF8\uB8F9 \uC120\uD0DD",
  "modelVersion": "3. \uBAA8\uB378 \uBC84\uC804",
  "modelVersionDesc": 'OpenRouter\uC5D0 "{model}"\uB85C \uC804\uB2EC\uB429\uB2C8\uB2E4',
  "aiModel": "2. \uBAA8\uB378",
  "aiModelDesc": "\uBD84\uC11D\uC5D0 \uC0AC\uC6A9\uD560 \uBAA8\uB378 ({provider})",
  "customModel": "\uC0AC\uC6A9\uC790 \uC9C0\uC815 \uBAA8\uB378 \uC774\uB984",
  "customModelDesc": "\uBAA8\uB378 ID \uC785\uB825 (\uC608: mistralai/mistral-large)",
  "aiApiKey": "API \uD0A4",
  "openRouterApiKeyDesc": "OpenRouter API \uD0A4 (openrouter.ai/keys)",
  "providerApiKeyDesc": "{provider} API \uD0A4",
  "creditStatusTitleLocal": "\uB85C\uCEEC LLM \uC5F0\uACB0 \uC0C1\uD0DC",
  "creditStatusTitleCloud": "AI \uD06C\uB808\uB527 \uBC0F \uC794\uC561",
  "creditCheckingLocal": "\uB85C\uCEEC \uC11C\uBC84 \uC5F0\uACB0 \uD655\uC778 \uC911...",
  "creditCheckingCloud": "\uC81C\uACF5\uC5C5\uCCB4 \uC794\uC561 \uD655\uC778 \uC911...",
  "refresh": "\uC0C8\uB85C\uACE0\uCE68",
  "checking": "\uD655\uC778 \uC911...",
  "remainingBalance": "\u{1F4B0} \uC794\uC561: {balance} ({status})",
  "providerStatus": "\u2139\uFE0F \uC81C\uACF5\uC5C5\uCCB4: {provider} \u2014 {status}",
  "creditCheckFailed": "\u26A0\uFE0F \uD06C\uB808\uB527 \uD655\uC778 \uC2E4\uD328: {error}",
  "processingHeader": "\uCC98\uB9AC \uBC0F \uCCAD\uD0B9",
  "chunkWindowChars": "\uCCAD\uD06C \uC708\uB3C4\uC6B0 \uD06C\uAE30",
  "chunkWindowCharsDesc": "\uCCAD\uD06C\uB2F9 \uCD5C\uB300 \uAE00\uC790 \uC218 (~30,000\uC790 \u2248 8,000\uD1A0\uD070). \uCD08\uACFC\uD558\uB294 \uAE34 \uCF58\uD150\uCE20\uB294 \uC5EC\uB7EC \uBD80\uBD84\uC73C\uB85C \uB098\uB269\uB2C8\uB2E4.",
  "sectionGridSeconds": "\uC139\uC158 \uADF8\uB9AC\uB4DC \uAC04\uACA9",
  "sectionGridSecondsDesc": "\uCC55\uD130 \uC815\uBCF4\uAC00 \uC5C6\uB294 \uC601\uC0C1\uC758 \uCC55\uD130 \uB9F5 \uC0DD\uC131\uC744 \uC704\uD55C \uC2DC\uAC04 \uAC04\uACA9(\uCD08, \uAE30\uBCF8\uAC12: 300\uCD08 / 5\uBD84).",
  "maxTokens": "\uCD5C\uB300 \uC644\uB8CC \uD1A0\uD070 \uC218",
  "maxTokensDesc": "AI \uC751\uB2F5\uC5D0 \uD560\uB2F9\uB41C \uCD5C\uB300 \uD1A0\uD070 \uC218 (\uAE30\uBCF8\uAC12: 16384).",
  "serverHeader": "\uC11C\uBC84",
  "serverPort": "\uC11C\uBC84 \uD3EC\uD2B8",
  "serverPortDesc": "Chrome \uD655\uC7A5 \uD504\uB85C\uADF8\uB7A8\uACFC \uC5F0\uACB0\uD558\uB294 \uB85C\uCEEC HTTP \uC11C\uBC84 \uD3EC\uD2B8 (\uC7AC\uC2DC\uC791 \uD544\uC694)",
  "linksHeader": "\uB9C1\uD06C \uBC0F \uB9AC\uC18C\uC2A4",
  "nuteggChromeStoreName": "Chrome \uC6F9 \uC2A4\uD1A0\uC5B4\uC758 NutEgg",
  "nuteggChromeStoreDesc": "Google Chrome\uC6A9 NutEgg \uD655\uC7A5 \uD504\uB85C\uADF8\uB7A8\uC744 \uC124\uCE58\uD558\uAC70\uB098 \uC5C5\uB370\uC774\uD2B8\uD569\uB2C8\uB2E4.",
  "openChromeWebStore": "Chrome \uC6F9 \uC2A4\uD1A0\uC5B4 \uC5F4\uAE30 \u2197",
  "nuteggObsidianPluginName": "Obsidian \uCEE4\uBBA4\uB2C8\uD2F0 \uD50C\uB7EC\uADF8\uC778\uC758 NutEgg",
  "nuteggObsidianPluginDesc": "Obsidian \uCEE4\uBBA4\uB2C8\uD2F0 \uD50C\uB7EC\uADF8\uC778 \uB514\uB809\uD130\uB9AC\uC5D0\uC11C NutEgg\uB97C \uD655\uC778\uD569\uB2C8\uB2E4.",
  "openObsidianDirectory": "Obsidian \uB514\uB809\uD130\uB9AC \uC5F4\uAE30 \u2197",
  "cmdNewEgg": "\uC0C8 Egg \uD30C\uC77C \uC0DD\uC131",
  "cmdOpenIndex": "\uC778\uB371\uC2A4 \uD30C\uC77C \uC5F4\uAE30",
  "cmdMergeCurrent": "\uD604\uC7AC Egg\uC758 \uBBF8\uCC98\uB9AC \uD56D\uBAA9 \uBCD1\uD569",
  "cmdCheckCredit": "AI \uC81C\uACF5\uC5C5\uCCB4 \uD06C\uB808\uB527 \uBC0F \uC794\uC561 \uD655\uC778",
  "cmdUseDefaultWorkflowPrompts": "\uAE30\uBCF8 \uC6CC\uD06C\uD50C\uB85C\uC6B0 \uD504\uB86C\uD504\uD2B8 \uBCF5\uC6D0 (\uAE30\uC874 \uBC31\uC5C5)",
  "cmdReportBug": "GitHub\uC5D0 \uBC84\uADF8 \uBCF4\uACE0",
  "ribbonOpenIndex": "NutEgg: \uC778\uB371\uC2A4 \uC5F4\uAE30",
  "ribbonCheckCredit": "NutEgg: AI \uD06C\uB808\uB527 \uD655\uC778",
  "serverStarted": "NutEgg \uC11C\uBC84\uAC00 \uD3EC\uD2B8 {port}\uC5D0\uC11C \uC2DC\uC791\uB418\uC5C8\uC2B5\uB2C8\uB2E4",
  "serverFailed": "NutEgg: \uC11C\uBC84 \uC2DC\uC791 \uC2E4\uD328. \uCF58\uC194 \uB85C\uADF8\uB97C \uD655\uC778\uD558\uC138\uC694.",
  "indexNotFound": "NutEgg: {path} \uD30C\uC77C\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. Egg \uC544\uC774\uCF58\uC744 \uD074\uB9AD\uD558\uC5EC \uC0DD\uC131\uD558\uC138\uC694.",
  "noActiveFile": "NutEgg: \uD65C\uC131\uD654\uB41C \uD30C\uC77C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4",
  "notEggNote": "NutEgg: \uD65C\uC131 \uD30C\uC77C\uC774 Egg \uB178\uD2B8\uAC00 \uC544\uB2D9\uB2C8\uB2E4",
  "mergingEntries": "NutEgg: {name}\uC758 \uBBF8\uCC98\uB9AC \uD56D\uBAA9 \uBCD1\uD569 \uC911...",
  "mergedEntries": "[NutEgg] {count}\uAC1C \uD56D\uBAA9\uC744 \uC9C0\uC2DD \uD2B8\uB9AC\uC5D0 \uBCD1\uD569\uD588\uC2B5\uB2C8\uB2E4",
  "noUnprocessed": "[NutEgg] \uBCD1\uD569\uD560 \uBBF8\uCC98\uB9AC \uD56D\uBAA9\uC774 \uC5C6\uAC70\uB098 \uCC98\uB9AC\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.",
  "mergeFailed": "[NutEgg] \uBCD1\uD569 \uC2E4\uD328: {error}",
  "workflowReset": "[NutEgg] \uC6CC\uD06C\uD50C\uB85C\uC6B0\uB97C \uAE30\uBCF8\uAC12\uC73C\uB85C \uC7AC\uC124\uC815\uD588\uC2B5\uB2C8\uB2E4. \uAE30\uC874 \uD30C\uC77C\uC740 {folder}\uB85C \uC774\uB3D9\uB418\uC5C8\uC2B5\uB2C8\uB2E4",
  "eggNameRequired": "NutEgg: \uC62C\uBC14\uB978 Egg \uC774\uB984\uC744 \uC785\uB825\uD558\uC138\uC694.",
  "eggAlreadyExists": "NutEgg: {path} \uD30C\uC77C\uC774 \uC774\uBBF8 \uC874\uC7AC\uD569\uB2C8\uB2E4.",
  "eggCreated": "NutEgg: {path} \uD30C\uC77C \uC0DD\uC131 \uC644\uB8CC",
  "indexSynced": "[NutEgg] \uC778\uB371\uC2A4 \uB3D9\uAE30\uD654 \uC644\uB8CC: {summary}",
  "indexAllSynced": "[NutEgg] \uBAA8\uB4E0 \uD56D\uBAA9\uC774 \uCD5C\uC2E0 \uC0C1\uD0DC\uC785\uB2C8\uB2E4.",
  "indexSyncFailed": "[NutEgg] \uB3D9\uAE30\uD654 \uC2E4\uD328: {error}",
  "createEggTitle": "\u{1F423} \uC0C8 Egg \uC0DD\uC131",
  "eggNameLabel": "Egg \uC774\uB984 (\uD30C\uC77C\uBA85):",
  "eggNamePlaceholder": "\uC608: methodology, invest_strategy...",
  "eggDescLabel": "\uC124\uBA85 (\uB2E4\uB8E8\uB294 \uBC94\uC704):",
  "eggDescPlaceholder": "\uC608: \uC2E4\uC804 \uBC29\uBC95\uB860\uACFC \uC804\uB7B5...",
  "eggLangHint": "\u{1F310} \uC9C0\uCE68 \uBC0F \uACB0\uACFC\uBB3C \uC5B8\uC5B4\uB294 \uC124\uBA85 \uC5B8\uC5B4\uC640 \uC77C\uCE58\uD558\uAC8C \uC124\uC815\uB429\uB2C8\uB2E4.",
  "cancel": "\uCDE8\uC18C",
  "createEgg": "Egg \uC0DD\uC131",
  "creatingEgg": "\u23F3 Egg \uC0DD\uC131 \uC911...",
  "mergeUnprocessed": "\uBBF8\uCC98\uB9AC \uB178\uD2B8 \uBCD1\uD569",
  "mergeUnprocessedPlural": "{count}\uAC1C \uBBF8\uCC98\uB9AC \uB178\uD2B8 \uBCD1\uD569",
  "merging": "\uBCD1\uD569 \uC911...",
  "mergeButtonText": "\u26A1 \uC9C0\uC2DD \uD2B8\uB9AC\uC5D0 \uBCD1\uD569",
  "mergingWithAi": "\u23F3 AI\uB85C \uBCD1\uD569 \uC911...",
  "mergedSuccess": "\u2705 \uBCD1\uD569 \uC644\uB8CC!",
  "treeUpToDate": "\u2705 \uC9C0\uC2DD \uD2B8\uB9AC\uAC00 \uCD5C\uC2E0 \uC0C1\uD0DC\uC785\uB2C8\uB2E4",
  "unprocessedEntries": "\u{1F95A} {count}\uAC1C \uBBF8\uCC98\uB9AC {entries}",
  "entrySingle": "\uD56D\uBAA9",
  "entryPlural": "\uD56D\uBAA9",
  "mergeNoChanges": "[NutEgg] \uBCC0\uACBD \uC0AC\uD56D\uC774 \uC5C6\uAC70\uB098 \uBCD1\uD569\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4. \uCF58\uC194\uC744 \uD655\uC778\uD558\uC138\uC694.",
  "syncIndex": "\uC778\uB371\uC2A4 \uB3D9\uAE30\uD654",
  "syncingIndex": "\uB3D9\uAE30\uD654 \uC911...",
  "newEggButton": "+ \uC0C8 Egg",
  "unprocessedBadge": "{count}\uAC1C \uBBF8\uCC98\uB9AC"
};

// src/i18n/ar.ts
var ar = {
  "settingsTitle": "\u0625\u0639\u062F\u0627\u062F\u0627\u062A NutEgg",
  "chromeCompanionName": "\u0625\u0636\u0627\u0641\u0629 \u0645\u062A\u0635\u0641\u062D Chrome \u0627\u0644\u0645\u0631\u0627\u0641\u0642\u0629",
  "chromeCompanionDesc": "\u0627\u0644\u062A\u0642\u0637 \u0627\u0644\u0645\u0642\u0627\u0644\u0627\u062A \u0648\u0641\u064A\u062F\u064A\u0648\u0647\u0627\u062A YouTube \u0648\u0627\u0644\u062A\u063A\u0631\u064A\u062F\u0627\u062A \u0648\u062D\u0644\u0644\u0647\u0627 \u0645\u0628\u0627\u0634\u0631\u0629 \u0645\u0646 \u0645\u062A\u0635\u0641\u062D\u0643 \u0625\u0644\u0649 Obsidian.",
  "getChromeExtension": "\u0627\u0644\u062D\u0635\u0648\u0644 \u0639\u0644\u0649 \u0625\u0636\u0627\u0641\u0629 Chrome \u2197",
  "reportBugName": "\u0627\u0644\u0625\u0628\u0644\u0627\u063A \u0639\u0646 \u062E\u0637\u0623",
  "reportBugDesc": "\u0647\u0644 \u0648\u0627\u062C\u0647\u062A \u0645\u0634\u0643\u0644\u0629 \u0623\u0648 \u062E\u0637\u0623 \u063A\u064A\u0631 \u0645\u062A\u0648\u0642\u0639\u061F \u062A\u0648\u0627\u0635\u0644 \u0645\u0639\u0646\u0627 \u0639\u0628\u0631 GitHub.",
  "reportBugBtn": "\u{1F41B} \u0627\u0644\u0625\u0628\u0644\u0627\u063A \u0639\u0646 \u062E\u0637\u0623 \u0641\u064A GitHub \u2197",
  "vaultPathsHeader": "\u0645\u0633\u0627\u0631\u0627\u062A \u0627\u0644\u062E\u0632\u0627\u0646\u0629",
  "rawFolder": "\u0645\u062C\u0644\u062F \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u062E\u0627\u0645",
  "rawFolderDesc": "\u0645\u062C\u0644\u062F \u0644\u062D\u0641\u0638 \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u062E\u0627\u0645 \u0627\u0644\u0645\u0644\u062A\u0642\u0637",
  "indexFile": "\u0645\u0644\u0641 \u0627\u0644\u0641\u0647\u0631\u0633",
  "indexFileDesc": "\u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0630\u064A \u064A\u0631\u0628\u0637 \u0627\u0644\u0640 eggs \u0628\u0645\u0644\u0641\u0627\u062A markdown \u0627\u0644\u062E\u0627\u0635\u0629 \u0628\u0647\u0627",
  "workflowFolder": "\u0645\u062C\u0644\u062F \u0645\u062D\u0631\u0643 \u0633\u064A\u0631 \u0627\u0644\u0639\u0645\u0644",
  "workflowFolderDesc": "\u0645\u062C\u0644\u062F \u062D\u0641\u0638 \u062A\u0648\u062C\u064A\u0647\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0648\u0627\u0644\u0642\u0648\u0627\u0639\u062F \u0643\u0645\u0644\u0641\u0627\u062A markdown \u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u062A\u0639\u062F\u064A\u0644",
  "useDefaultWorkflows": "\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u062A\u0648\u062C\u064A\u0647\u0627\u062A \u0633\u064A\u0631 \u0627\u0644\u0639\u0645\u0644 \u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A\u0629",
  "useDefaultWorkflowsDesc": "\u064A\u0646\u0642\u0644 \u0627\u0644\u0645\u0644\u0641\u0627\u062A \u0627\u0644\u062D\u0627\u0644\u064A\u0629 \u0625\u0644\u0649 \u0645\u062C\u0644\u062F \u0646\u0633\u062E \u0627\u062D\u062A\u064A\u0627\u0637\u064A \u0645\u0624\u0631\u062E \u0641\u064A _backup/ \u0648\u064A\u0633\u062A\u0639\u064A\u062F \u0627\u0644\u062A\u0648\u062C\u064A\u0647\u0627\u062A \u0627\u0644\u0623\u0635\u0644\u064A\u0629.",
  "useDefaultsBtn": "\u0627\u0633\u062A\u0639\u0627\u062F\u0629 \u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A",
  "devMode": "\u0648\u0636\u0639 \u0627\u0644\u0645\u0637\u0648\u0631",
  "devModeOn": "\u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0645\u062A\u0642\u062F\u0645\u0629 \u0645\u0631\u0626\u064A\u0629 \u0623\u062F\u0646\u0627\u0647",
  "devModeOff": "\u0625\u0638\u0647\u0627\u0631 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0645\u062A\u0642\u062F\u0645\u0629 (\u0645\u0632\u0648\u062F \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A\u060C \u0645\u0641\u062A\u0627\u062D API\u060C \u0645\u0646\u0641\u0630 \u0627\u0644\u062E\u0627\u062F\u0645)",
  "aiModelConfig": "\u062A\u0643\u0648\u064A\u0646 \u0646\u0645\u0648\u0630\u062C \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A",
  "localModelConfig": "\u062A\u0643\u0648\u064A\u0646 \u0627\u0644\u0646\u0645\u0648\u0630\u062C \u0627\u0644\u0645\u062D\u0644\u064A (Local LLM)",
  "aiProvider": "1. \u0645\u0632\u0648\u062F \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A",
  "aiProviderDesc": "\u0627\u062E\u062A\u0631 \u0645\u0634\u063A\u0644\u0627\u064B \u0645\u062D\u0644\u064A\u0627\u064B (Ollama, LM Studio)\u060C OpenRouter \u0623\u0648 \u0645\u0632\u0648\u062F\u0627\u064B \u0633\u062D\u0627\u0628\u064A\u0627\u064B",
  "localApiType": "\u0646\u0648\u0639 API",
  "localApiTypeDesc": "\u0635\u064A\u063A\u0629 \u0627\u0644\u0628\u0631\u0648\u062A\u0648\u0643\u0648\u0644 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u0629 \u0645\u0646 \u0627\u0644\u0645\u0634\u063A\u0644 \u0627\u0644\u0645\u062D\u0644\u064A",
  "localEndpoint": "\u0646\u0642\u0637\u0629 \u0646\u0647\u0627\u064A\u0629 \u0627\u0644\u062E\u0627\u062F\u0645 \u0627\u0644\u0645\u062D\u0644\u064A",
  "localEndpointOllamaDesc": "\u0639\u0646\u0648\u0627\u0646 URL \u0644\u0645\u062D\u0627\u062F\u062B\u0629 Ollama \u0627\u0644\u0623\u0635\u0644\u064A (\u0627\u0641\u062A\u0631\u0627\u0636\u064A: http://127.0.0.1:11434/api/chat)",
  "localEndpointOpenAiDesc": "\u0639\u0646\u0648\u0627\u0646 URL \u0645\u062A\u0648\u0627\u0641\u0642 \u0645\u0639 OpenAI \u0644\u0644\u0645\u0634\u063A\u0644 \u0627\u0644\u0645\u062D\u0644\u064A",
  "localPresets": "\u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0645\u0633\u0628\u0642\u0629: ",
  "localApiKeyDesc": "\u0627\u062E\u062A\u064A\u0627\u0631\u064A \u0644\u0644\u0646\u0645\u0627\u0630\u062C \u0627\u0644\u0645\u062D\u0644\u064A\u0629. \u0627\u062A\u0631\u0643\u0647 \u0641\u0627\u0631\u063A\u0627\u064B \u0625\u0630\u0627 \u0644\u0645 \u064A\u062A\u0637\u0644\u0628 \u062E\u0627\u062F\u0645\u0643 \u0645\u0635\u0627\u062F\u0642\u0629.",
  "aiModelFamily": "2. \u0639\u0627\u0626\u0644\u0629 \u0627\u0644\u0646\u0645\u0648\u0630\u062C",
  "aiModelFamilyDesc": "\u0627\u062E\u062A\u0631 \u0645\u0648\u0641\u0631 \u0627\u0644\u0646\u0645\u0648\u0630\u062C \u0623\u0648 \u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u0628\u0646\u064A\u0629 \u0641\u064A OpenRouter",
  "modelVersion": "3. \u0625\u0635\u062F\u0627\u0631 \u0627\u0644\u0646\u0645\u0648\u0630\u062C",
  "modelVersionDesc": '\u064A\u062A\u0645 \u0625\u0631\u0633\u0627\u0644\u0647 \u0625\u0644\u0649 OpenRouter \u0628\u0627\u0633\u0645 "{model}"',
  "aiModel": "2. \u0627\u0644\u0646\u0645\u0648\u0630\u062C",
  "aiModelDesc": "\u0627\u0644\u0646\u0645\u0648\u0630\u062C \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0644\u0644\u062A\u062D\u0644\u064A\u0644 ({provider})",
  "customModel": "\u0627\u0633\u0645 \u0646\u0645\u0648\u0630\u062C \u0645\u062E\u0635\u0635",
  "customModelDesc": "\u0623\u062F\u062E\u0644 \u0645\u0639\u0631\u0651\u0641 \u0627\u0644\u0646\u0645\u0648\u0630\u062C (\u0645\u062B\u0627\u0644: mistralai/mistral-large)",
  "aiApiKey": "\u0645\u0641\u062A\u0627\u062D API",
  "openRouterApiKeyDesc": "\u0645\u0641\u062A\u0627\u062D API \u0627\u0644\u062E\u0627\u0635 \u0628\u0643 \u0641\u064A OpenRouter (openrouter.ai/keys)",
  "providerApiKeyDesc": "\u0645\u0641\u062A\u0627\u062D API \u0644\u0640 {provider}",
  "creditStatusTitleLocal": "\u062D\u0627\u0644\u0629 \u0627\u062A\u0635\u0627\u0644 \u0627\u0644\u0646\u0645\u0648\u0630\u062C \u0627\u0644\u0645\u062D\u0644\u064A",
  "creditStatusTitleCloud": "\u0631\u0635\u064A\u062F \u0648\u0631\u0635\u064A\u062F \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A",
  "creditCheckingLocal": "\u062C\u0627\u0631\u064D \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u062A\u0635\u0627\u0644 \u0627\u0644\u062E\u0627\u062F\u0645 \u0627\u0644\u0645\u062D\u0644\u064A...",
  "creditCheckingCloud": "\u062C\u0627\u0631\u064D \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0631\u0635\u064A\u062F \u0627\u0644\u062D\u0633\u0627\u0628 \u0644\u062F\u0649 \u0627\u0644\u0645\u0632\u0648\u062F...",
  "refresh": "\u062A\u062D\u062F\u064A\u062B",
  "checking": "\u062C\u0627\u0631\u064D \u0627\u0644\u062A\u062D\u0642\u0642...",
  "remainingBalance": "\u{1F4B0} \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0645\u062A\u0628\u0642\u064A: {balance} ({status})",
  "providerStatus": "\u2139\uFE0F \u0627\u0644\u0645\u0632\u0648\u062F: {provider} \u2014 {status}",
  "creditCheckFailed": "\u26A0\uFE0F \u0641\u0634\u0644 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0631\u0635\u064A\u062F: {error}",
  "processingHeader": "\u0627\u0644\u0645\u0639\u0627\u0644\u062C\u0629 \u0648\u0627\u0644\u062A\u0642\u0633\u064A\u0645",
  "chunkWindowChars": "\u062D\u062C\u0645 \u0646\u0627\u0641\u0630\u0629 \u0627\u0644\u062A\u0642\u0633\u064A\u0645 \u0627\u0644\u0639\u0627\u0645\u0629",
  "chunkWindowCharsDesc": "\u0627\u0644\u062D\u062F \u0627\u0644\u0623\u0642\u0635\u0649 \u0644\u0639\u062F\u062F \u0627\u0644\u0623\u062D\u0631\u0641 \u0644\u0643\u0644 \u062C\u0632\u0621 (~30,000 \u062D\u0631\u0641 \u2248 8,000 \u062A\u0648\u0643\u0646). \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u0623\u0637\u0648\u0644 \u064A\u064F\u0642\u0633\u0645 \u0625\u0644\u0649 \u0623\u062C\u0632\u0627\u0621.",
  "sectionGridSeconds": "\u0641\u0627\u0635\u0644 \u0634\u0628\u0643\u0629 \u0627\u0644\u0623\u0642\u0633\u0627\u0645",
  "sectionGridSecondsDesc": "\u0627\u0644\u0641\u0627\u0635\u0644 \u0627\u0644\u0632\u0645\u0646\u064A \u0628\u0627\u0644\u062B\u0648\u0627\u0646\u064A (\u0627\u0641\u062A\u0631\u0627\u0636\u064A: 300 \u062B / 5 \u062F\u0642\u0627\u0626\u0642) \u0644\u062A\u0648\u0644\u064A\u062F \u062E\u0631\u064A\u0637\u0629 \u0627\u0644\u0641\u0635\u0648\u0644 \u0644\u0644\u0641\u064A\u062F\u064A\u0648\u0647\u0627\u062A \u0628\u062F\u0648\u0646 \u0641\u0635\u0648\u0644 \u0623\u0635\u0644\u064A\u0629.",
  "maxTokens": "\u0627\u0644\u062D\u062F \u0627\u0644\u0623\u0642\u0635\u0649 \u0644\u062A\u0648\u0643\u0646\u0627\u062A \u0627\u0644\u0625\u062E\u0631\u0627\u062C",
  "maxTokensDesc": "\u0627\u0644\u062D\u062F \u0627\u0644\u0623\u0642\u0635\u0649 \u0644\u062A\u0648\u0643\u0646\u0627\u062A \u0627\u0644\u0625\u062E\u0631\u0627\u062C \u0627\u0644\u0645\u062E\u0635\u0635\u0629 \u0644\u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A (\u0627\u0641\u062A\u0631\u0627\u0636\u064A: 16384).",
  "serverHeader": "\u0627\u0644\u062E\u0627\u062F\u0645",
  "serverPort": "\u0645\u0646\u0641\u0630 \u0627\u0644\u062E\u0627\u062F\u0645",
  "serverPortDesc": "\u0645\u0646\u0641\u0630 \u062E\u0627\u062F\u0645 HTTP \u0627\u0644\u0645\u062D\u0644\u064A \u0644\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0625\u0636\u0627\u0641\u0629 Chrome (\u064A\u062A\u0637\u0644\u0628 \u0625\u0639\u0627\u062F\u0629 \u062A\u0634\u063A\u064A\u0644)",
  "linksHeader": "\u0627\u0644\u0631\u0648\u0627\u0628\u0637 \u0648\u0627\u0644\u0645\u0648\u0627\u0631\u062F",
  "nuteggChromeStoreName": "NutEgg \u0639\u0644\u0649 \u0645\u062A\u062C\u0631 Chrome \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A",
  "nuteggChromeStoreDesc": "\u062A\u062B\u0628\u064A\u062A \u0623\u0648 \u062A\u062D\u062F\u064A\u062B \u0625\u0636\u0627\u0641\u0629 NutEgg \u0644\u0645\u062A\u0635\u0641\u062D Google Chrome.",
  "openChromeWebStore": "\u0641\u062A\u062D \u0645\u062A\u062C\u0631 Chrome \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u2197",
  "nuteggObsidianPluginName": "NutEgg \u0641\u064A \u0645\u062A\u062C\u0631 \u0625\u0636\u0627\u0641\u0627\u062A Obsidian",
  "nuteggObsidianPluginDesc": "\u0639\u0631\u0636 NutEgg \u0641\u064A \u062F\u0644\u064A\u0644 \u0625\u0636\u0627\u0641\u0627\u062A \u0645\u062C\u062A\u0645\u0639 Obsidian.",
  "openObsidianDirectory": "\u0641\u062A\u062D \u062F\u0644\u064A\u0644 Obsidian \u2197",
  "cmdNewEgg": "\u0625\u0646\u0634\u0627\u0621 \u0645\u0644\u0641 egg \u062C\u062F\u064A\u062F",
  "cmdOpenIndex": "\u0641\u062A\u062D \u0645\u0644\u0641 \u0627\u0644\u0641\u0647\u0631\u0633",
  "cmdMergeCurrent": "\u062F\u0645\u062C \u0627\u0644\u0639\u0646\u0627\u0635\u0631 \u063A\u064A\u0631 \u0627\u0644\u0645\u0639\u0627\u0644\u062C\u0629 \u0641\u064A \u0627\u0644\u0640 egg \u0627\u0644\u062D\u0627\u0644\u064A",
  "cmdCheckCredit": "\u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0631\u0635\u064A\u062F \u0645\u0632\u0648\u062F \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A",
  "cmdUseDefaultWorkflowPrompts": "\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u062A\u0648\u062C\u064A\u0647\u0627\u062A \u0633\u064A\u0631 \u0627\u0644\u0639\u0645\u0644 \u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A\u0629 (\u0646\u0633\u062E \u0627\u062D\u062A\u064A\u0627\u0637\u064A \u0644\u0644\u062D\u0627\u0644\u064A\u0629)",
  "cmdReportBug": "\u0627\u0644\u0625\u0628\u0644\u0627\u063A \u0639\u0646 \u062E\u0637\u0623 \u0641\u064A GitHub",
  "ribbonOpenIndex": "NutEgg: \u0641\u062A\u062D \u0627\u0644\u0641\u0647\u0631\u0633",
  "ribbonCheckCredit": "NutEgg: \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0631\u0635\u064A\u062F \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A",
  "serverStarted": "\u062A\u0645 \u062A\u0634\u063A\u064A\u0644 \u062E\u0627\u062F\u0645 NutEgg \u0639\u0644\u0649 \u0627\u0644\u0645\u0646\u0641\u0630 {port}",
  "serverFailed": "NutEgg: \u0641\u0634\u0644 \u0628\u062F\u0621 \u062A\u0634\u063A\u064A\u0644 \u0627\u0644\u062E\u0627\u062F\u0645. \u062A\u062D\u0642\u0642 \u0645\u0646 \u0648\u062D\u062F\u0629 \u0627\u0644\u062A\u062D\u0643\u0645 \u0644\u0644\u062A\u0641\u0627\u0635\u064A\u0644.",
  "indexNotFound": "NutEgg: \u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 {path}. \u0627\u0646\u0642\u0631 \u0639\u0644\u0649 \u0623\u064A\u0642\u0648\u0646\u0629 \u0627\u0644\u0640 egg \u0644\u0625\u0646\u0634\u0627\u0626\u0647.",
  "noActiveFile": "NutEgg: \u0644\u0627 \u064A\u0648\u062C\u062F \u0645\u0644\u0641 \u0646\u0634\u0637",
  "notEggNote": "NutEgg: \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0646\u0634\u0637 \u0644\u064A\u0633 \u0645\u0644\u0627\u062D\u0638\u0629 egg",
  "mergingEntries": "NutEgg: \u062C\u0627\u0631\u064D \u062F\u0645\u062C \u0627\u0644\u0639\u0646\u0627\u0635\u0631 \u063A\u064A\u0631 \u0627\u0644\u0645\u0639\u0627\u0644\u062C\u0629 \u0641\u064A {name}...",
  "mergedEntries": "[NutEgg] \u062A\u0645 \u062F\u0645\u062C {count} \u0645\u0646 \u0627\u0644\u0639\u0646\u0627\u0635\u0631 \u0641\u064A \u0634\u062C\u0631\u0629 \u0627\u0644\u0645\u0639\u0631\u0641\u0629",
  "noUnprocessed": "[NutEgg] \u0644\u0627 \u062A\u0648\u062C\u062F \u0639\u0646\u0627\u0635\u0631 \u063A\u064A\u0631 \u0645\u0639\u0627\u0644\u062C\u0629 \u0644\u0644\u062F\u0645\u062C \u0623\u0648 \u0641\u0634\u0644\u062A \u0627\u0644\u0639\u0645\u0644\u064A\u0629.",
  "mergeFailed": "[NutEgg] \u0641\u0634\u0644 \u0627\u0644\u062F\u0645\u062C: {error}",
  "workflowReset": "[NutEgg] \u062A\u0645\u062A \u0627\u0633\u062A\u0639\u0627\u062F\u0629 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u062A\u0648\u062C\u064A\u0647\u0627\u062A \u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A\u0629. \u062A\u0645 \u0646\u0642\u0644 \u0627\u0644\u0645\u0644\u0641\u0627\u062A \u0627\u0644\u0633\u0627\u0628\u0642\u0629 \u0625\u0644\u0649 {folder}",
  "eggNameRequired": "NutEgg: \u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0627\u0633\u0645 egg \u0635\u0627\u0644\u062D.",
  "eggAlreadyExists": "NutEgg: {path} \u0645\u0648\u062C\u0648\u062F \u0645\u0633\u0628\u0642\u0627\u064B.",
  "eggCreated": "NutEgg: \u062A\u0645 \u0625\u0646\u0634\u0627\u0621 {path}",
  "indexSynced": "[NutEgg] \u062A\u0645\u062A \u0645\u0632\u0627\u0645\u0646\u0629 \u0627\u0644\u0641\u0647\u0631\u0633: {summary}",
  "indexAllSynced": "[NutEgg] \u0643\u0644 \u0634\u064A\u0621 \u0645\u062A\u0632\u0627\u0645\u0646 \u0628\u0627\u0644\u0643\u0627\u0645\u0644.",
  "indexSyncFailed": "[NutEgg] \u0641\u0634\u0644\u062A \u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629: {error}",
  "createEggTitle": "\u{1F423} \u0625\u0646\u0634\u0627\u0621 Egg \u062C\u062F\u064A\u062F",
  "eggNameLabel": "\u0627\u0633\u0645 \u0627\u0644\u0640 Egg (\u0627\u0633\u0645 \u0627\u0644\u0645\u0644\u0641):",
  "eggNamePlaceholder": "\u0645\u062B\u0627\u0644: methodology, invest_strategy...",
  "eggDescLabel": "\u0627\u0644\u0648\u0635\u0641 (\u0646\u0637\u0627\u0642 \u0645\u0627 \u064A\u063A\u0637\u064A\u0647):",
  "eggDescPlaceholder": "\u0645\u062B\u0627\u0644: \u0627\u0644\u0637\u0631\u0642 \u0627\u0644\u0639\u0645\u0644\u064A\u0629 \u0648\u0627\u0644\u062A\u0643\u062A\u064A\u0643\u0627\u062A...",
  "eggLangHint": "\u{1F310} \u0633\u062A\u062A\u0637\u0627\u0628\u0642 \u0644\u063A\u0629 \u0627\u0644\u062A\u0639\u0644\u064A\u0645\u0627\u062A \u0648\u0627\u0644\u0645\u062E\u0631\u062C\u0627\u062A \u0645\u0639 \u0644\u063A\u0629 \u0627\u0644\u0648\u0635\u0641 \u0627\u0644\u0645\u0643\u062A\u0648\u0628.",
  "cancel": "\u0625\u0644\u063A\u0627\u0621",
  "createEgg": "\u0625\u0646\u0634\u0627\u0621 Egg",
  "creatingEgg": "\u23F3 \u062C\u0627\u0631\u064D \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0640 egg...",
  "mergeUnprocessed": "\u062F\u0645\u062C \u0645\u0644\u0627\u062D\u0638\u0629 \u063A\u064A\u0631 \u0645\u0639\u0627\u0644\u062C\u0629",
  "mergeUnprocessedPlural": "\u062F\u0645\u062C {count} \u0645\u0644\u0627\u062D\u0638\u0627\u062A \u063A\u064A\u0631 \u0645\u0639\u0627\u0644\u062C\u0629",
  "merging": "\u062C\u0627\u0631\u064D \u0627\u0644\u062F\u0645\u062C...",
  "mergeButtonText": "\u26A1 \u062F\u0645\u062C \u0641\u064A \u0634\u062C\u0631\u0629 \u0627\u0644\u0645\u0639\u0631\u0641\u0629",
  "mergingWithAi": "\u23F3 \u062C\u0627\u0631\u064D \u0627\u0644\u062F\u0645\u062C \u0628\u0648\u0627\u0633\u0637\u0629 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A...",
  "mergedSuccess": "\u2705 \u062A\u0645 \u0627\u0644\u062F\u0645\u062C \u0628\u0646\u062C\u0627\u062D!",
  "treeUpToDate": "\u2705 \u0634\u062C\u0631\u0629 \u0627\u0644\u0645\u0639\u0631\u0641\u0629 \u0645\u062D\u062F\u062B\u0629 \u0628\u0627\u0644\u0643\u0627\u0645\u0644",
  "unprocessedEntries": "\u{1F95A} {count} {entries} \u063A\u064A\u0631 \u0645\u0639\u0627\u0644\u062C\u0629",
  "entrySingle": "\u0639\u0646\u0635\u0631",
  "entryPlural": "\u0639\u0646\u0627\u0635\u0631",
  "mergeNoChanges": "[NutEgg] \u0644\u0645 \u064A\u0646\u062A\u062C \u0639\u0646 \u0627\u0644\u062F\u0645\u062C \u0623\u064A \u062A\u063A\u064A\u064A\u0631\u0627\u062A \u0623\u0648 \u062D\u062F\u062B \u062E\u0637\u0623.",
  "syncIndex": "\u0645\u0632\u0627\u0645\u0646\u0629 \u0627\u0644\u0641\u0647\u0631\u0633",
  "syncingIndex": "\u062C\u0627\u0631\u064D \u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629...",
  "newEggButton": "+ Egg \u062C\u062F\u064A\u062F",
  "unprocessedBadge": "{count} \u063A\u064A\u0631 \u0645\u0639\u0627\u0644\u062C"
};

// src/i18n/fr.ts
var fr = {
  "settingsTitle": "Param\xE8tres NutEgg",
  "chromeCompanionName": "Compagnon extension Chrome",
  "chromeCompanionDesc": "Capturez et analysez des articles, vid\xE9os YouTube et tweets directement depuis votre navigateur dans Obsidian.",
  "getChromeExtension": "Obtenir l'extension Chrome \u2197",
  "reportBugName": "Signaler un bug",
  "reportBugDesc": "Un probl\xE8me, un comportement inattendu ou besoin d'aide ? Signalez-le sur GitHub.",
  "reportBugBtn": "\u{1F41B} Signaler un bug sur GitHub \u2197",
  "vaultPathsHeader": "Chemins du coffre",
  "rawFolder": "Dossier du contenu brut",
  "rawFolderDesc": "Dossier de stockage du contenu brut captur\xE9",
  "indexFile": "Fichier d'index",
  "indexFileDesc": "Fichier associant les eggs \xE0 leurs fichiers markdown",
  "workflowFolder": "Dossier du moteur de flux",
  "workflowFolderDesc": "Dossier o\xF9 sont stock\xE9s les prompts IA, sch\xE9mas et r\xE8gles sous forme de fichiers markdown \xE9ditables",
  "useDefaultWorkflows": "Utiliser les prompts de flux par d\xE9faut",
  "useDefaultWorkflowsDesc": "D\xE9place les fichiers actuels de nutegg/_workflow vers un dossier horodat\xE9 sous _backup/ et restaure les versions par d\xE9faut.",
  "useDefaultsBtn": "Restaurer les valeurs par d\xE9faut",
  "devMode": "Mode d\xE9veloppeur",
  "devModeOn": "Les param\xE8tres avanc\xE9s sont visibles ci-dessous",
  "devModeOff": "Afficher les param\xE8tres avanc\xE9s (fournisseur IA, cl\xE9 API, port serveur)",
  "aiModelConfig": "Configuration du mod\xE8le IA",
  "localModelConfig": "Configuration LLM local",
  "aiProvider": "1. Fournisseur d'IA",
  "aiProviderDesc": "Choisissez un moteur local (Ollama, LM Studio), OpenRouter ou un fournisseur cloud",
  "localApiType": "Type d'API",
  "localApiTypeDesc": "Format de protocole utilis\xE9 par votre moteur local",
  "localEndpoint": "Point de terminaison local",
  "localEndpointOllamaDesc": "URL de chat Ollama native (d\xE9faut : http://127.0.0.1:11434/api/chat)",
  "localEndpointOpenAiDesc": "URL compatible OpenAI pour votre moteur local",
  "localPresets": "Pr\xE9r\xE9glages : ",
  "localApiKeyDesc": "Optionnel pour les LLM locaux. Laissez vide si aucune authentification n'est requise.",
  "aiModelFamily": "2. Famille de mod\xE8le",
  "aiModelFamilyDesc": "Choisissez le fournisseur ou groupe d'architecture sur OpenRouter",
  "modelVersion": "3. Version du mod\xE8le",
  "modelVersionDesc": 'Envoy\xE9 \xE0 OpenRouter comme "{model}"',
  "aiModel": "2. Mod\xE8le",
  "aiModelDesc": "Mod\xE8le \xE0 utiliser pour l'analyse ({provider})",
  "customModel": "Nom du mod\xE8le personnalis\xE9",
  "customModelDesc": "Entrez l'identifiant du mod\xE8le (ex. mistralai/mistral-large)",
  "aiApiKey": "Cl\xE9 API",
  "openRouterApiKeyDesc": "Votre cl\xE9 API OpenRouter (openrouter.ai/keys)",
  "providerApiKeyDesc": "Votre cl\xE9 API {provider}",
  "creditStatusTitleLocal": "Statut de connexion LLM local",
  "creditStatusTitleCloud": "Cr\xE9dit & solde IA",
  "creditCheckingLocal": "V\xE9rification de la connexion au serveur local...",
  "creditCheckingCloud": "V\xE9rification du solde aupr\xE8s du fournisseur...",
  "refresh": "Actualiser",
  "checking": "V\xE9rification...",
  "remainingBalance": "\u{1F4B0} Solde restant : {balance} ({status})",
  "providerStatus": "\u2139\uFE0F Fournisseur : {provider} \u2014 {status}",
  "creditCheckFailed": "\u26A0\uFE0F \xC9chec de la v\xE9rification du cr\xE9dit : {error}",
  "processingHeader": "Traitement et d\xE9coupage",
  "chunkWindowChars": "Taille de fen\xEAtre de d\xE9coupage",
  "chunkWindowCharsDesc": "Longueur maximale de caract\xE8res par bloc (~30 000 caract\xE8res \u2248 8 000 tokens). Les longs contenus sont fractionn\xE9s.",
  "sectionGridSeconds": "Intervalle de grille de section",
  "sectionGridSecondsDesc": "Intervalle en secondes (d\xE9faut : 300 s / 5 min) pour g\xE9n\xE9rer des cartes de chapitres pour les vid\xE9os sans chapitrage.",
  "maxTokens": "Tokens de sortie max",
  "maxTokensDesc": "Tokens maximum allou\xE9s aux appels IA (d\xE9faut : 16384).",
  "serverHeader": "Serveur",
  "serverPort": "Port du serveur",
  "serverPortDesc": "Port du serveur HTTP local connect\xE9 \xE0 l'extension Chrome (red\xE9marrage requis)",
  "linksHeader": "Liens et ressources",
  "nuteggChromeStoreName": "NutEgg sur le Chrome Web Store",
  "nuteggChromeStoreDesc": "Installez ou mettez \xE0 jour l'extension NutEgg pour Google Chrome.",
  "openChromeWebStore": "Ouvrir le Chrome Web Store \u2197",
  "nuteggObsidianPluginName": "NutEgg sur les plugins communautaires Obsidian",
  "nuteggObsidianPluginDesc": "Voir NutEgg dans le catalogue des plugins Obsidian.",
  "openObsidianDirectory": "Ouvrir le catalogue Obsidian \u2197",
  "cmdNewEgg": "Cr\xE9er un nouveau fichier egg",
  "cmdOpenIndex": "Ouvrir le fichier d'index",
  "cmdMergeCurrent": "Fusionner les entr\xE9es non trait\xE9es de l'egg actuel",
  "cmdCheckCredit": "V\xE9rifier le cr\xE9dit IA et le solde",
  "cmdUseDefaultWorkflowPrompts": "Utiliser les prompts par d\xE9faut (sauvegarder l'existant)",
  "cmdReportBug": "Signaler un bug sur GitHub",
  "ribbonOpenIndex": "NutEgg : Ouvrir l'index",
  "ribbonCheckCredit": "NutEgg : V\xE9rifier le cr\xE9dit IA",
  "serverStarted": "Serveur NutEgg d\xE9marr\xE9 sur le port {port}",
  "serverFailed": "NutEgg : \xC9chec du d\xE9marrage du serveur. Consultez la console pour plus de d\xE9tails.",
  "indexNotFound": "NutEgg : {path} introuvable. Cliquez sur l'ic\xF4ne egg pour le cr\xE9er.",
  "noActiveFile": "NutEgg : Aucun fichier actif",
  "notEggNote": "NutEgg : Le fichier actif n'est pas une note egg",
  "mergingEntries": "NutEgg : Fusion des entr\xE9es non trait\xE9es dans {name}...",
  "mergedEntries": "[NutEgg] {count} entr\xE9es fusionn\xE9es dans l'arbre de connaissances",
  "noUnprocessed": "[NutEgg] Aucune entr\xE9e non trait\xE9e \xE0 fusionner ou la fusion a \xE9chou\xE9.",
  "mergeFailed": "[NutEgg] \xC9chec de la fusion : {error}",
  "workflowReset": "[NutEgg] Fichiers de flux r\xE9initialis\xE9s. Anciens fichiers d\xE9plac\xE9s vers {folder}",
  "eggNameRequired": "NutEgg : Veuillez entrer un nom d'egg valide.",
  "eggAlreadyExists": "NutEgg : {path} existe d\xE9j\xE0.",
  "eggCreated": "NutEgg : {path} cr\xE9\xE9 avec succ\xE8s",
  "indexSynced": "[NutEgg] Index synchronis\xE9 : {summary}",
  "indexAllSynced": "[NutEgg] Tout est parfaitement synchronis\xE9.",
  "indexSyncFailed": "[NutEgg] \xC9chec de la synchronisation : {error}",
  "createEggTitle": "\u{1F423} Cr\xE9er un nouvel Egg",
  "eggNameLabel": "Nom de l'Egg (nom du fichier) :",
  "eggNamePlaceholder": "ex. methodologie, strategie_investissement...",
  "eggDescLabel": "Description (champ couvert) :",
  "eggDescPlaceholder": "ex. m\xE9thodes pratiques et tactiques...",
  "eggLangHint": "\u{1F310} La langue des instructions correspondra \xE0 la langue de la description.",
  "cancel": "Annuler",
  "createEgg": "Cr\xE9er l'Egg",
  "creatingEgg": "\u23F3 Cr\xE9ation de l'egg...",
  "mergeUnprocessed": "Fusionner la note non trait\xE9e",
  "mergeUnprocessedPlural": "Fusionner {count} notes non trait\xE9es",
  "merging": "Fusion en cours...",
  "mergeButtonText": "\u26A1 Fusionner dans l'arbre de connaissances",
  "mergingWithAi": "\u23F3 Fusion par IA en cours...",
  "mergedSuccess": "\u2705 Fusionn\xE9 !",
  "treeUpToDate": "\u2705 L'arbre de connaissances est \xE0 jour",
  "unprocessedEntries": "\u{1F95A} {count} {entries} non trait\xE9e(s)",
  "entrySingle": "entr\xE9e",
  "entryPlural": "entr\xE9es",
  "mergeNoChanges": "[NutEgg] Aucun changement apport\xE9 ou \xE9chec de la fusion.",
  "syncIndex": "Synchroniser l'index",
  "syncingIndex": "Synchronisation...",
  "newEggButton": "+ Nouvel Egg",
  "unprocessedBadge": "{count} non trait\xE9(s)"
};

// src/i18n/de.ts
var de = {
  "settingsTitle": "NutEgg Einstellungen",
  "chromeCompanionName": "Chrome-Erweiterung Begleiter",
  "chromeCompanionDesc": "Erfasse und analysiere Artikel, YouTube-Videos und Tweets direkt aus deinem Browser in Obsidian.",
  "getChromeExtension": "Chrome-Erweiterung herunterladen \u2197",
  "reportBugName": "Fehler melden",
  "reportBugDesc": "Hast du ein Problem gefunden oder ben\xF6tigst Hilfe? Melde es auf GitHub.",
  "reportBugBtn": "\u{1F41B} Fehler auf GitHub melden \u2197",
  "vaultPathsHeader": "Vault-Pfade",
  "rawFolder": "Rohinhalte-Ordner",
  "rawFolderDesc": "Ordner f\xFCr gespeicherte Rohinhalte",
  "indexFile": "Index-Datei",
  "indexFileDesc": "Datei, die Eggs ihren Markdown-Dateien zuordnet",
  "workflowFolder": "Workflow-Engine-Ordner",
  "workflowFolderDesc": "Ordner, in dem KI-Prompts, Schemas und Pipelineregeln als editierbare Markdown-Dateien gespeichert werden",
  "useDefaultWorkflows": "Standard-Workflow-Prompts verwenden",
  "useDefaultWorkflowsDesc": "Verschiebt alle aktuellen Dateien in nutegg/_workflow in einen datierten Backup-Ordner in _backup/ und stellt saubere Defaults wieder her.",
  "useDefaultsBtn": "Standards wiederherstellen",
  "devMode": "Entwicklermodus",
  "devModeOn": "Erweiterte Einstellungen sind unten sichtbar",
  "devModeOff": "Erweiterte Einstellungen anzeigen (KI-Anbieter, API-Schl\xFCssel, Server-Port)",
  "aiModelConfig": "KI-Modell-Konfiguration",
  "localModelConfig": "Lokale LLM-Konfiguration",
  "aiProvider": "1. KI-Anbieter",
  "aiProviderDesc": "W\xE4hle einen lokalen Runner (Ollama, LM Studio), OpenRouter oder einen Cloud-Anbieter",
  "localApiType": "API-Typ",
  "localApiTypeDesc": "Von deinem lokalen Runner verwendetes Protokollformat",
  "localEndpoint": "Lokaler Server-Endpunkt",
  "localEndpointOllamaDesc": "Native Ollama Chat-URL (Standard: http://127.0.0.1:11434/api/chat)",
  "localEndpointOpenAiDesc": "OpenAI-kompatible Chat-URL f\xFCr deinen lokalen Runner",
  "localPresets": "Voreinstellungen: ",
  "localApiKeyDesc": "Optional f\xFCr lokale LLMs. Leer lassen, wenn keine Authentifizierung erforderlich ist.",
  "aiModelFamily": "2. Modell-Familie",
  "aiModelFamilyDesc": "W\xE4hle den Modellanbieter oder die Architekturgruppe auf OpenRouter",
  "modelVersion": "3. Modell-Version",
  "modelVersionDesc": 'Wird an OpenRouter als "{model}" gesendet',
  "aiModel": "2. Modell",
  "aiModelDesc": "Modell f\xFCr die Analyse ({provider})",
  "customModel": "Benutzerdefinierter Modellname",
  "customModelDesc": "Modell-ID eingeben (z. B. mistralai/mistral-large)",
  "aiApiKey": "API-Schl\xFCssel",
  "openRouterApiKeyDesc": "Dein OpenRouter API-Schl\xFCssel (openrouter.ai/keys)",
  "providerApiKeyDesc": "Dein API-Schl\xFCssel f\xFCr {provider}",
  "creditStatusTitleLocal": "Verbindungsstatus des lokalen LLM",
  "creditStatusTitleCloud": "KI-Guthaben & Kontostand",
  "creditCheckingLocal": "Verbindung zum lokalen Server wird gepr\xFCft...",
  "creditCheckingCloud": "Guthaben beim Anbieter wird abgefragt...",
  "refresh": "Aktualisieren",
  "checking": "Pr\xFCfen...",
  "remainingBalance": "\u{1F4B0} Verbleibendes Guthaben: {balance} ({status})",
  "providerStatus": "\u2139\uFE0F Anbieter: {provider} \u2014 {status}",
  "creditCheckFailed": "\u26A0\uFE0F Guthabenabfrage fehlgeschlagen: {error}",
  "processingHeader": "Verarbeitung & Chunking",
  "chunkWindowChars": "Chunk-Fenstergr\xF6\xDFe",
  "chunkWindowCharsDesc": "Maximale Zeichenanzahl pro Block (~30.000 Zeichen \u2248 8.000 Tokens). L\xE4ngere Inhalte werden in Teile zerlegt.",
  "sectionGridSeconds": "Abschnittsgitter-Intervall",
  "sectionGridSecondsDesc": "Zeitintervall in Sekunden (Standard: 300 s / 5 Min.) zur Erstellung von Kapitelkarten f\xFCr Videos ohne Kapitel.",
  "maxTokens": "Max. Ausgabetokens",
  "maxTokensDesc": "Maximal zugewiesene Tokens f\xFCr KI-Antworten (Standard: 16384).",
  "serverHeader": "Server",
  "serverPort": "Server-Port",
  "serverPortDesc": "Port f\xFCr den lokalen HTTP-Server zur Verbindung mit der Chrome-Erweiterung (erfordert Neustart)",
  "linksHeader": "Links & Ressourcen",
  "nuteggChromeStoreName": "NutEgg im Chrome Web Store",
  "nuteggChromeStoreDesc": "Installiere oder aktualisiere die NutEgg-Erweiterung f\xFCr Google Chrome.",
  "openChromeWebStore": "Chrome Web Store \xF6ffnen \u2197",
  "nuteggObsidianPluginName": "NutEgg in Obsidian Community-Plugins",
  "nuteggObsidianPluginDesc": "NutEgg im Verzeichnis der Obsidian Community-Plugins anzeigen.",
  "openObsidianDirectory": "Obsidian-Verzeichnis \xF6ffnen \u2197",
  "cmdNewEgg": "Neue Egg-Datei erstellen",
  "cmdOpenIndex": "Index-Datei \xF6ffnen",
  "cmdMergeCurrent": "Unverarbeitete Eintr\xE4ge im aktuellen Egg zusammenf\xFChren",
  "cmdCheckCredit": "KI-Anbieter-Guthaben pr\xFCfen",
  "cmdUseDefaultWorkflowPrompts": "Standard-Prompts verwenden (vorherige sichern)",
  "cmdReportBug": "Fehler auf GitHub melden",
  "ribbonOpenIndex": "NutEgg: Index \xF6ffnen",
  "ribbonCheckCredit": "NutEgg: KI-Guthaben pr\xFCfen",
  "serverStarted": "NutEgg-Server auf Port {port} gestartet",
  "serverFailed": "NutEgg: Serverstart fehlgeschlagen. Details in der Konsole.",
  "indexNotFound": "NutEgg: {path} nicht gefunden. Klicke auf das Egg-Symbol, um sie zu erstellen.",
  "noActiveFile": "NutEgg: Keine aktive Datei",
  "notEggNote": "NutEgg: Die aktive Datei ist keine Egg-Notiz",
  "mergingEntries": "NutEgg: Unverarbeitete Eintr\xE4ge in {name} zusammenf\xFChren...",
  "mergedEntries": "[NutEgg] {count} Eintr\xE4ge in den Wissensbaum zusammengef\xFChrt",
  "noUnprocessed": "[NutEgg] Keine unverarbeiteten Eintr\xE4ge vorhanden oder Zusammenf\xFChrung fehlgeschlagen.",
  "mergeFailed": "[NutEgg] Zusammenf\xFChrung fehlgeschlagen: {error}",
  "workflowReset": "[NutEgg] Workflow-Dateien auf Standard zur\xFCckgesetzt. Fr\xFChere Dateien nach {folder} verschoben",
  "eggNameRequired": "NutEgg: Bitte einen g\xFCltigen Egg-Namen eingeben.",
  "eggAlreadyExists": "NutEgg: {path} existiert bereits.",
  "eggCreated": "NutEgg: {path} erstellt",
  "indexSynced": "[NutEgg] Index synchronisiert: {summary}",
  "indexAllSynced": "[NutEgg] Alles ist auf dem neuesten Stand.",
  "indexSyncFailed": "[NutEgg] Synchronisierung fehlgeschlagen: {error}",
  "createEggTitle": "\u{1F423} Neues Egg erstellen",
  "eggNameLabel": "Egg-Name (Dateiname):",
  "eggNamePlaceholder": "z.B. methodik, investitionsstrategie...",
  "eggDescLabel": "Beschreibung (Themenbereich):",
  "eggDescPlaceholder": "z.B. praktische Methoden und Taktiken...",
  "eggLangHint": "\u{1F310} Die Sprache der Anweisungen und Ergebnisse entspricht der Sprache der Beschreibung.",
  "cancel": "Abbrechen",
  "createEgg": "Egg erstellen",
  "creatingEgg": "\u23F3 Egg wird erstellt...",
  "mergeUnprocessed": "Unverarbeitete Notiz zusammenf\xFChren",
  "mergeUnprocessedPlural": "{count} unverarbeitete Notizen zusammenf\xFChren",
  "merging": "Zusammenf\xFChren...",
  "mergeButtonText": "\u26A1 In Wissensbaum zusammenf\xFChren",
  "mergingWithAi": "\u23F3 Zusammenf\xFChrung mit KI...",
  "mergedSuccess": "\u2705 Zusammengef\xFChrt!",
  "treeUpToDate": "\u2705 Wissensbaum ist aktuell",
  "unprocessedEntries": "\u{1F95A} {count} unverarbeitete {entries}",
  "entrySingle": "Eintrag",
  "entryPlural": "Eintr\xE4ge",
  "mergeNoChanges": "[NutEgg] Zusammenf\xFChrung ergab keine \xC4nderungen oder ist fehlgeschlagen.",
  "syncIndex": "Index synchronisieren",
  "syncingIndex": "Synchronisiere...",
  "newEggButton": "+ Neues Egg",
  "unprocessedBadge": "{count} unverarbeitet"
};

// src/i18n/pt.ts
var pt = {
  "settingsTitle": "Configura\xE7\xF5es do NutEgg",
  "chromeCompanionName": "Extens\xE3o complementar do Chrome",
  "chromeCompanionDesc": "Capture e analise artigos, v\xEDdeos do YouTube e tweets diretamente do navegador no Obsidian.",
  "getChromeExtension": "Obter extens\xE3o do Chrome \u2197",
  "reportBugName": "Relatar um bug",
  "reportBugDesc": "Encontrou um problema, comportamento inesperado ou precisa de ajuda? Avise-nos no GitHub.",
  "reportBugBtn": "\u{1F41B} Relatar bug no GitHub \u2197",
  "vaultPathsHeader": "Caminhos do cofre",
  "rawFolder": "Pasta de conte\xFAdo bruto",
  "rawFolderDesc": "Pasta para armazenar o conte\xFAdo bruto capturado",
  "indexFile": "Arquivo de \xEDndice",
  "indexFileDesc": "Arquivo que mapeia eggs para seus respectivos arquivos markdown",
  "workflowFolder": "Pasta do motor de fluxos",
  "workflowFolderDesc": "Pasta onde os prompts de IA, esquemas e regras ficam salvos como arquivos markdown edit\xE1veis",
  "useDefaultWorkflows": "Usar prompts de fluxo padr\xE3o",
  "useDefaultWorkflowsDesc": "Move todos os arquivos atuais de nutegg/_workflow para uma pasta de backup em _backup/ e restaura os padr\xF5es limpos.",
  "useDefaultsBtn": "Restaurar padr\xF5es",
  "devMode": "Modo desenvolvedor",
  "devModeOn": "Configura\xE7\xF5es avan\xE7adas vis\xEDveis abaixo",
  "devModeOff": "Mostrar configura\xE7\xF5es avan\xE7adas (provedor de IA, chave de API, porta do servidor)",
  "aiModelConfig": "Configura\xE7\xE3o do modelo de IA",
  "localModelConfig": "Configura\xE7\xE3o de LLM local",
  "aiProvider": "1. Provedor de IA",
  "aiProviderDesc": "Escolha um executor local (Ollama, LM Studio), OpenRouter ou um provedor na nuvem",
  "localApiType": "Tipo de API",
  "localApiTypeDesc": "Formato do protocolo usado pelo executor local",
  "localEndpoint": "Endpoint do servidor local",
  "localEndpointOllamaDesc": "URL nativa de chat do Ollama (padr\xE3o: http://127.0.0.1:11434/api/chat)",
  "localEndpointOpenAiDesc": "URL de chat compat\xEDvel com OpenAI para seu executor local",
  "localPresets": "Predefini\xE7\xF5es: ",
  "localApiKeyDesc": "Opcional para LLMs locais. Deixe em branco se seu servidor local n\xE3o exigir autentica\xE7\xE3o.",
  "aiModelFamily": "2. Fam\xEDlia do modelo",
  "aiModelFamilyDesc": "Escolha o fornecedor ou grupo de arquitetura no OpenRouter",
  "modelVersion": "3. Vers\xE3o do modelo",
  "modelVersionDesc": 'Enviado ao OpenRouter como "{model}"',
  "aiModel": "2. Modelo",
  "aiModelDesc": "Modelo usado para an\xE1lise ({provider})",
  "customModel": "Nome do modelo personalizado",
  "customModelDesc": "Insira o ID do modelo (ex: mistralai/mistral-large)",
  "aiApiKey": "Chave de API",
  "openRouterApiKeyDesc": "Sua chave de API do OpenRouter (openrouter.ai/keys)",
  "providerApiKeyDesc": "Sua chave de API do {provider}",
  "creditStatusTitleLocal": "Status de conex\xE3o do LLM local",
  "creditStatusTitleCloud": "Cr\xE9dito e saldo de IA",
  "creditCheckingLocal": "Verificando conex\xE3o com o servidor local...",
  "creditCheckingCloud": "Verificando saldo com o provedor...",
  "refresh": "Atualizar",
  "checking": "Verificando...",
  "remainingBalance": "\u{1F4B0} Saldo restante: {balance} ({status})",
  "providerStatus": "\u2139\uFE0F Provedor: {provider} \u2014 {status}",
  "creditCheckFailed": "\u26A0\uFE0F Falha ao verificar cr\xE9dito: {error}",
  "processingHeader": "Processamento e divis\xE3o em partes",
  "chunkWindowChars": "Tamanho da janela de divis\xE3o",
  "chunkWindowCharsDesc": "Comprimento m\xE1ximo de caracteres por bloco (~30.000 caracteres \u2248 8.000 tokens). Conte\xFAdos longos s\xE3o particionados.",
  "sectionGridSeconds": "Intervalo de grade de se\xE7\xF5es",
  "sectionGridSecondsDesc": "Intervalo de tempo em segundos (padr\xE3o: 300 s / 5 min) para gerar mapas de cap\xEDtulos para v\xEDdeos sem cap\xEDtulos originais.",
  "maxTokens": "Tokens m\xE1ximos de conclus\xE3o",
  "maxTokensDesc": "Tokens m\xE1ximos alocados para respostas de IA (padr\xE3o: 16384).",
  "serverHeader": "Servidor",
  "serverPort": "Porta do servidor",
  "serverPortDesc": "Porta para o servidor HTTP local conectado \xE0 extens\xE3o do Chrome (requer rein\xEDcio)",
  "linksHeader": "Links e recursos",
  "nuteggChromeStoreName": "NutEgg na Chrome Web Store",
  "nuteggChromeStoreDesc": "Instale ou atualize a extens\xE3o complementar NutEgg para o Google Chrome.",
  "openChromeWebStore": "Abrir Chrome Web Store \u2197",
  "nuteggObsidianPluginName": "NutEgg nos Plugins da Comunidade do Obsidian",
  "nuteggObsidianPluginDesc": "Ver NutEgg no diret\xF3rio de plugins comunit\xE1rios do Obsidian.",
  "openObsidianDirectory": "Abrir diret\xF3rio do Obsidian \u2197",
  "cmdNewEgg": "Criar novo arquivo egg",
  "cmdOpenIndex": "Abrir arquivo de \xEDndice",
  "cmdMergeCurrent": "Mesclar entradas n\xE3o processadas no egg atual",
  "cmdCheckCredit": "Verificar cr\xE9dito e saldo do provedor de IA",
  "cmdUseDefaultWorkflowPrompts": "Usar prompts de fluxo padr\xE3o (fazer backup dos atuais)",
  "cmdReportBug": "Relatar bug no GitHub",
  "ribbonOpenIndex": "NutEgg: Abrir \xEDndice",
  "ribbonCheckCredit": "NutEgg: Verificar cr\xE9dito de IA",
  "serverStarted": "Servidor NutEgg iniciado na porta {port}",
  "serverFailed": "NutEgg: Falha ao iniciar o servidor. Verifique o console para mais detalhes.",
  "indexNotFound": "NutEgg: {path} n\xE3o encontrado. Clique no \xEDcone de egg para cri\xE1-lo.",
  "noActiveFile": "NutEgg: Nenhum arquivo ativo",
  "notEggNote": "NutEgg: O arquivo ativo n\xE3o \xE9 uma nota egg",
  "mergingEntries": "NutEgg: Mesclando entradas n\xE3o processadas em {name}...",
  "mergedEntries": "[NutEgg] {count} entradas mescladas na \xE1rvore de conhecimento",
  "noUnprocessed": "[NutEgg] Nenhuma entrada n\xE3o processada para mesclar ou a mesclagem falhou.",
  "mergeFailed": "[NutEgg] Falha na mesclagem: {error}",
  "workflowReset": "[NutEgg] Arquivos de fluxo restaurados para os padr\xF5es. Arquivos anteriores movidos para {folder}",
  "eggNameRequired": "NutEgg: Insira um nome v\xE1lido para o egg.",
  "eggAlreadyExists": "NutEgg: {path} j\xE1 existe.",
  "eggCreated": "NutEgg: {path} criado com sucesso",
  "indexSynced": "[NutEgg] \xCDndice sincronizado: {summary}",
  "indexAllSynced": "[NutEgg] Tudo est\xE1 em sincronia.",
  "indexSyncFailed": "[NutEgg] Falha na sincroniza\xE7\xE3o: {error}",
  "createEggTitle": "\u{1F423} Criar novo Egg",
  "eggNameLabel": "Nome do Egg (nome do arquivo):",
  "eggNamePlaceholder": "ex: metodologia, estrategia_investimento...",
  "eggDescLabel": "Descri\xE7\xE3o (escopo coberto):",
  "eggDescPlaceholder": "ex: m\xE9todos pr\xE1ticos e t\xE1ticas...",
  "eggLangHint": "\u{1F310} O idioma das instru\xE7\xF5es e resultados corresponder\xE1 ao idioma da descri\xE7\xE3o.",
  "cancel": "Cancelar",
  "createEgg": "Criar Egg",
  "creatingEgg": "\u23F3 Criando egg...",
  "mergeUnprocessed": "Mesclar nota n\xE3o processada",
  "mergeUnprocessedPlural": "Mesclar {count} notas n\xE3o processadas",
  "merging": "Mesclando...",
  "mergeButtonText": "\u26A1 Mesclar na \xE1rvore de conhecimento",
  "mergingWithAi": "\u23F3 Mesclando com IA...",
  "mergedSuccess": "\u2705 Mesclado!",
  "treeUpToDate": "\u2705 A \xE1rvore de conhecimento est\xE1 atualizada",
  "unprocessedEntries": "\u{1F95A} {count} {entries} n\xE3o processada(s)",
  "entrySingle": "entrada",
  "entryPlural": "entradas",
  "mergeNoChanges": "[NutEgg] Nenhuma altera\xE7\xE3o gerada ou falha na mesclagem.",
  "syncIndex": "Sincronizar \xEDndice",
  "syncingIndex": "Sincronizando...",
  "newEggButton": "+ Novo Egg",
  "unprocessedBadge": "{count} n\xE3o processada(s)"
};

// src/i18n/ru.ts
var ru = {
  "settingsTitle": "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 NutEgg",
  "chromeCompanionName": "\u0420\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u0435-\u043A\u043E\u043C\u043F\u0430\u043D\u044C\u043E\u043D \u0434\u043B\u044F Chrome",
  "chromeCompanionDesc": "\u0421\u043E\u0445\u0440\u0430\u043D\u044F\u0439\u0442\u0435 \u0438 \u0430\u043D\u0430\u043B\u0438\u0437\u0438\u0440\u0443\u0439\u0442\u0435 \u0441\u0442\u0430\u0442\u044C\u0438, \u0432\u0438\u0434\u0435\u043E YouTube \u0438 \u043F\u043E\u0441\u0442\u044B \u043F\u0440\u044F\u043C\u043E \u0438\u0437 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0430 \u0432 Obsidian.",
  "getChromeExtension": "\u0421\u043A\u0430\u0447\u0430\u0442\u044C \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u0435 \u0434\u043B\u044F Chrome \u2197",
  "reportBugName": "\u0421\u043E\u043E\u0431\u0449\u0438\u0442\u044C \u043E\u0431 \u043E\u0448\u0438\u0431\u043A\u0435",
  "reportBugDesc": "\u041D\u0430\u0448\u043B\u0438 \u043E\u0448\u0438\u0431\u043A\u0443 \u0438\u043B\u0438 \u043D\u0443\u0436\u043D\u0430 \u043F\u043E\u043C\u043E\u0449\u044C? \u0421\u043E\u043E\u0431\u0449\u0438\u0442\u0435 \u043D\u0430\u043C \u043D\u0430 GitHub.",
  "reportBugBtn": "\u{1F41B} \u0421\u043E\u043E\u0431\u0449\u0438\u0442\u044C \u043E\u0431 \u043E\u0448\u0438\u0431\u043A\u0435 \u043D\u0430 GitHub \u2197",
  "vaultPathsHeader": "\u041F\u0443\u0442\u0438 \u0432 \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435",
  "rawFolder": "\u041F\u0430\u043F\u043A\u0430 \u0438\u0441\u0445\u043E\u0434\u043D\u044B\u0445 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u043E\u0432",
  "rawFolderDesc": "\u041F\u0430\u043F\u043A\u0430 \u0434\u043B\u044F \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u044F \u0438\u0441\u0445\u043E\u0434\u043D\u043E\u0433\u043E \u0432\u0435\u0431-\u043A\u043E\u043D\u0442\u0435\u043D\u0442\u0430",
  "indexFile": "\u0424\u0430\u0439\u043B \u0438\u043D\u0434\u0435\u043A\u0441\u0430",
  "indexFileDesc": "\u0424\u0430\u0439\u043B, \u0441\u0432\u044F\u0437\u044B\u0432\u0430\u044E\u0449\u0438\u0439 eggs \u0441 \u0441\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u043C\u0438 markdown-\u0444\u0430\u0439\u043B\u0430\u043C\u0438",
  "workflowFolder": "\u041F\u0430\u043F\u043A\u0430 \u0434\u0432\u0438\u0436\u043A\u0430 \u0440\u0430\u0431\u043E\u0447\u0438\u0445 \u043F\u0440\u043E\u0446\u0435\u0441\u0441\u043E\u0432",
  "workflowFolderDesc": "\u041F\u0430\u043F\u043A\u0430, \u0433\u0434\u0435 \u043F\u0440\u043E\u043C\u043F\u0442\u044B \u0418\u0418, \u0441\u0445\u0435\u043C\u044B \u0438 \u043F\u0440\u0430\u0432\u0438\u043B\u0430 \u0445\u0440\u0430\u043D\u044F\u0442\u0441\u044F \u0432 \u0432\u0438\u0434\u0435 \u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u0443\u0435\u043C\u044B\u0445 markdown-\u0444\u0430\u0439\u043B\u043E\u0432",
  "useDefaultWorkflows": "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u0441\u0442\u0430\u043D\u0434\u0430\u0440\u0442\u043D\u044B\u0435 \u043F\u0440\u043E\u043C\u043F\u0442\u044B",
  "useDefaultWorkflowsDesc": "\u041F\u0435\u0440\u0435\u043C\u0435\u0449\u0430\u0435\u0442 \u0442\u0435\u043A\u0443\u0449\u0438\u0435 \u0444\u0430\u0439\u043B\u044B \u0438\u0437 nutegg/_workflow \u0432 \u0440\u0435\u0437\u0435\u0440\u0432\u043D\u0443\u044E \u043F\u0430\u043F\u043A\u0443 \u0441 \u0434\u0430\u0442\u043E\u0439 \u0432 _backup/ \u0438 \u0432\u043E\u0441\u0441\u0442\u0430\u043D\u0430\u0432\u043B\u0438\u0432\u0430\u0435\u0442 \u0447\u0438\u0441\u0442\u044B\u0435 \u0441\u0442\u0430\u043D\u0434\u0430\u0440\u0442\u043D\u044B\u0435 \u0448\u0430\u0431\u043B\u043E\u043D\u044B.",
  "useDefaultsBtn": "\u0412\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E",
  "devMode": "\u0420\u0435\u0436\u0438\u043C \u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A\u0430",
  "devModeOn": "\u0420\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u043D\u044B\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u043E\u0442\u043E\u0431\u0440\u0430\u0436\u0430\u044E\u0442\u0441\u044F \u043D\u0438\u0436\u0435",
  "devModeOff": "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u043D\u044B\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 (\u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440 \u0418\u0418, API-\u043A\u043B\u044E\u0447, \u043F\u043E\u0440\u0442 \u0441\u0435\u0440\u0432\u0435\u0440\u0430)",
  "aiModelConfig": "\u041A\u043E\u043D\u0444\u0438\u0433\u0443\u0440\u0430\u0446\u0438\u044F \u043C\u043E\u0434\u0435\u043B\u0438 \u0418\u0418",
  "localModelConfig": "\u041A\u043E\u043D\u0444\u0438\u0433\u0443\u0440\u0430\u0446\u0438\u044F \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E\u0439 LLM",
  "aiProvider": "1. \u041F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440 \u0418\u0418",
  "aiProviderDesc": "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u0437\u0430\u043F\u0443\u0441\u043A (Ollama, LM Studio), OpenRouter \u0438\u043B\u0438 \u043E\u0431\u043B\u0430\u0447\u043D\u043E\u0433\u043E \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u0430",
  "localApiType": "\u0422\u0438\u043F API",
  "localApiTypeDesc": "\u0424\u043E\u0440\u043C\u0430\u0442 \u043F\u0440\u043E\u0442\u043E\u043A\u043E\u043B\u0430 \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u0434\u0432\u0438\u0436\u043A\u0430",
  "localEndpoint": "\u042D\u043D\u0434\u043F\u043E\u0438\u043D\u0442 \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u0441\u0435\u0440\u0432\u0435\u0440\u0430",
  "localEndpointOllamaDesc": "\u041F\u0440\u044F\u043C\u043E\u0439 URL \u0447\u0430\u0442\u0430 Ollama (\u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E: http://127.0.0.1:11434/api/chat)",
  "localEndpointOpenAiDesc": "OpenAI-\u0441\u043E\u0432\u043C\u0435\u0441\u0442\u0438\u043C\u044B\u0439 URL \u0434\u043B\u044F \u0432\u0430\u0448\u0435\u0433\u043E \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u0434\u0432\u0438\u0436\u043A\u0430",
  "localPresets": "\u041F\u0440\u0435\u0441\u0435\u0442\u044B: ",
  "localApiKeyDesc": "\u041D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E \u0434\u043B\u044F \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0445 \u043C\u043E\u0434\u0435\u043B\u0435\u0439. \u041E\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u043F\u0443\u0441\u0442\u044B\u043C, \u0435\u0441\u043B\u0438 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044F \u043D\u0435 \u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F.",
  "aiModelFamily": "2. \u0421\u0435\u043C\u0435\u0439\u0441\u0442\u0432\u043E \u043C\u043E\u0434\u0435\u043B\u0435\u0439",
  "aiModelFamilyDesc": "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A\u0430 \u043C\u043E\u0434\u0435\u043B\u0438 \u0438\u043B\u0438 \u0433\u0440\u0443\u043F\u043F\u0443 \u0430\u0440\u0445\u0438\u0442\u0435\u043A\u0442\u0443\u0440\u044B \u0432 OpenRouter",
  "modelVersion": "3. \u0412\u0435\u0440\u0441\u0438\u044F \u043C\u043E\u0434\u0435\u043B\u0438",
  "modelVersionDesc": '\u041E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u0432 OpenRouter \u043A\u0430\u043A "{model}"',
  "aiModel": "2. \u041C\u043E\u0434\u0435\u043B\u044C",
  "aiModelDesc": "\u041C\u043E\u0434\u0435\u043B\u044C \u0434\u043B\u044F \u0430\u043D\u0430\u043B\u0438\u0437\u0430 ({provider})",
  "customModel": "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C\u0441\u043A\u043E\u0435 \u0438\u043C\u044F \u043C\u043E\u0434\u0435\u043B\u0438",
  "customModelDesc": "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440 \u043C\u043E\u0434\u0435\u043B\u0438 (\u043D\u0430\u043F\u0440. mistralai/mistral-large)",
  "aiApiKey": "API-\u043A\u043B\u044E\u0447",
  "openRouterApiKeyDesc": "\u0412\u0430\u0448 API-\u043A\u043B\u044E\u0447 OpenRouter (openrouter.ai/keys)",
  "providerApiKeyDesc": "\u0412\u0430\u0448 API-\u043A\u043B\u044E\u0447 {provider}",
  "creditStatusTitleLocal": "\u0421\u0442\u0430\u0442\u0443\u0441 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E\u0439 LLM",
  "creditStatusTitleCloud": "\u0411\u0430\u043B\u0430\u043D\u0441 \u0418\u0418",
  "creditCheckingLocal": "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F \u043A \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E\u043C\u0443 \u0441\u0435\u0440\u0432\u0435\u0440\u0443...",
  "creditCheckingCloud": "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0431\u0430\u043B\u0430\u043D\u0441\u0430 \u0443 \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u0430...",
  "refresh": "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C",
  "checking": "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430...",
  "remainingBalance": "\u{1F4B0} \u041E\u0441\u0442\u0430\u0442\u043E\u043A \u0431\u0430\u043B\u0430\u043D\u0441\u0430: {balance} ({status})",
  "providerStatus": "\u2139\uFE0F \u041F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440: {provider} \u2014 {status}",
  "creditCheckFailed": "\u26A0\uFE0F \u0421\u0431\u043E\u0439 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u0431\u0430\u043B\u0430\u043D\u0441\u0430: {error}",
  "processingHeader": "\u041E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0430 \u0438 \u0444\u0440\u0430\u0433\u043C\u0435\u043D\u0442\u0430\u0446\u0438\u044F",
  "chunkWindowChars": "\u0420\u0430\u0437\u043C\u0435\u0440 \u043E\u043A\u043D\u0430 \u0444\u0440\u0430\u0433\u043C\u0435\u043D\u0442\u0430",
  "chunkWindowCharsDesc": "\u041C\u0430\u043A\u0441\u0438\u043C\u0430\u043B\u044C\u043D\u043E\u0435 \u0447\u0438\u0441\u043B\u043E \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432 \u043D\u0430 \u0444\u0440\u0430\u0433\u043C\u0435\u043D\u0442 (~30 000 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432 \u2248 8 000 \u0442\u043E\u043A\u0435\u043D\u043E\u0432). \u0414\u043B\u0438\u043D\u043D\u044B\u0435 \u0442\u0435\u043A\u0441\u0442\u044B \u0434\u0435\u043B\u044F\u0442\u0441\u044F \u043D\u0430 \u0447\u0430\u0441\u0442\u0438.",
  "sectionGridSeconds": "\u0418\u043D\u0442\u0435\u0440\u0432\u0430\u043B \u0441\u0435\u0442\u043A\u0438 \u0440\u0430\u0437\u0434\u0435\u043B\u043E\u0432",
  "sectionGridSecondsDesc": "\u0418\u043D\u0442\u0435\u0440\u0432\u0430\u043B \u0432 \u0441\u0435\u043A\u0443\u043D\u0434\u0430\u0445 (\u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E: 300 \u0441 / 5 \u043C\u0438\u043D) \u0434\u043B\u044F \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u0438 \u043A\u0430\u0440\u0442\u044B \u0433\u043B\u0430\u0432 \u0432 \u0432\u0438\u0434\u0435\u043E \u0431\u0435\u0437 \u0440\u0430\u0437\u043C\u0435\u0442\u043A\u0438.",
  "maxTokens": "\u041C\u0430\u043A\u0441\u0438\u043C\u0443\u043C \u0442\u043E\u043A\u0435\u043D\u043E\u0432 \u0432\u044B\u0432\u043E\u0434\u0430",
  "maxTokensDesc": "\u041C\u0430\u043A\u0441\u0438\u043C\u0430\u043B\u044C\u043D\u043E\u0435 \u0447\u0438\u0441\u043B\u043E \u0442\u043E\u043A\u0435\u043D\u043E\u0432 \u0434\u043B\u044F \u043E\u0442\u0432\u0435\u0442\u0430 \u0418\u0418 (\u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E: 16384).",
  "serverHeader": "\u0421\u0435\u0440\u0432\u0435\u0440",
  "serverPort": "\u041F\u043E\u0440\u0442 \u0441\u0435\u0440\u0432\u0435\u0440\u0430",
  "serverPortDesc": "\u041F\u043E\u0440\u0442 \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E\u0433\u043E HTTP-\u0441\u0435\u0440\u0432\u0435\u0440\u0430 \u0434\u043B\u044F \u0441\u0432\u044F\u0437\u0438 \u0441 \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u0435\u043C Chrome (\u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u043A)",
  "linksHeader": "\u0421\u0441\u044B\u043B\u043A\u0438 \u0438 \u0440\u0435\u0441\u0443\u0440\u0441\u044B",
  "nuteggChromeStoreName": "NutEgg \u0432 Chrome Web Store",
  "nuteggChromeStoreDesc": "\u0423\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u0435 \u0438\u043B\u0438 \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u0435 NutEgg \u0434\u043B\u044F Google Chrome.",
  "openChromeWebStore": "\u041E\u0442\u043A\u0440\u044B\u0442\u044C Chrome Web Store \u2197",
  "nuteggObsidianPluginName": "NutEgg \u0432 \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0435 \u043F\u043B\u0430\u0433\u0438\u043D\u043E\u0432 Obsidian",
  "nuteggObsidianPluginDesc": "\u0421\u0442\u0440\u0430\u043D\u0438\u0446\u0430 NutEgg \u0432 \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u0441\u0442\u0432\u0430 Obsidian.",
  "openObsidianDirectory": "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043A\u0430\u0442\u0430\u043B\u043E\u0433 Obsidian \u2197",
  "cmdNewEgg": "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043D\u043E\u0432\u044B\u0439 \u0444\u0430\u0439\u043B egg",
  "cmdOpenIndex": "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0444\u0430\u0439\u043B \u0438\u043D\u0434\u0435\u043A\u0441\u0430",
  "cmdMergeCurrent": "\u041E\u0431\u044A\u0435\u0434\u0438\u043D\u0438\u0442\u044C \u043D\u0435\u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0430\u043D\u043D\u044B\u0435 \u0437\u0430\u043F\u0438\u0441\u0438 \u0432 \u0442\u0435\u043A\u0443\u0449\u0435\u043C egg",
  "cmdCheckCredit": "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0431\u0430\u043B\u0430\u043D\u0441 \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u0430 \u0418\u0418",
  "cmdUseDefaultWorkflowPrompts": "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u0441\u0442\u0430\u043D\u0434\u0430\u0440\u0442\u043D\u044B\u0435 \u043F\u0440\u043E\u043C\u043F\u0442\u044B (\u0441 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435\u043C \u0442\u0435\u043A\u0443\u0449\u0438\u0445)",
  "cmdReportBug": "\u0421\u043E\u043E\u0431\u0449\u0438\u0442\u044C \u043E\u0431 \u043E\u0448\u0438\u0431\u043A\u0435 \u043D\u0430 GitHub",
  "ribbonOpenIndex": "NutEgg: \u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0438\u043D\u0434\u0435\u043A\u0441",
  "ribbonCheckCredit": "NutEgg: \u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0431\u0430\u043B\u0430\u043D\u0441 \u0418\u0418",
  "serverStarted": "\u0421\u0435\u0440\u0432\u0435\u0440 NutEgg \u0437\u0430\u043F\u0443\u0449\u0435\u043D \u043D\u0430 \u043F\u043E\u0440\u0442\u0443 {port}",
  "serverFailed": "NutEgg: \u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u0441\u0435\u0440\u0432\u0435\u0440. \u041F\u043E\u0434\u0440\u043E\u0431\u043D\u043E\u0441\u0442\u0438 \u0432 \u043A\u043E\u043D\u0441\u043E\u043B\u0438.",
  "indexNotFound": "NutEgg: {path} \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D. \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u043D\u0430 \u0438\u043A\u043E\u043D\u043A\u0443 egg \u0434\u043B\u044F \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u044F.",
  "noActiveFile": "NutEgg: \u041D\u0435\u0442 \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0433\u043E \u0444\u0430\u0439\u043B\u0430",
  "notEggNote": "NutEgg: \u0410\u043A\u0442\u0438\u0432\u043D\u044B\u0439 \u0444\u0430\u0439\u043B \u043D\u0435 \u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u0437\u0430\u043C\u0435\u0442\u043A\u043E\u0439 egg",
  "mergingEntries": "NutEgg: \u041E\u0431\u044A\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u0435 \u0437\u0430\u043F\u0438\u0441\u0435\u0439 \u0432 {name}...",
  "mergedEntries": "[NutEgg] \u041E\u0431\u044A\u0435\u0434\u0438\u043D\u0435\u043D\u043E {count} \u0437\u0430\u043F\u0438\u0441\u0435\u0439 \u0432 \u0434\u0435\u0440\u0435\u0432\u043E \u0437\u043D\u0430\u043D\u0438\u0439",
  "noUnprocessed": "[NutEgg] \u041D\u0435\u0442 \u043D\u0435\u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0430\u043D\u043D\u044B\u0445 \u0437\u0430\u043F\u0438\u0441\u0435\u0439 \u0438\u043B\u0438 \u043F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430.",
  "mergeFailed": "[NutEgg] \u041E\u0448\u0438\u0431\u043A\u0430 \u043E\u0431\u044A\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u044F: {error}",
  "workflowReset": "[NutEgg] \u041F\u0440\u043E\u043C\u043F\u0442\u044B \u0441\u0431\u0440\u043E\u0448\u0435\u043D\u044B \u043A \u0441\u0442\u0430\u043D\u0434\u0430\u0440\u0442\u043D\u044B\u043C. \u041F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0438\u0435 \u0444\u0430\u0439\u043B\u044B \u043F\u0435\u0440\u0435\u043C\u0435\u0449\u0435\u043D\u044B \u0432 {folder}",
  "eggNameRequired": "NutEgg: \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u0432\u0432\u0435\u0434\u0438\u0442\u0435 \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u043E\u0435 \u0438\u043C\u044F egg.",
  "eggAlreadyExists": "NutEgg: {path} \u0443\u0436\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442.",
  "eggCreated": "NutEgg: \u0421\u043E\u0437\u0434\u0430\u043D {path}",
  "indexSynced": "[NutEgg] \u0418\u043D\u0434\u0435\u043A\u0441 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u043D: {summary}",
  "indexAllSynced": "[NutEgg] \u0412\u0441\u0451 \u043F\u043E\u043B\u043D\u043E\u0441\u0442\u044C\u044E \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u043D\u043E.",
  "indexSyncFailed": "[NutEgg] \u0421\u0431\u043E\u0439 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u0438: {error}",
  "createEggTitle": "\u{1F423} \u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043D\u043E\u0432\u044B\u0439 Egg",
  "eggNameLabel": "\u0418\u043C\u044F Egg (\u0438\u043C\u044F \u0444\u0430\u0439\u043B\u0430):",
  "eggNamePlaceholder": "\u043D\u0430\u043F\u0440. metodologiya, investitsii...",
  "eggDescLabel": "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 (\u043E\u0445\u0432\u0430\u0442 \u0442\u0435\u043C\u044B):",
  "eggDescPlaceholder": "\u043D\u0430\u043F\u0440. \u043F\u0440\u0430\u043A\u0442\u0438\u0447\u0435\u0441\u043A\u0438\u0435 \u043C\u0435\u0442\u043E\u0434\u044B \u0438 \u043F\u0440\u0438\u0435\u043C\u044B...",
  "eggLangHint": "\u{1F310} \u042F\u0437\u044B\u043A \u0438\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u0439 \u0438 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u043E\u0432 \u0431\u0443\u0434\u0435\u0442 \u0441\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u043E\u0432\u0430\u0442\u044C \u044F\u0437\u044B\u043A\u0443 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044F.",
  "cancel": "\u041E\u0442\u043C\u0435\u043D\u0430",
  "createEgg": "\u0421\u043E\u0437\u0434\u0430\u0442\u044C Egg",
  "creatingEgg": "\u23F3 \u0421\u043E\u0437\u0434\u0430\u043D\u0438\u0435 egg...",
  "mergeUnprocessed": "\u041E\u0431\u044A\u0435\u0434\u0438\u043D\u0438\u0442\u044C \u043D\u0435\u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0430\u043D\u043D\u0443\u044E \u0437\u0430\u043C\u0435\u0442\u043A\u0443",
  "mergeUnprocessedPlural": "\u041E\u0431\u044A\u0435\u0434\u0438\u043D\u0438\u0442\u044C {count} \u043D\u0435\u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0430\u043D\u043D\u044B\u0445 \u0437\u0430\u043C\u0435\u0442\u043E\u043A",
  "merging": "\u041E\u0431\u044A\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u0435...",
  "mergeButtonText": "\u26A1 \u041E\u0431\u044A\u0435\u0434\u0438\u043D\u0438\u0442\u044C \u0432 \u0434\u0435\u0440\u0435\u0432\u043E \u0437\u043D\u0430\u043D\u0438\u0439",
  "mergingWithAi": "\u23F3 \u041E\u0431\u044A\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u0435 \u0441 \u043F\u043E\u043C\u043E\u0449\u044C\u044E \u0418\u0418...",
  "mergedSuccess": "\u2705 \u041E\u0431\u044A\u0435\u0434\u0438\u043D\u0435\u043D\u043E!",
  "treeUpToDate": "\u2705 \u0414\u0435\u0440\u0435\u0432\u043E \u0437\u043D\u0430\u043D\u0438\u0439 \u0430\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u043E",
  "unprocessedEntries": "\u{1F95A} {count} \u043D\u0435\u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0430\u043D\u043D\u044B\u0445 {entries}",
  "entrySingle": "\u0437\u0430\u043F\u0438\u0441\u044C",
  "entryPlural": "\u0437\u0430\u043F\u0438\u0441\u0435\u0439",
  "mergeNoChanges": "[NutEgg] \u0418\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0439 \u043D\u0435\u0442 \u043B\u0438\u0431\u043E \u043F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430 \u043E\u0431\u044A\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u044F.",
  "syncIndex": "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0438\u043D\u0434\u0435\u043A\u0441",
  "syncingIndex": "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F...",
  "newEggButton": "+ \u041D\u043E\u0432\u044B\u0439 Egg",
  "unprocessedBadge": "{count} \u043D\u0435\u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0430\u043D\u043E"
};

// src/i18n/index.ts
var import_obsidian = require("obsidian");
var translations = {
  en,
  zh,
  es,
  ja,
  ko,
  ar,
  fr,
  de,
  pt,
  ru
};
function getLanguage() {
  try {
    let raw;
    try {
      if (typeof import_obsidian.getLanguage === "function") {
        raw = (0, import_obsidian.getLanguage)();
      }
    } catch {
    }
    if (!raw && typeof window !== "undefined" && window?.localStorage) {
      raw = window.localStorage.getItem("language") || void 0;
    }
    if (!raw) {
      try {
        if (typeof import_obsidian.moment?.locale === "function") {
          raw = import_obsidian.moment.locale();
        } else if (typeof window?.moment?.locale === "function") {
          raw = window.moment.locale();
        }
      } catch {
      }
    }
    if (!raw && typeof document !== "undefined" && document.documentElement?.lang) {
      raw = document.documentElement.lang;
    }
    if (!raw && typeof navigator !== "undefined" && navigator?.language) {
      raw = navigator.language;
    }
    const lang = (raw || "en").toLowerCase();
    if (lang.startsWith("zh"))
      return "zh";
    if (lang.startsWith("es"))
      return "es";
    if (lang.startsWith("ja"))
      return "ja";
    if (lang.startsWith("ko"))
      return "ko";
    if (lang.startsWith("ar"))
      return "ar";
    if (lang.startsWith("fr"))
      return "fr";
    if (lang.startsWith("de"))
      return "de";
    if (lang.startsWith("pt"))
      return "pt";
    if (lang.startsWith("ru"))
      return "ru";
  } catch {
  }
  return "en";
}
function t(key, params) {
  const lang = getLanguage();
  const dict = translations[lang] || translations.en;
  let str = dict[key] || translations.en[key] || key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return str;
}

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
  contentAnalysisMaxTokens: 16384
};
var NutEggSettingTab = class extends import_obsidian2.PluginSettingTab {
  plugin;
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
    containerEl.createEl("h2", { text: t("settingsTitle") });
    new import_obsidian2.Setting(containerEl).setName(t("chromeCompanionName")).setDesc(t("chromeCompanionDesc")).addButton(
      (btn) => btn.setButtonText(t("getChromeExtension")).setCta().onClick(() => {
        window.open(
          "https://chromewebstore.google.com/detail/nutegg/bmdmdiicembobejibggoeiahaonphcol",
          "_blank"
        );
      })
    );
    new import_obsidian2.Setting(containerEl).setName(t("reportBugName")).setDesc(t("reportBugDesc")).addButton(
      (btn) => btn.setButtonText(t("reportBugBtn")).onClick(() => {
        this.plugin.openBugReport();
      })
    );
    containerEl.createEl("h3", { text: t("vaultPathsHeader") });
    new import_obsidian2.Setting(containerEl).setName(t("rawFolder")).setDesc(t("rawFolderDesc")).addText(
      (text) => text.setPlaceholder("nutegg/_raw").setValue(settings.rawFolder).onChange(async (value) => {
        settings.rawFolder = value.trim() || "nutegg/_raw";
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian2.Setting(containerEl).setName(t("indexFile")).setDesc(t("indexFileDesc")).addText(
      (text) => text.setPlaceholder("nutegg/_index.md").setValue(settings.indexFile).onChange(async (value) => {
        settings.indexFile = value.trim() || "nutegg/_index.md";
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian2.Setting(containerEl).setName(t("workflowFolder")).setDesc(t("workflowFolderDesc")).addText(
      (text) => text.setPlaceholder("nutegg/_workflow").setValue(settings.workflowFolder).onChange(async (value) => {
        settings.workflowFolder = value.trim() || "nutegg/_workflow";
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian2.Setting(containerEl).setName(t("useDefaultWorkflows")).setDesc(t("useDefaultWorkflowsDesc")).addButton(
      (btn) => btn.setButtonText(t("useDefaultsBtn")).setWarning().onClick(async () => {
        await this.plugin.workflowManager.resetToDefaults();
      })
    );
    new import_obsidian2.Setting(containerEl).setName(t("devMode")).setDesc(
      settings.developerMode ? t("devModeOn") : t("devModeOff")
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
    containerEl.createEl("h3", { text: isLocal ? t("localModelConfig") : t("aiModelConfig") });
    new import_obsidian2.Setting(containerEl).setName(t("aiProvider")).setDesc(t("aiProviderDesc")).addDropdown((dropdown) => {
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
      new import_obsidian2.Setting(containerEl).setName(t("localApiType")).setDesc(t("localApiTypeDesc")).addDropdown((dropdown) => {
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
      new import_obsidian2.Setting(containerEl).setName(t("localEndpoint")).setDesc(
        settings.localApiType === "ollama" ? t("localEndpointOllamaDesc") : t("localEndpointOpenAiDesc")
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
        text: t("localPresets")
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
      new import_obsidian2.Setting(containerEl).setName(t("aiApiKey")).setDesc(t("localApiKeyDesc")).addText((text) => {
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
      new import_obsidian2.Setting(containerEl).setName(t("aiModelFamily")).setDesc(t("aiModelFamilyDesc")).addDropdown((dropdown) => {
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
      const versionSetting = new import_obsidian2.Setting(containerEl).setName(t("modelVersion")).setDesc(t("modelVersionDesc", { model: settings.aiModel }));
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
      new import_obsidian2.Setting(containerEl).setName(t("aiApiKey")).setDesc(t("openRouterApiKeyDesc")).addText((text) => {
        text.setPlaceholder("sk-or-...").setValue(settings.aiApiKey).onChange(async (value) => {
          settings.aiApiKey = value.trim();
          await this.plugin.saveSettings();
        });
        return text;
      });
    } else {
      const providerModels = provider.models || [];
      const versionSetting = new import_obsidian2.Setting(containerEl).setName(t("aiModel")).setDesc(t("aiModelDesc", { provider: provider.label }));
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
      new import_obsidian2.Setting(containerEl).setName(t("aiApiKey")).setDesc(t("providerApiKeyDesc", { provider: provider.label })).addText((text) => {
        text.setPlaceholder(provider.keyPlaceholder).setValue(settings.aiApiKey).onChange(async (value) => {
          settings.aiApiKey = value.trim();
          await this.plugin.saveSettings();
        });
        return text;
      });
    }
    const creditSetting = new import_obsidian2.Setting(containerEl).setName(isLocal ? t("creditStatusTitleLocal") : t("creditStatusTitleCloud")).setDesc(isLocal ? t("creditCheckingLocal") : t("creditCheckingCloud")).addButton((btn) => {
      btn.setButtonText(t("refresh")).setCta().onClick(async () => {
        btn.setDisabled(true);
        btn.setButtonText(t("checking"));
        await updateCreditDisplay();
        btn.setDisabled(false);
        btn.setButtonText(t("refresh"));
      });
      return btn;
    });
    const updateCreditDisplay = async () => {
      try {
        const credit = await this.plugin.aiClient.checkCredit(settings);
        if (credit.hasBalance && credit.balanceFormatted) {
          creditSetting.setDesc(
            t("remainingBalance", { balance: credit.balanceFormatted, status: credit.statusText })
          );
        } else {
          creditSetting.setDesc(
            t("providerStatus", { provider: credit.providerLabel, status: credit.statusText })
          );
        }
      } catch (err) {
        creditSetting.setDesc(t("creditCheckFailed", { error: String(err) }));
      }
    };
    updateCreditDisplay();
    containerEl.createEl("h3", { text: t("processingHeader") });
    new import_obsidian2.Setting(containerEl).setName(t("chunkWindowChars")).setDesc(t("chunkWindowCharsDesc")).addText(
      (text) => text.setPlaceholder("30000").setValue(String(settings.chunkWindowChars || 3e4)).onChange(async (value) => {
        const num = parseInt(value, 10);
        if (!isNaN(num) && num >= 1e3) {
          settings.chunkWindowChars = num;
          await this.plugin.saveSettings();
        }
      })
    );
    new import_obsidian2.Setting(containerEl).setName(t("sectionGridSeconds")).setDesc(t("sectionGridSecondsDesc")).addText(
      (text) => text.setPlaceholder("300").setValue(String(settings.sectionGridSeconds || 300)).onChange(async (value) => {
        const num = parseInt(value, 10);
        if (!isNaN(num) && num >= 10) {
          settings.sectionGridSeconds = num;
          await this.plugin.saveSettings();
        }
      })
    );
    new import_obsidian2.Setting(containerEl).setName(t("maxTokens")).setDesc(t("maxTokensDesc")).addText(
      (text) => text.setPlaceholder("16384").setValue(String(settings.contentAnalysisMaxTokens || 16384)).onChange(async (value) => {
        const num = parseInt(value, 10);
        if (!isNaN(num) && num >= 500) {
          settings.contentAnalysisMaxTokens = num;
          await this.plugin.saveSettings();
        }
      })
    );
    containerEl.createEl("h3", { text: t("serverHeader") });
    new import_obsidian2.Setting(containerEl).setName(t("serverPort")).setDesc(t("serverPortDesc")).addText(
      (text) => text.setPlaceholder("27123").setValue(String(settings.serverPort)).onChange(async (value) => {
        const port = parseInt(value, 10);
        if (!isNaN(port) && port > 0 && port < 65536) {
          settings.serverPort = port;
          await this.plugin.saveSettings();
        }
      })
    );
    containerEl.createEl("h3", { text: t("linksHeader") });
    new import_obsidian2.Setting(containerEl).setName(t("nuteggChromeStoreName")).setDesc(t("nuteggChromeStoreDesc")).addButton(
      (btn) => btn.setButtonText(t("openChromeWebStore")).onClick(() => {
        window.open(
          "https://chromewebstore.google.com/detail/nutegg/bmdmdiicembobejibggoeiahaonphcol",
          "_blank"
        );
      })
    );
    new import_obsidian2.Setting(containerEl).setName(t("nuteggObsidianPluginName")).setDesc(t("nuteggObsidianPluginDesc")).addButton(
      (btn) => btn.setButtonText(t("openObsidianDirectory")).onClick(() => {
        window.open("https://community.obsidian.md/plugins/nutegg", "_blank");
      })
    );
  }
  displayLanguageSettings(containerEl, settings) {
  }
};

// src/server.ts
var http = __toESM(require("http"));

// src/index-sync.ts
var import_obsidian3 = require("obsidian");

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
init_egg_parser2();
function sanitizeEggName2(name) {
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
        new import_obsidian3.Notice(`[NutEgg] Removed ${filePath} from egg index`);
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
        new import_obsidian3.Notice(`[NutEgg] Renamed index path: ${oldPath} -> ${newPath}`);
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
    const name = sanitizeEggName2(rawName);
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
    if (!detectedLanguage) {
      detectedLanguage = extractEggLanguage(content) || "English";
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
init_egg_parser2();
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
      const origin = req.headers.origin;
      const isAllowedOrigin = !origin || origin.startsWith("chrome-extension://") || origin.startsWith("http://127.0.0.1:") || origin.startsWith("http://localhost:") || origin.startsWith("app://obsidian.md");
      if (origin && isAllowedOrigin) {
        res.setHeader("Access-Control-Allow-Origin", origin);
      } else if (!origin) {
        res.setHeader("Access-Control-Allow-Origin", "*");
      }
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-NutEgg-Extension-Version");
      if (req.method === "OPTIONS") {
        if (origin && !isAllowedOrigin) {
          res.writeHead(403);
          res.end("Forbidden origin");
          return;
        }
        res.writeHead(204);
        res.end();
        return;
      }
      if (req.method === "GET" && req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          status: "ok",
          port: this.port,
          version: this.plugin.manifest?.version || "",
          timestamp: Date.now()
        }));
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
    res.end(JSON.stringify({
      status,
      issues,
      port: this.port,
      version: this.plugin.manifest?.version || "",
      credit
    }));
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
      const hasEggOverride = Array.isArray(capture.eggs);
      if (!capture.stage && !hasQuestions && !capture.force && !(hasEggOverride && capture.eggs.length > 0)) {
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
          mindMap: [],
          customQuestionAnswers: []
        };
        const result = await this.plugin.aiProcessor.analyzeEggs(
          capture,
          eggs,
          contentAnalysis2
        );
        delete result.stage;
        let nutId2 = capture.nutId;
        if (nutId2 && this.plugin.db?.getNutById(nutId2)) {
          this.plugin.db.updateNut(nutId2, {
            summary: [result.titleVerdict, ...result.coreSummary || []].filter(Boolean).join("\n"),
            matchedEggs: result.matchedEggs || [],
            analysisResult: result
          });
        } else {
          nutId2 = this.recordNut(capture, result);
        }
        console.log(
          `[NutEgg] Analyzed (Stage 2): ${capture.title} \u2014 shouldRead=${result.shouldRead}, newKnowledge=${result.newKnowledge.length}`
        );
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ...result, stage: "stage2", nutId: nutId2 }));
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
      const stage1Result = {
        ...contentAnalysis,
        matchedEggs,
        allEggs: index.map((e) => e.fileName),
        stage: "stage1",
        shouldRead: false,
        shouldReadReason: "",
        eggResults: [],
        newKnowledge: []
      };
      const nutId = this.recordNut(capture, stage1Result);
      console.log(
        `[NutEgg] Analyzed (Stage 1): ${capture.title} \u2014 matchedEggs=${matchedEggs.length}, nutId=${nutId}`
      );
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ...stage1Result,
          nutId
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
      const safeName = sanitizeEggName2(name);
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
  readBody(req, maxBytes = 25 * 1024 * 1024) {
    return new Promise((resolve, reject) => {
      let data = "";
      let bytes = 0;
      let settled = false;
      req.on("data", (chunk) => {
        bytes += chunk.length;
        if (bytes > maxBytes) {
          settled = true;
          req.destroy(new Error("Request body too large (exceeds 25MB)"));
          reject(new Error("Request body too large (exceeds 25MB)"));
          return;
        }
        data += chunk;
      });
      req.on("end", () => {
        if (!settled) {
          settled = true;
          resolve(data);
        }
      });
      req.on("error", (err) => {
        if (!settled) {
          settled = true;
          reject(err);
        }
      });
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

// ../shared/src/chunker.ts
var DEFAULT_CHUNK_WINDOW_CHARS = 3e4;
var DEFAULT_SECTION_SECS = 300;
function lineSeconds(line) {
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
function toSeconds(time) {
  const clean = (time || "").replace(/[\[\]]/g, "").trim();
  const parts = clean.split(":").map(Number);
  if (parts.some((n) => Number.isNaN(n)))
    return 0;
  if (parts.length === 3)
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2)
    return parts[0] * 60 + parts[1];
  return 0;
}
function formatSeconds(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor(sec % 3600 / 60);
  const s = Math.floor(sec % 60);
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
function partNote(chunk) {
  const at = chunk.startTime ? ` (from ${chunk.startTime})` : "";
  return `**Part:** ${chunk.index + 1} of ${chunk.total}${at}`;
}
function paragraphChunks(content, chapters, chunkSize = DEFAULT_CHUNK_WINDOW_CHARS) {
  const paras = content.split(/\n\n+/);
  const chunks = [];
  let buf = [];
  let bufChars = 0;
  const flush = () => {
    if (!buf.length)
      return;
    chunks.push({
      index: 0,
      total: 0,
      content: buf.join("\n\n"),
      chapters: [],
      startTime: "",
      sections: []
    });
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
function timestampedChunks(lines, firstTsIdx, chapters, chunkSize = DEFAULT_CHUNK_WINDOW_CHARS, sectionGridSecs = DEFAULT_SECTION_SECS) {
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
    const sec = lineSeconds(lines[i]);
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
      startTime: formatSeconds(startSec),
      sections: []
    });
    buf = [];
    bufChars = 0;
  };
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
    return paragraphChunks(lines.join("\n"), chapters, chunkSize);
  }
  const starts = chunks.map((c) => toSeconds(c.startTime));
  for (const ch of chapters) {
    const t2 = toSeconds(ch.time);
    let idx = 0;
    for (let i = starts.length - 1; i >= 0; i--) {
      if (t2 >= starts[i]) {
        idx = i;
        break;
      }
    }
    chunks[idx].chapters.push(ch);
  }
  if (chapters.length === 0 && lastCaptionSec >= sectionGridSecs) {
    const begins = chunks.map((c) => toSeconds(c.startTime));
    for (let t2 = 0; t2 < lastCaptionSec + 1; t2 += sectionGridSecs) {
      let idx = 0;
      for (let i = begins.length - 1; i >= 0; i--) {
        if (t2 >= begins[i]) {
          idx = i;
          break;
        }
      }
      chunks[idx].sections.push(formatSeconds(t2));
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
function chunkContent(content, chapters = [], chunkWindowChars = DEFAULT_CHUNK_WINDOW_CHARS, sectionGridSeconds = DEFAULT_SECTION_SECS) {
  const lines = (content || "").split("\n");
  const firstTsIdx = lines.findIndex((l) => lineSeconds(l) !== null);
  if (firstTsIdx !== -1) {
    return timestampedChunks(
      lines,
      firstTsIdx,
      chapters,
      chunkWindowChars,
      sectionGridSeconds
    );
  }
  if (content.length <= chunkWindowChars) {
    return [
      { index: 0, total: 1, content, chapters, startTime: "", sections: [] }
    ];
  }
  return paragraphChunks(content, chapters, chunkWindowChars);
}

// ../shared/src/ai-processor.ts
init_egg_format();

// ../shared/src/json-repair.ts
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
function parseJson(response, context = "response") {
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
  const repaired = repairTruncatedJson(sanitized);
  if (repaired) {
    try {
      const res = JSON.parse(repaired);
      console.warn(`[NutEgg] Recovered truncated JSON response (${context})`);
      return res;
    } catch {
    }
  }
  console.warn(
    `[NutEgg] Failed to parse AI JSON response (${context}) [length=${jsonStr.length}]:`,
    jsonStr.slice(0, 500)
  );
  return {};
}

// ../shared/workflow/content-analysis.md
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
  "mindMap": [
    {
      "name": "First Main Topic / Theme",
      "detail": "Core idea or thesis of this branch",
      "children": [
        {
          "name": "Subtopic / Concept",
          "detail": "Key reasoning, mechanism, or explanation",
          "children": [
            {
              "name": "Detail / Evidence",
              "detail": "Concrete takeaway or example"
            }
          ]
        }
      ]
    },
    {
      "name": "Second Main Topic / Theme",
      "detail": "Core idea or thesis of this branch",
      "children": [
        {
          "name": "Subtopic / Concept",
          "detail": "Key reasoning, mechanism, or explanation"
        }
      ]
    }
  ],
  "isLongForm": true,
  "chapterMap": [
    {"time": "00:12:34", "title": "chapter title", "summary": "one sentence"}
  ],
  "customQuestionAnswers": [
    {
      "question": "exact question text",
      "answer": "direct answer",
      "sources": [{"ref": "12:34", "quote": "brief supporting quote"}]
    }
  ]
}

## Output Rules
- titleVerdict must be a single sentence.
- coreSummary: at most 3 bullets, plain language.
- mindMap: main branches/topics directly at the root level (do NOT wrap everything in a single overall root node; start directly with the main themes/sections), up to 3 levels deep total. Each node has a concise name and rich explanatory detail (1-2 sentences). Structure logically to form an outline/mind map of the author's ideas.
- isLongForm: true only for long articles/videos that meaningfully benefit from a chapter map.
- chapterMap: empty array when isLongForm is false. When video chapters are provided, keep their exact timestamps and titles, and only add your 1-sentence summary.
- chapterMap when Video Sections are listed above: return EXACTLY one entry per listed section, using the section's start time as "time" \u2014 give each a short title and a 1-sentence summary of what happens between that section and the next.
- chapterMap when NO chapters or sections were provided: empty array (the content is not a timestamped video).
- customQuestionAnswers: one entry per DISTINCT user question (empty array when none). Skip any user question that is equivalent in meaning to an Egg Key Question above or to another user question \u2014 answer it only once.
{{shared_output_rules}}
`;

// ../shared/workflow/egg-analysis.md
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
    {
      "question": "exact question text",
      "answer": "direct answer",
      "sources": [{"ref": "12:34", "quote": "brief supporting quote"}]
    }
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

// ../shared/workflow/follow-up.md
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
    {
      "question": "exact question text",
      "answer": "direct answer",
      "sources": [{"ref": "12:34", "quote": "brief supporting quote"}]
    }
  ]
}

## Output Rules:
- One entry per question, in the same order.
- If a question is equivalent to one in Previous Questions & Answers, answer briefly with the same conclusion instead of repeating it.
{{shared_output_rules}}
`;

// ../shared/workflow/egg-routing.md
var egg_routing_default = 'Given this content and egg index, which egg file(s) does this content belong to? Return ONLY the file names, one per line. If none match, return "none".\n\n## Content\nTitle: {{title}}\nURL: {{url}}\n{{content}}\n\n## Egg Index\n{{index}}\n\nReturn matching file names (one per line):\n';

// ../shared/workflow/content-task-default.md
var content_task_default_default = "1. Title Verdict: Provide a single, direct sentence that resolves the core question posed in the title or introduction.\n2. Core Summary: Summarize the main concepts in plain language using a maximum of 3 bullet points.\n3. Chapter Map (Long-form only): If the content is a long article or lengthy video, provide a brief 1-sentence summary for each major section or topic shift. If it is short, omit this step entirely.\n4. Mind Map: Construct a hierarchical concept tree capturing the core mental model or argument flow (up to 3 levels deep). Each node must have a concise `name` and informative explanatory `detail`.\n";

// ../shared/workflow/merge-unprocessed.md
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

// ../shared/workflow/aggregate-content.md
var aggregate_content_default = `You are a knowledge curator. The content below was too long for one pass and was analyzed in parts. Combine the per-part results into ONE coherent result for the whole content.

## Content
**Title:** {{title}}
**Source:** {{url}}
{{chapters}}

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
  "mindMap": [
    {
      "name": "First Main Topic",
      "detail": "Core idea",
      "children": [
        {
          "name": "Subtopic",
          "detail": "Key reasoning"
        }
      ]
    },
    {
      "name": "Second Main Topic",
      "detail": "Core idea",
      "children": [
        {
          "name": "Subtopic",
          "detail": "Key reasoning"
        }
      ]
    }
  ],
  "customQuestionAnswers": [
    {
      "question": "exact question text",
      "answer": "direct answer",
      "sources": [{"ref": "00:00", "quote": "brief supporting quote"}]
    }
  ]
}

## Output Rules
- mindMap: synthesized concept tree for the entire work, up to 3 levels deep, integrating points from across the parts. Have main branches directly at the root level (do NOT wrap in a single overall root node).
- customQuestionAnswers: one entry per DISTINCT user question (empty array when none). When citing sources, use timestamps or section headers from the Part summaries.
{{shared_output_rules}}
`;

// ../shared/workflow/aggregate-egg.md
var aggregate_egg_default = 'You are a knowledge curator for the egg file "{{egg_file}}". The content was too long for one pass and was analyzed against this egg in parts. Decide for the content AS A WHOLE and synthesize knowledge entries across parts.\n\n## Egg Instructions\n{{egg_instructions}}\n\n## Per-Part Findings\n{{chunk_findings}}\n\n## Task\n1. Synthesize Knowledge Entries across parts into "novelDelta":\n   - Connect and assemble related findings that spread across different parts (e.g. principles of a framework, steps of a methodology, or concepts introduced in one part and expanded in another) into complete, unified knowledge entries.\n   - When a concept was partially mentioned in an earlier part and fully explained in a later part, merge them into the single complete entry.\n   - For standalone insights from individual parts, preserve them as formatted entries.\n   - Determine "parent" in the Knowledge Tree for each entry.\n2. Answer each Key Question (if any) for the whole content, directly and concisely.\n3. Apply the Rejection Criteria to the whole content \u2014 set rejected to true with a one-line reason when it is noise for this egg.\n4. Decide: should the user spend time reading/watching this fully? Consider the reject criteria and whether the parts together add new insight.\n\n## Output Format\nRespond in this EXACT JSON format (no markdown, no code fence, just the JSON object):\n{\n  "novelDelta": [\n    {"parent": "parent heading in knowledge tree or empty string", "kind": "insight", "content": "- formatted entry text\\n  - sub bullets"}\n  ],\n  "keyQuestionAnswers": [\n    {\n      "question": "exact question text",\n      "answer": "direct answer",\n      "sources": [{"ref": "00:00", "quote": "brief supporting quote"}]\n    }\n  ],\n  "rejected": false,\n  "rejectReason": "",\n  "readVerdict": true,\n  "readVerdictReason": "one-line reason"\n}\n\n## Output Rules:\n{{shared_output_rules}}\n';

// ../shared/workflow/egg-compare.md
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

// ../shared/workflow/localize-egg.md
var localize_egg_default = 'You are a knowledge curator for NutEgg.\n\n## Egg Description\n{{description}}\n\n## Egg Template\n{{template}}\n\n## Task\nTranslate and adapt the concrete instructions, questions, criteria, and rule descriptions in the template above so they use the SAME LANGUAGE as the egg description: "{{description}}".\n\n## Output Rules:\n1. Language: All explanations, questions, criteria, and rule guidance must be written in the same language as the egg description: "{{description}}".\n2. Egg Parser Structure: The structure and these exact labels MUST remain in English:\n   - Frontmatter (`---`, `topic: ...`, `status: ...`, `last_updated: ...`, `language: <detected language name in English, e.g. English, Chinese, Japanese, Korean, Spanish, French, German, Russian>`)\n   - Callout: `> [!abstract]- Instructions:`\n   - Bold section labels: `> **Scope:**`, `> **Action Guide:**`, `> **Key Questions:**`, `> **Rejection Criteria:**`, `> **Formatting Rules:**`\n   - Step labels in Action Guide: `1. Title Verdict:`, `2. Core Summary:`, `3. Chapter Map (Long-form only):`, `4. Novel Delta:`, `5. Decide:`\n   - Headings: `# Knowledge` and `# Unprocessed`\n   - Tag names in Formatting Rules: `[concept]`, `[architecture]`, `[method]`, `[benchmark]`, `[explain]`, `[fact]`, `[example]`\n\nOutput ONLY the complete updated egg file markdown. Do NOT wrap in markdown code fences.\n\n';

// ../shared/workflow/shared-output-rules.md
var shared_output_rules_default = '- Grounding: The content is the ONLY source of truth for every answer and summary you produce. Report what the content actually says even when it contradicts common sense or well-known facts \u2014 never correct, refute, or supplement it with outside knowledge. If the content does not address a question, say "Not covered in this content".\n- Source References: For every question you answer (customQuestionAnswers, keyQuestionAnswers, answers), include a "sources" array citing WHERE in the content the answer comes from: `[{"ref": "...", "quote": "..."}]`.\n  - For video transcripts: `ref` must be the timestamp string (e.g. "12:34" or "1:05:30") where the relevant segment begins.\n  - For articles/webpages: `ref` must be the nearest section heading (e.g. "Methodology" or "Key Findings") or short location hint.\n  - `quote`: A brief verbatim excerpt (10-25 words) from that location directly supporting the answer.\n  - If the question is not covered in the content (or answered "Not covered in this content"), omit the "sources" field or return an empty array `[]`.\n- Output Language: Write ALL output text (verdicts, summaries, answers, knowledge entries, reasons) in {{output_language}}. Keep all JSON keys in English.';

// ../shared/src/prompt-templates.ts
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
function renderPrompt(template, vars = {}) {
  if (!template)
    return "";
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    const value = vars[key];
    return value === void 0 || value === null ? "" : String(value);
  });
}

// ../shared/src/types.ts
var DEFAULT_ANALYSIS_SECTIONS = {
  titleVerdict: true,
  coreSummary: true,
  mindMap: true,
  chapterMap: true
};

// ../shared/src/ai-processor.ts
function pruneTaskContent(taskText, sections) {
  if (!taskText)
    return "";
  const lines = taskText.split("\n");
  const filtered = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed)
      return false;
    if (!sections.titleVerdict && /title\s*verdict/i.test(line))
      return false;
    if (!sections.coreSummary && /core\s*summary/i.test(line))
      return false;
    if (!sections.chapterMap && /chapter\s*map/i.test(line))
      return false;
    if (!sections.mindMap && /mind\s*map/i.test(line))
      return false;
    return true;
  });
  return filtered.map((line, idx) => line.replace(/^\s*\d+[\.\)]\s*/, `${idx + 1}. `)).join("\n");
}
function pruneRulesFromTemplate(rulesBlock, sections) {
  if (!rulesBlock)
    return "";
  const lines = rulesBlock.split("\n");
  const result = [];
  let skippingCurrentBullet = false;
  for (const line of lines) {
    const isBulletStart = /^\s*[-*]\s+/.test(line);
    if (isBulletStart) {
      skippingCurrentBullet = false;
      if (!sections.titleVerdict && /^\s*[-*]\s*titleVerdict\b/i.test(line)) {
        skippingCurrentBullet = true;
        continue;
      }
      if (!sections.coreSummary && /^\s*[-*]\s*coreSummary\b/i.test(line)) {
        skippingCurrentBullet = true;
        continue;
      }
      if (!sections.mindMap && /^\s*[-*]\s*mindMap\b/i.test(line)) {
        skippingCurrentBullet = true;
        continue;
      }
      if (!sections.chapterMap && /^\s*[-*]\s*(chapterMap|isLongForm)\b/i.test(line)) {
        skippingCurrentBullet = true;
        continue;
      }
    }
    if (!skippingCurrentBullet) {
      result.push(line);
    }
  }
  return result.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
function pruneSchemaFromTemplate(schemaText, sections) {
  const startIdx = schemaText.indexOf("{");
  const endIdx = schemaText.lastIndexOf("}");
  if (startIdx === -1 || endIdx === -1)
    return schemaText;
  const inner = schemaText.slice(startIdx + 1, endIdx);
  const properties = [];
  let depth = 0;
  let inString = false;
  let escaped = false;
  let currentProp = "";
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (inString) {
      currentProp += c;
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
      currentProp += c;
      continue;
    }
    if (c === "{" || c === "[") {
      depth++;
      currentProp += c;
      continue;
    }
    if (c === "}" || c === "]") {
      depth--;
      currentProp += c;
      continue;
    }
    if (c === "," && depth === 0) {
      properties.push(currentProp);
      currentProp = "";
      continue;
    }
    currentProp += c;
  }
  if (currentProp.trim()) {
    properties.push(currentProp);
  }
  const filtered = properties.filter((prop) => {
    const keyMatch = prop.match(/"([^"]+)"\s*:/);
    if (!keyMatch)
      return true;
    const key = keyMatch[1];
    if (!sections.titleVerdict && key === "titleVerdict")
      return false;
    if (!sections.coreSummary && key === "coreSummary")
      return false;
    if (!sections.mindMap && key === "mindMap")
      return false;
    if (!sections.chapterMap && (key === "chapterMap" || key === "isLongForm"))
      return false;
    return true;
  });
  return "{\n  " + filtered.map((p) => p.trim()).join(",\n  ") + "\n}";
}
function applyPrunedSections(tpl, sections, _isAggregate = false) {
  const isDefault = sections.titleVerdict && sections.coreSummary && sections.mindMap && sections.chapterMap;
  if (isDefault)
    return tpl;
  let out = tpl;
  out = out.replace(
    /(## Task[^\n]*\n)([\s\S]*?)(\n##\s+|$)/,
    (match, header, taskBody, footer) => {
      if (taskBody.includes("{{content_task_default}}")) {
        return match;
      }
      const pruned = pruneTaskContent(taskBody, sections);
      return `${header}${pruned}${footer}`;
    }
  );
  const formatIdx = out.indexOf("## Output Format");
  if (formatIdx !== -1) {
    const afterFormat = formatIdx + "## Output Format".length;
    const nextHeaderMatch = out.slice(afterFormat).search(/\n##\s+/);
    const endOfFormatIdx = nextHeaderMatch !== -1 ? afterFormat + nextHeaderMatch : out.length;
    const formatSection = out.slice(formatIdx, endOfFormatIdx);
    const startBrace = formatSection.indexOf("{");
    const endBrace = formatSection.lastIndexOf("}");
    if (startBrace !== -1 && endBrace !== -1 && endBrace > startBrace) {
      const schemaBody = formatSection.slice(startBrace, endBrace + 1);
      const pruned = pruneSchemaFromTemplate(schemaBody, sections);
      out = out.slice(0, formatIdx + startBrace) + pruned + out.slice(formatIdx + endBrace + 1);
    }
  }
  out = out.replace(
    /(## Output Rules[^\n]*\n)([\s\S]*?)(\{\{shared_output_rules\}\}|\n##\s+|$)/,
    (match, header, rulesBody, footer) => {
      const pruned = pruneRulesFromTemplate(rulesBody, sections);
      return `${header}${pruned}
${footer}`;
    }
  );
  return out;
}
var MERGE_THRESHOLD = 20;
var AIProcessor = class {
  host;
  constructor(host) {
    this.host = host;
  }
  get chunkWindowChars() {
    const val = this.host?.settings?.chunkWindowChars;
    return typeof val === "number" && val > 0 ? val : DEFAULT_CHUNK_WINDOW_CHARS;
  }
  get sectionGridSeconds() {
    const val = this.host?.settings?.sectionGridSeconds;
    return typeof val === "number" && val > 0 ? val : DEFAULT_SECTION_SECS;
  }
  getPrompt(key) {
    const overrides = this.host?.settings?.promptOverrides || this.host?.settings?.chromeAiPromptOverrides;
    if (overrides && typeof overrides[key] === "string" && overrides[key].trim().length > 0) {
      return overrides[key];
    }
    return this.host?.workflowManager?.getPrompt(key) || PROMPTS[key] || "";
  }
  /** Output rules for Stage 1 content analysis (follows payload.outputLanguage or host settings.outputLanguage). */
  getContentOutputRules(capture) {
    const langSetting = capture?.outputLanguage || this.host?.settings?.outputLanguage || "same-as-content";
    const isSame = !langSetting || langSetting === "same-as-content";
    const outputLanguage = isSame ? "the same language as the captured content" : `${langSetting} (translate into ${langSetting} even if the source content is in a different language)`;
    const tpl = this.getPrompt("sharedOutputRules");
    return renderPrompt(tpl, { output_language: outputLanguage }).trim();
  }
  /** Output rules for Stage 2 egg analysis (follows the egg's language property). */
  getEggOutputRules(eggOrLanguage = "", fallbackDescription = "", capture) {
    let lang = "";
    let desc = fallbackDescription;
    if (typeof eggOrLanguage === "object" && eggOrLanguage !== null) {
      lang = (eggOrLanguage.language || "").trim();
      desc = desc || (eggOrLanguage.indexDescription || "").trim();
    } else {
      lang = (eggOrLanguage || "").trim();
    }
    const hostSetting = capture?.outputLanguage || this.host?.settings?.outputLanguage;
    const hostLang = hostSetting && hostSetting !== "same-as-content" ? hostSetting.trim() : "";
    const outputLanguage = lang ? lang.includes(" ") && !/^[A-Za-z]+$/.test(lang) ? `the same language as this reference: "${lang}"` : `${lang} (translate into ${lang} even if the source content is in a different language)` : hostLang ? `${hostLang} (translate into ${hostLang} even if the source content is in a different language)` : "the same language as this egg note's existing knowledge (or the captured content if the egg has no existing knowledge)";
    const tpl = this.getPrompt("sharedOutputRules");
    return renderPrompt(tpl, {
      output_language: outputLanguage
    }).trim();
  }
  /**
   * Run end-to-end pipeline: Stage 1 content analysis + Stage 2 egg analysis.
   */
  async analyze(capture, eggs) {
    if (!isAIConfigured(this.host?.settings)) {
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
    const effectiveSections = {
      ...DEFAULT_ANALYSIS_SECTIONS,
      ...capture.enabledSections || {}
    };
    if (!isAIConfigured(this.host?.settings)) {
      return {
        titleVerdict: effectiveSections.titleVerdict ? capture.title : "",
        coreSummary: effectiveSections.coreSummary ? [capture.title] : [],
        isLongForm: false,
        chapterMap: [],
        customQuestionAnswers: (capture.questions || []).map((q) => ({
          question: q,
          answer: "No API key configured \u2014 cannot answer."
        })),
        mindMap: []
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
              questions: [],
              enabledSections: effectiveSections
            },
            partNote(chunk)
          )
        )
      );
      const summary = await this.aggregateContent(
        {
          ...capture,
          enabledSections: effectiveSections
        },
        partResults.map((r, i) => ({
          part: i + 1,
          startTime: chunks[i].startTime,
          bullets: r.coreSummary,
          mindMap: effectiveSections.mindMap ? r.mindMap : void 0
        }))
      );
      const chapterMap = effectiveSections.chapterMap ? partResults.flatMap((r) => r.chapterMap) : [];
      return {
        titleVerdict: summary.titleVerdict,
        coreSummary: summary.coreSummary,
        isLongForm: true,
        chapterMap,
        customQuestionAnswers: summary.customQuestionAnswers,
        mindMap: summary.mindMap
      };
    }
    const single = chunks[0];
    const effective = {
      ...capture,
      chapters: single?.chapters,
      sections: single?.sections,
      enabledSections: effectiveSections
    };
    return this.callContentChunk(effective, "");
  }
  /**
   * Stage 2 — per-egg extraction, comparison against egg knowledge tree,
   * and final read verdict synthesis. Works identically for 1 or N eggs.
   */
  async analyzeEggs(capture, eggs, contentAnalysis) {
    if (!isAIConfigured(this.host?.settings) || eggs.length === 0) {
      const aiProvider = this.host?.settings?.chromeAiProvider || this.host?.settings?.aiProvider;
      return {
        ...contentAnalysis,
        shouldRead: eggs.length === 0 ? false : true,
        shouldReadReason: eggs.length === 0 ? "No matching egg found in vault." : aiProvider === "local" ? "Local LLM not configured." : "No API key configured.",
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
              partNote(chunk)
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
  async callContentChunk(capture, partNoteStr = "") {
    const sections = {
      ...DEFAULT_ANALYSIS_SECTIONS,
      ...capture.enabledSections || {}
    };
    const rawTpl = this.getPrompt("contentAnalysis");
    const prunedTpl = applyPrunedSections(rawTpl, sections, false);
    const rawTask = this.getPrompt("contentTaskDefault");
    const prunedTask = pruneTaskContent(rawTask, sections);
    const prompt = renderPrompt(prunedTpl, {
      content_task_default: prunedTask,
      title: capture.title,
      url: capture.url,
      source_type: capture.sourceType,
      part_note: partNoteStr,
      chapters: sections.chapterMap ? this.chaptersBlock(capture.chapters) : "",
      sections: sections.chapterMap ? this.sectionsBlock(capture.sections) : "",
      questions: this.questionsBlock(
        capture.questions,
        "User Questions (answer each directly and concisely)"
      ),
      content: this.truncate(capture.content, this.chunkWindowChars),
      shared_output_rules: this.getContentOutputRules(capture)
    });
    const configuredMax = this.host?.settings?.contentAnalysisMaxTokens || 16384;
    const response = await this.callAI(prompt, configuredMax);
    const parsed = this.parseJson(response, "content-analysis");
    return {
      titleVerdict: sections.titleVerdict ? String(parsed.titleVerdict || "Could not generate a verdict.") : "",
      coreSummary: sections.coreSummary && Array.isArray(parsed.coreSummary) ? parsed.coreSummary.map(String).slice(0, 3) : [],
      mindMap: sections.mindMap ? this.parseMindMap(parsed.mindMap) : [],
      isLongForm: sections.chapterMap ? parsed.isLongForm === true : false,
      chapterMap: !sections.chapterMap ? [] : parsed.isLongForm === false && (!capture.chapters || capture.chapters.length === 0) ? [] : this.completeChapterMap(
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
  async analyzeAgainstEgg(capture, egg, partNoteStr = "") {
    const formatInstructions = (e) => this.host?.eggParser?.formatEggInstructionsForPrompt ? this.host.eggParser.formatEggInstructionsForPrompt(e) : formatEggInstructionsForPrompt(e);
    const prompt = renderPrompt(this.getPrompt("eggAnalysis"), {
      egg_file: egg.fileName,
      egg_instructions: formatInstructions(egg),
      title: capture.title,
      url: capture.url,
      source_type: capture.sourceType,
      part_note: partNoteStr,
      content: this.truncate(capture.content, this.chunkWindowChars),
      shared_output_rules: this.getEggOutputRules(egg, "", capture)
    });
    try {
      const tokenBudget = this.host?.settings?.contentAnalysisMaxTokens || 16384;
      const response = await this.callAI(prompt, tokenBudget);
      const parsed = this.parseJson(response, "egg-analysis");
      const keyQuestionAnswers = this.parseKeyAnswers(parsed.keyQuestionAnswers);
      const extractedEntries = this.parseExtractedEntries(parsed.extractedEntries);
      const detectedLanguage = typeof parsed.language === "string" ? parsed.language.trim() : "";
      if (!egg.language && detectedLanguage) {
        egg.language = detectedLanguage;
        try {
          const vault = this.host?.app?.vault;
          const file = vault?.getAbstractFileByPath?.(egg.fileName);
          if (file && vault?.read && vault?.modify) {
            const content = await vault.read(file);
            const updated = insertEggLanguage(content, detectedLanguage);
            if (updated !== content) {
              await vault.modify(file, updated);
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
      rejection_criteria: egg.rejectionCriteria && egg.rejectionCriteria.length > 0 ? egg.rejectionCriteria.map((c) => `- ${c}`).join("\n") : "(none)",
      extracted_entries: extractedEntries.map((e, i) => `### Entry ${i + 1} (${e.kind || "insight"})
${e.content}`).join("\n\n"),
      shared_output_rules: this.getEggOutputRules(egg, "", capture)
    });
    try {
      const tokenBudget = this.host?.settings?.contentAnalysisMaxTokens || 16384;
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
    const sections = {
      ...DEFAULT_ANALYSIS_SECTIONS,
      ...capture.enabledSections || {}
    };
    const rawTpl = this.getPrompt("aggregateContent");
    const prunedTpl = applyPrunedSections(rawTpl, sections, true);
    const rawTask = this.getPrompt("contentTaskDefault");
    const prunedTask = pruneTaskContent(rawTask, sections);
    const prompt = renderPrompt(prunedTpl, {
      title: capture.title,
      url: capture.url,
      chapters: sections.chapterMap ? this.chaptersBlock(capture.chapters) : "",
      chunk_summaries: chunkSummaries.map((c) => {
        const at = c.startTime ? ` (${c.startTime})` : "";
        const bullets = c.bullets.map((b) => `- ${b}`).join("\n");
        let mmStr = "";
        if (sections.mindMap && Array.isArray(c.mindMap) && c.mindMap.length > 0) {
          mmStr = "\n### Key Concepts/Branches from this part:\n" + c.mindMap.map(
            (n) => `- **${n.name}**${n.detail ? `: ${n.detail}` : ""}`
          ).join("\n");
        }
        return `## Part ${c.part} of ${chunkSummaries.length}${at}
${bullets || "- (no summary)"}${mmStr}`;
      }).join("\n\n"),
      questions: this.questionsBlock(
        capture.questions,
        "User Questions (answer each directly and concisely)"
      ),
      content_task_default: prunedTask,
      shared_output_rules: this.getContentOutputRules(capture)
    });
    const defaultMax = sections.mindMap ? 4096 : 1500;
    const budget = Math.max(defaultMax, this.host?.settings?.contentAnalysisMaxTokens || defaultMax);
    const response = await this.callAI(prompt, budget);
    const parsed = this.parseJson(response, "aggregate-content");
    return {
      titleVerdict: sections.titleVerdict ? String(parsed.titleVerdict || "Could not generate a verdict.") : "",
      coreSummary: sections.coreSummary && Array.isArray(parsed.coreSummary) ? parsed.coreSummary.map(String).slice(0, 3) : [],
      customQuestionAnswers: this.parseKeyAnswers(parsed.customQuestionAnswers),
      mindMap: sections.mindMap ? this.parseMindMap(parsed.mindMap) : []
    };
  }
  /** Aggregate per-part delta findings into the egg's key answers + verdict. */
  async aggregateEgg(egg, chunkFindings) {
    const formatEgg = (e) => this.host?.eggParser?.formatEggForPrompt ? this.host.eggParser.formatEggForPrompt(e) : formatEggForPrompt(e);
    const prompt = renderPrompt(this.getPrompt("aggregateEgg"), {
      egg_file: egg.fileName,
      egg_instructions: formatEgg(egg),
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
    if (!isAIConfigured(this.host?.settings))
      return null;
    try {
      const prompt = renderPrompt(this.getPrompt("localizeEgg"), {
        description,
        template: templateContent
      });
      const maxTokens = Math.max(8192, this.host?.settings?.contentAnalysisMaxTokens || 8192);
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
  /**
   * Split content into <=chunkWindowChars parts. Timestamped transcripts
   * (YouTube) are split at caption lines and chapters are attached to the
   * chunk covering their start time; plain text is split at paragraphs.
   */
  chunkContent(content, chapters) {
    return chunkContent(
      content,
      chapters,
      this.chunkWindowChars,
      this.sectionGridSeconds
    );
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
      mindMap: [],
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
    if (!isAIConfigured(this.host?.settings)) {
      const aiProvider = this.host?.settings?.chromeAiProvider || this.host?.settings?.aiProvider;
      const msg = aiProvider === "local" ? "Local LLM not configured \u2014 cannot answer." : "No API key configured \u2014 cannot answer.";
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
      shared_output_rules: this.getContentOutputRules(capture)
    });
    try {
      const response = await this.callAI(prompt, 2e3);
      const parsed = this.parseJson(response, "follow-up");
      const answers = this.parseKeyAnswers(parsed.answers);
      const byQuestion = new Map(answers.map((a) => [a.question, a]));
      return questions.map((q) => {
        const found = byQuestion.get(q);
        const item = {
          question: q,
          answer: found?.answer || "No answer returned \u2014 please try again."
        };
        if (found?.sources && found.sources.length > 0) {
          item.sources = found.sources;
        }
        return item;
      });
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
    const egg = await this.host?.eggParser?.readEgg?.(fileName);
    if (!egg)
      return null;
    const countFn = (e) => this.host?.eggParser?.countUnprocessed ? this.host.eggParser.countUnprocessed(e) : countUnprocessed(e);
    const entries = countFn(egg);
    if (entries === 0) {
      console.log(`[NutEgg] ${fileName} has no unprocessed entries to merge`);
      return null;
    }
    if (!isAIConfigured(this.host?.settings)) {
      console.log(
        `[NutEgg] ${fileName} has ${entries} unprocessed entries \u2014 skipped merge (AI not configured)`
      );
      return null;
    }
    let fallbackDesc = "";
    if (!egg.language && this.host?.indexReader) {
      try {
        const indexContent = await this.host.indexReader.getIndexContent?.();
        if (indexContent) {
          const indexEntries = this.host.indexReader.parseIndexContent?.(indexContent) || [];
          const indexEntry = indexEntries.find(
            (e) => e.fileName === fileName || e.fileName.endsWith("/" + fileName)
          );
          fallbackDesc = indexEntry?.description || "";
        }
      } catch {
      }
    }
    const hostSetting = this.host?.settings?.outputLanguage;
    const hostLang = hostSetting && hostSetting !== "same-as-content" ? hostSetting.trim() : "";
    const outputLanguage = egg.language || (hostLang ? `${hostLang} (translate into ${hostLang} even if the source is in a different language)` : "") || "the same language as this egg's existing knowledge";
    const prompt = renderPrompt(this.getPrompt("mergeUnprocessed"), {
      egg_file: fileName,
      output_language: outputLanguage,
      egg_description: fallbackDesc || egg.scope || egg.topic || "",
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
      await this.host?.eggParser?.applyMerge?.(fileName, knowledge, unprocessed);
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
    const egg = await this.host?.eggParser?.readEgg?.(fileName);
    if (!egg)
      return null;
    const countFn = (e) => this.host?.eggParser?.countUnprocessed ? this.host.eggParser.countUnprocessed(e) : countUnprocessed(e);
    const entries = countFn(egg);
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
    if (!parsed || parsed.length === 0)
      return [];
    const byTime = new Map(parsed.map((e) => [toSeconds(e.time), e]));
    return sections.map((s) => {
      const e = byTime.get(toSeconds(s));
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
    if (!this.host?.aiClient) {
      throw new AIError("unknown", "AIClient not provided to AIProcessor host");
    }
    return await this.host.aiClient.chat(prompt, maxTokens);
  }
  /** Normalize a `[{question, answer, sources}]` array from the AI response. */
  parseKeyAnswers(raw) {
    return Array.isArray(raw) ? raw.filter((qa) => qa && qa.question && qa.answer).map((qa) => {
      const entry = {
        question: String(qa.question),
        answer: String(qa.answer)
      };
      if (Array.isArray(qa.sources)) {
        const sources = qa.sources.filter((s) => s && (s.ref || s.timestamp || s.section)).map((s) => {
          const item = {
            ref: String(s.ref || s.timestamp || s.section).trim()
          };
          if (s.quote) {
            item.quote = String(s.quote).trim();
          }
          return item;
        }).filter((s) => s.ref.length > 0);
        if (sources.length > 0) {
          entry.sources = sources;
        }
      }
      return entry;
    }) : [];
  }
  /** Normalize a hierarchical mind map array from the AI response. */
  parseMindMap(raw, depth = 0) {
    if (!Array.isArray(raw) || depth > 5)
      return [];
    return raw.filter((item) => item && (item.name || item.title || item.topic)).map((item) => {
      const node = {
        name: String(item.name || item.title || item.topic).trim()
      };
      const detail = item.detail || item.description || item.summary;
      if (detail && typeof detail === "string" && detail.trim().length > 0) {
        node.detail = detail.trim();
      }
      if (Array.isArray(item.children) && item.children.length > 0) {
        const children = this.parseMindMap(item.children, depth + 1);
        if (children.length > 0) {
          node.children = children;
        }
      }
      return node;
    });
  }
  /**
   * Parse an AI response that should be JSON, stripping markdown fences.
   * Sanitizes unescaped control characters (\n, \r, \t) in strings and
   * recovers partial/truncated JSON when responses are cut off mid-stream.
   */
  parseJson(response, context = "response") {
    return parseJson(response, context);
  }
  truncate(text, maxChars) {
    if (text.length <= maxChars)
      return text;
    return text.substring(0, maxChars) + "\n\n[...truncated]";
  }
  toSeconds(time) {
    return toSeconds(time);
  }
  formatSeconds(sec) {
    return formatSeconds(sec);
  }
};

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
    const { EggParser: EggParser2 } = await Promise.resolve().then(() => (init_egg_parser2(), egg_parser_exports));
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
init_egg_parser2();

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
  /** Update the save state or analysis result of one capture row. */
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
    if (patch.summary !== void 0) {
      sets.push("summary = ?");
      params.push(patch.summary);
    }
    if (patch.matchedEggs !== void 0) {
      sets.push("matched_eggs = ?");
      params.push(JSON.stringify(patch.matchedEggs));
    }
    if (patch.analysisResult !== void 0) {
      sets.push("analysis_result = ?");
      params.push(patch.analysisResult ? JSON.stringify(patch.analysisResult) : null);
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
        for (const t2 of doc.tokens) {
          if (t2 === term)
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
  return text.toLowerCase().split(/[^a-z0-9]+/).filter((t2) => t2.length > 1);
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
var import_obsidian4 = require("obsidian");
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
    badge.textContent = count > 0 ? t("unprocessedEntries", {
      count,
      entries: count === 1 ? t("entrySingle") : t("entryPlural")
    }) : t("treeUpToDate");
    appendCreditPill(plugin, badge);
    container.appendChild(badge);
    if (count > 0) {
      const button = document.createElement("button");
      button.className = "nutegg-merge-btn mod-cta";
      button.textContent = t("mergeButtonText");
      button.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (button.disabled)
          return;
        button.disabled = true;
        const originalText = button.textContent;
        button.textContent = t("mergingWithAi");
        try {
          const result = await runMerge(plugin, ctx.sourcePath, null);
          if (result && result.entries > 0) {
            new import_obsidian4.Notice(t("mergedEntries", { count: result.entries }));
            button.textContent = t("mergedSuccess");
            badge.textContent = t("treeUpToDate");
            setTimeout(() => {
              button.remove();
            }, 2e3);
          } else {
            new import_obsidian4.Notice(t("mergeNoChanges"));
            button.disabled = false;
            button.textContent = originalText;
          }
        } catch (err) {
          console.error("[NutEgg] Merge button click failed:", err);
          new import_obsidian4.Notice(t("mergeFailed", { error: err instanceof Error ? err.message : String(err) }));
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
    badge.textContent = this.count > 0 ? t("unprocessedEntries", {
      count: this.count,
      entries: this.count === 1 ? t("entrySingle") : t("entryPlural")
    }) : t("treeUpToDate");
    appendCreditPill(this.plugin, badge);
    wrap.appendChild(badge);
    if (this.count > 0) {
      const button = document.createElement("button");
      button.className = "nutegg-merge-btn mod-cta";
      button.textContent = t("mergeButtonText");
      button.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (button.disabled)
          return;
        button.disabled = true;
        const originalText = button.textContent;
        button.textContent = t("merging");
        try {
          const result = await runMerge(
            this.plugin,
            this.filePath,
            this.view.state.doc.toString()
          );
          if (result && result.entries > 0) {
            new import_obsidian4.Notice(t("mergedEntries", { count: result.entries }));
          } else {
            new import_obsidian4.Notice(t("mergeNoChanges"));
            button.disabled = false;
            button.textContent = originalText;
          }
        } catch (err) {
          console.error("[NutEgg] Editor merge failed:", err);
          new import_obsidian4.Notice(t("mergeFailed", { error: err instanceof Error ? err.message : String(err) }));
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
var import_obsidian5 = require("obsidian");
var import_view2 = require("@codemirror/view");
var CreateEggModal = class extends import_obsidian5.Modal {
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
    contentEl.createEl("h2", { text: t("createEggTitle") });
    const nameGroup = contentEl.createEl("div", {
      cls: "nutegg-modal-field-group"
    });
    nameGroup.style.marginBottom = "14px";
    nameGroup.createEl("label", {
      text: t("eggNameLabel"),
      cls: "nutegg-modal-label"
    }).style.cssText = "display: block; font-weight: 600; margin-bottom: 4px;";
    const nameInput = nameGroup.createEl("input", {
      type: "text",
      value: this.defaultName,
      placeholder: t("eggNamePlaceholder")
    });
    nameInput.style.cssText = "width: 100%; box-sizing: border-box; padding: 6px 10px;";
    const descGroup = contentEl.createEl("div", {
      cls: "nutegg-modal-field-group"
    });
    descGroup.style.marginBottom = "10px";
    descGroup.createEl("label", {
      text: t("eggDescLabel"),
      cls: "nutegg-modal-label"
    }).style.cssText = "display: block; font-weight: 600; margin-bottom: 4px;";
    const descInput = descGroup.createEl("textarea", {
      placeholder: t("eggDescPlaceholder")
    });
    descInput.value = this.defaultDescription;
    descInput.rows = 3;
    descInput.style.cssText = "width: 100%; box-sizing: border-box; padding: 6px 10px; resize: vertical;";
    const hint = contentEl.createEl("p", {
      cls: "nutegg-modal-hint",
      text: t("eggLangHint")
    });
    hint.style.cssText = "font-size: 0.85em; opacity: 0.75; margin: 4px 0 10px 0;";
    const btnRow = contentEl.createEl("div", {
      cls: "nutegg-modal-buttons"
    });
    btnRow.style.cssText = "display: flex; justify-content: flex-end; gap: 8px;";
    const cancelBtn = btnRow.createEl("button", { text: t("cancel") });
    cancelBtn.addEventListener("click", () => this.close());
    const submitBtn = btnRow.createEl("button", {
      cls: "mod-cta",
      text: t("createEgg")
    });
    const submit = async () => {
      const safeName = sanitizeEggName2(nameInput.value);
      const description = descInput.value.trim();
      if (!safeName) {
        new import_obsidian5.Notice(t("eggNameRequired"));
        nameInput.focus();
        return;
      }
      submitBtn.disabled = true;
      cancelBtn.disabled = true;
      const originalText = submitBtn.textContent;
      submitBtn.textContent = t("creatingEgg");
      try {
        const result = await this.plugin.indexSync.createEgg(
          safeName,
          description
        );
        this.close();
        if (result.alreadyExists) {
          new import_obsidian5.Notice(t("eggAlreadyExists", { path: result.path }));
        } else {
          new import_obsidian5.Notice(t("eggCreated", { path: result.path }));
        }
        const file = this.app.vault.getAbstractFileByPath(result.path);
        if (file) {
          const leaf = this.app.workspace.getLeaf(false);
          await leaf.openFile(file);
        }
      } catch (err) {
        console.error("[NutEgg] Failed to create egg from modal:", err);
        new import_obsidian5.Notice(
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
    btn.textContent = t("syncingIndex");
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
        new import_obsidian5.Notice(t("indexSynced", { summary: parts.join(", ") }));
      } else {
        new import_obsidian5.Notice(t("indexAllSynced"));
      }
      await update();
    } catch (err) {
      new import_obsidian5.Notice(t("indexSyncFailed", { error: err instanceof Error ? err.message : String(err) }));
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
      btn.textContent = `\u{1F423} ${t("newEggButton")}`;
      btn.title = t("cmdNewEgg");
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
    btn.textContent = `\u{1F423} ${t("newEggButton")}`;
    btn.title = t("cmdNewEgg");
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
var import_obsidian6 = require("obsidian");

// ../shared/workflow/README.md
var README_default = '# NutEgg AI Workflow & Prompt Reference\n\nWelcome to the **NutEgg Workflow Engine**. The files in this folder define the prompts, instructions, and schemas that power NutEgg\'s AI extraction and knowledge synthesis pipeline.\n\n- \u{1F310} **Chrome Extension:** [NutEgg on Chrome Web Store](https://chromewebstore.google.com/detail/nutegg/bmdmdiicembobejibggoeiahaonphcol)\n- \u{1F48E} **Obsidian Plugin:** [NutEgg on Obsidian Community Plugins](https://community.obsidian.md/plugins/nutegg)\n\n> [!TIP]\n> You can freely edit and customize any file in this directory to tailor NutEgg\'s analysis to your specific needs (e.g. changing the tone, adding domain-specific perspectives, or adjusting extraction depth).\n\n---\n\n## Architecture Overview\n\nNutEgg uses a **Two-Stage Analysis Architecture** designed for high precision, token efficiency, and user control. Rather than running a monolithic prompt, NutEgg separates broad content understanding from deep, egg-specific knowledge comparison.\n\n```\n                    \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510\n                    \u2502      Captured Web Content     \u2502\n                    \u2502   (Article / YouTube / Tweet) \u2502\n                    \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518\n                                    \u2502\n                                    \u25BC\n       ===========================================================\n       STAGE 1: Content Analysis & Summary-Based Egg Routing\n       ===========================================================\n                                    \u2502\n                         Is content >30k chars?\n                            \u251C\u2500\u2500 No  \u2500\u2500\u25BA [content-analysis.md]\n                            \u2514\u2500\u2500 Yes \u2500\u2500\u25BA Chunks + [aggregate-content.md]\n                                    \u2502\n                                    \u25BC\n                    Produces: Title Verdict, 3-Bullet Summary,\n                    Mind Map, Chapter Map, & Timestamped Q&A\n                                    \u2502\n                                    \u25BC\n                           [egg-routing.md]\n           (Routes matched eggs from _index.md using the\n            concise Stage 1 summary instead of raw content)\n                                    \u2502\n                                    \u25BC\n       ===========================================================\n       INTERACTIVE CHOICE / EXECUTION MODE (Chrome Extension)\n       ===========================================================\n                                    \u2502\n                        Which mode is selected?\n                                    \u2502\n            \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510\n            \u25BC                       \u25BC                       \u25BC\n     [Standalone Mode]         [Fast Mode]         [Confirm Eggs Mode]\n     Obsidian is offline.      Auto-proceeds to    User reviews matched eggs:\n     Runs Stage 1 in Chrome    Stage 2 with all    \u251C\u2500\u2500 "Collect Nut Only"\n     with user\'s API key.      matched eggs.       \u2514\u2500\u2500 Add/remove eggs \u2500\u2500\u25BA Proceed\n     (Fast reading & Q&A)           \u2502                       \u2502\n            \u2502                       \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518\n            \u25BC                                   \u25BC\n    Results in Side Panel      ===========================================================\n    (No Stage 2 comparison)    STAGE 2: Per-Egg Knowledge Extraction & Novelty Comparison\n                               ===========================================================\n                                                \u2502\n                                   For each confirmed egg (1 or N):\n                                                \u2502\n                                                \u25BC\n                                        [egg-analysis.md]\n                                  (Extract candidate knowledge entries\n                                   & key questions scoped to this egg)\n                                                \u2502\n                                                \u25BC\n                                        [egg-compare.md]\n                                  (Diffs candidate entries against the\n                                   egg\'s existing # Knowledge tree to find\n                                   true novel insights & decide read verdict)\n                                                \u2502\n                                                \u25BC\n                                     Results returned to Popup\n                                     (Ready to Save Nut & Eggs)\n```\n\n> [!NOTE]\n> **Why Summary-Based Routing?**\n> Passing the Stage 1 summary to `egg-routing.md` instead of full raw articles or multi-hour video transcripts saves tens of thousands of tokens per capture and dramatically improves routing accuracy by focusing on distilled, high-signal semantic themes.\n\n---\n\n### Execution Modes\n\n| Mode | Behavior | Best Used For |\n|---|---|---|\n| **\u{1F4F1} Standalone Mode** | Runs Stage 1 content analysis directly in Chrome via the extension service worker and user\'s API key (when Obsidian is offline or closed). Produces verdicts, 3-sentence summaries, chapter maps, mind maps, and interactive video Q&A with clickable timestamp jumping. Skips Stage 2 vault comparison. | Fast web and video reading, quick comprehension, or users without Obsidian running. |\n| **\u26A1 Fast Mode** | Runs Stage 1 content analysis, routes eggs automatically via `_index.md`, and immediately executes Stage 2 knowledge comparison in one uninterrupted pass. | Everyday reading and quick captures when you trust automatic egg matching. |\n| **\u{1F95A} Confirm Eggs Mode** | Runs Stage 1 content analysis, then pauses in the popup. Shows matched eggs alongside your vault\'s full egg list. You can add/remove eggs, proceed with knowledge comparison, or click **Collect Nut Only** to save the note immediately without comparing against eggs. | Deep research, ambiguous topics, or when you only want a quick summary without updating egg knowledge trees. |\n\n---\n\n### Long Content (>30k Chars) Pipeline\n\nFor long articles, papers, or video transcripts (>30k characters), content is automatically split into timestamped or paragraph chunks (<=30k chars each) and aggregated in both stages:\n\n```\n  Captured Long Content \u2500\u2500\u25BA Split into Chunks (Part 1, Part 2, ... Part N)\n                                \u2502\n       \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510\n       \u25BC                                                 \u25BC\n  Stage 1: Content Summary                          Stage 2: Per-Egg Knowledge\n  Run [content-analysis.md]                         For each confirmed egg:\n  for each chunk                                    Run [egg-analysis.md] + [egg-compare.md]\n       \u2502                                            for each chunk\n       \u25BC                                                 \u2502\n  [aggregate-content.md]                                 \u25BC\n  Merges chunk summaries into ONE                   [aggregate-egg.md]\n  cohesive title verdict, 3-bullet                  Synthesizes cross-part findings\n  core summary, and custom Q&A.                     into unified novel delta, answers\n       \u2502                                            key questions, & read verdict.\n       \u25BC                                                 \u2502\n  [egg-routing.md]                                       \u2502\n  (Routes eggs via aggregated summary)                   \u2502\n       \u2502                                                 \u2502\n       \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518\n                                \u2502\n                                \u25BC\n                    Results returned to Popup\n```\n\n---\n\n### Other Workflows (Independent of Capture)\n\n```\n  User asks follow-up questions in Chrome popup\n     \u2514\u2500\u2500\u25BA [follow-up.md] (interactive Q&A, 1 AI call per batch)\n\n  Unprocessed entries accumulate in an egg note (20+ threshold or manual button)\n     \u2514\u2500\u2500\u25BA [merge-unprocessed.md] (merge into # Knowledge tree, 1 AI call)\n\n  User creates a new egg with a non-English description\n     \u2514\u2500\u2500\u25BA [localize-egg.md] (translate egg template, 1 AI call)\n```\n\n---\n\n## Prompt Dependency & Injection Map\n\nSome prompt files are **shared fragments** that are not executed independently, but are injected into other prompts via `{{placeholder}}` variables at runtime:\n\n```mermaid\nflowchart TD\n    subgraph Shared ["1. Shared Fragments (Injected via Placeholders)"]\n        direction TB\n        SOR["shared-output-rules.md<br/><i>(Grounding directive & output language)</i>"]\n        CTD["content-task-default.md<br/><i>(Default content analysis tasks)</i>"]\n    end\n\n    subgraph Capture ["2. Content Capture & Synthesis Pipeline"]\n        direction TB\n        CA["content-analysis.md<br/><i>(Stage 1: Content summary & Q&A)</i>"]\n        ROUT["egg-routing.md<br/><i>(Stage 1: Summary-based egg routing)</i>"]\n        EA["egg-analysis.md<br/><i>(Stage 2: Per-egg knowledge extraction)</i>"]\n        CMP["egg-compare.md<br/><i>(Stage 2: Knowledge tree diff)</i>"]\n        AC["aggregate-content.md<br/><i>(Stage 1 chunk aggregation)</i>"]\n        AE["aggregate-egg.md<br/><i>(Stage 2 chunk aggregation)</i>"]\n\n        CA --> ROUT\n        ROUT --> EA\n        EA --> CMP\n    end\n\n    subgraph Independent ["3. Independent Features"]\n        direction TB\n        FU["follow-up.md<br/><i>(Interactive popup Q&A)</i>"]\n        MU["merge-unprocessed.md<br/><i>(20+ entries knowledge merge)</i>"]\n        LOC["localize-egg.md<br/><i>(Translate new egg template)</i>"]\n        FU ~~~ MU ~~~ LOC\n    end\n\n    Shared ~~~ Capture\n    Capture ~~~ Independent\n\n    %% Injection connections\n    CTD -.->|"{{content_task_default}}"| CA\n    CTD -.->|"{{content_task_default}}"| AC\n\n    SOR -.->|"{{shared_output_rules}}"| CA\n    SOR -.->|"{{shared_output_rules}}"| EA\n    SOR -.->|"{{shared_output_rules}}"| CMP\n    SOR -.->|"{{shared_output_rules}}"| AC\n    SOR -.->|"{{shared_output_rules}}"| AE\n    SOR -.->|"{{shared_output_rules}}"| FU\n```\n\n---\n\n## Anatomy of an Egg File & How Instructions Work\n\nAn **Egg file** (`nutegg/*.md`) is both a curated knowledge repository and an instruction manual that guides NutEgg\'s AI pipeline whenever content touches that domain.\n\n### 1. Structural Blueprint\n\n```markdown\n---\ntopic: "AI Architecture & Multi-Agent Systems"\nstatus: "active"\nlast_updated: "2026-09-10"\nlanguage: "English"\n---\n\n> [!abstract]- Instructions:\n> **Scope:** Multi-agent architectures, tool calling, memory layers, and LLM evaluation.\n> **Action Guide:** Focus on actionable design patterns, scalability tradeoffs, and real failure modes.\n> **Key Questions:**\n> 1. How are agent memory loops bounded to prevent context window overflow?\n> 2. What coordination mechanism is used between subagents?\n> **Rejection Criteria:**\n> - Ignore basic beginner tutorials or high-level sales pitches without technical substance.\n> - Discard speculative claims lacking empirical benchmarks or code evidence.\n> **Formatting Rules:**\n> - Prefix each insight with a bracketed tag: `[concept]`, `[architecture]`, `[method]`, `[benchmark]`, `[explain]`, `[fact]`, `[example]`.\n> - Use the structure: `- [tag] **Concept Name**` followed by an indented explanation and concrete examples (`- \u{1F3AF} Example:`).\n\n# Knowledge\n## Agent Memory\n- [architecture] **Bounded Replay Buffers**\n    - Ephemeral short-term memory expires after session goals terminate to conserve token budget.\n    - \u{1F3AF} Example: Tool calling trace logs stored in vector stores with sliding window eviction.\n\n# Unprocessed\n(Newly hatched insights land here from captures until auto-merged)\n```\n\n### 2. How to Write Egg Instructions\n\nEach field in the `> [!abstract]- Instructions:` callout controls a specific behavior in the AI workflow:\n\n| Field | Purpose & Best Practices | Workflow Usage |\n|---|---|---|\n| **`**Scope:**`** | 1\u20132 sentences defining the topical boundaries of this egg. Specify what technologies, domains, or concepts are included and excluded. | Injected into [`egg-analysis.md`](./egg-analysis.md) (Stage 2) so the AI extracts knowledge through this domain lens. |\n| **`**Action Guide:**`** | 2-step instructions for Stage 2 egg analysis: Step 1 (Novel Delta: extract only genuinely new insights) and Step 2 (Decide: whether user should spend time reading). | Injected into [`egg-analysis.md`](./egg-analysis.md) and [`egg-compare.md`](./egg-compare.md) (Stage 2). |\n| **`**Key Questions:**`** | Numbered list of recurring questions you want answered whenever content touches this domain (e.g. *"What are the hidden tradeoffs?", "What is the token cost?"*). | Injected into [`egg-analysis.md`](./egg-analysis.md) (Stage 2). Answered in the popup and raw capture notes. |\n| **`**Rejection Criteria:**`** | Bulleted list of low-signal filters (e.g. *"Ignore beginner tutorials", "Reject speculative price talk"*). | Injected into [`egg-compare.md`](./egg-compare.md) (Stage 2). If matched, flags `rejected: true`, sets `readVerdict: false`, and gives a skip reason. |\n| **`**Formatting Rules:**`** | Standards for phrasing, tags (`[concept]`, `[architecture]`, `[method]`, etc.), and hierarchical indentation. | Injected into [`egg-analysis.md`](./egg-analysis.md) (Stage 2). Guarantees candidate entries match your notes\' formatting. |\n\n### 3. Knowledge Tree vs. Unprocessed Queue\n\n- **`# Knowledge` (Curated Knowledge Tree)**:\n  - Structured with markdown headings (`##`, `###`) and indented bullet points.\n  - Injected as `{{knowledge_tree}}` into [`egg-compare.md`](./egg-compare.md) (Stage 2). The AI compares extracted candidate insights against this tree to filter out redundant concepts and surface only true **Novel Delta**.\n- **`# Unprocessed` (Staging Queue)**:\n  - When you click **\u{1F95A} Hatch Egg** in the browser, fresh insights are safely appended to `# Unprocessed` first. This prevents AI runs from corrupting your curated knowledge tree.\n  - When 20+ entries accumulate (or when you click **Merge** in the Obsidian reading view widget), [`merge-unprocessed.md`](./merge-unprocessed.md) runs automatically to deduplicate and nest pending entries under appropriate parent concepts in `# Knowledge`.\n\n### 4. End-to-End Workflow Mapping\n\n```\n                                  [Captured Web Content]\n                                            \u2502\n               Stage 1: Content Analysis    \u25BC    _index.md (Topic routing guide)\n               \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n               \u2022 Uses content-task-default.md (fixed content tasks)\n               \u2022 Generates Title Verdict, 3-Bullet Summary, Chapter Map\n               \u2022 egg-routing.md matches egg descriptions via Stage 1 summary\n                                            \u2502\n                                            \u25BC\n               Interactive Review: User confirms or selects target eggs\n                                            \u2502\n               Stage 2: Per-Egg Deep Dive   \u25BC    Target Egg File (nutegg/*.md)\n               \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n               \u2022 Scope, Key Questions, Formatting Rules \u2500\u2500\u25BA egg-analysis.md\n                 (Extracts candidate knowledge entries and answers questions)\n               \u2022 Rejection Criteria, # Knowledge Tree \u2500\u2500\u25BA egg-compare.md\n                 (Diffs candidates against existing tree, drops redundant entries)\n                                            \u2502\n                                            \u25BC\n               Hatch Egg: Confirmed novel entries appended to # Unprocessed\n                                            \u2502\n               Merge Cycle (20+ entries or button click)\n               \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n               \u2022 merge-unprocessed.md nests and integrates entries into # Knowledge\n```\n\n---\n\n## Workflow File Directory\n\n### 1. Shared Fragments\n\nThese are **not standalone prompts** \u2014 they are modular snippets injected as `{{placeholders}}` into other prompts.\n\n| File | Injected As | Injected Into | Purpose |\n|---|---|---|---|\n| [`shared-output-rules.md`](./shared-output-rules.md) | `{{shared_output_rules}}` | `content-analysis`, `egg-analysis`, `egg-compare`, `aggregate-content`, `aggregate-egg`, `follow-up` | Combined grounding directive (content as sole truth) and multi-lingual output language reference rule. |\n| [`content-task-default.md`](./content-task-default.md) | `{{content_task_default}}` | `content-analysis`, `aggregate-content` | Default fixed tasks for content analysis: Title Verdict, 3-Bullet Core Summary, and Chapter Map. |\n\n### 2. Content Capture Pipeline\n\n| File | Pipeline Stage | Purpose | Output Format |\n|---|---|---|---|\n| [`content-analysis.md`](./content-analysis.md) | Stage 1: Content Analysis (Used in both Standalone & Connected modes) | Content-level analysis: title verdict, 3-bullet summary, interactive mind map, chapter map, and custom user question answers with timestamp sources. | JSON (`titleVerdict`, `coreSummary`, `mindMap`, `isLongForm`, `chapterMap`, `customQuestionAnswers` [with `sources: [{"ref", "quote"}]`]) |\n| [`egg-routing.md`](./egg-routing.md) | Stage 1: Summary-Based Routing | Matches the Stage 1 content summary against egg descriptions in `_index.md` to select matching eggs with minimal tokens. | Plain text list of filenames (one per line) |\n| [`egg-analysis.md`](./egg-analysis.md) | Stage 2: Egg Extraction | Per-egg extraction: candidate knowledge entries and key question answers scoped strictly to one egg\'s instructions. | JSON (`keyQuestionAnswers`, `extractedEntries`) |\n| [`egg-compare.md`](./egg-compare.md) | Stage 2: Knowledge Diff | Diffs candidate entries against the egg\'s existing `# Knowledge` tree and `# Unprocessed` to find novel insights and determine read verdict. | JSON (`novelDelta`, `redundantEntries`, `rejected`, `rejectReason`, `readVerdict`, `readVerdictReason`) |\n\n### 3. Long Content Aggregation\n\nUsed only when content exceeds ~30k characters (long articles, 1-2 hour videos). Each chunk is processed through extraction first, then these prompts synthesize the per-chunk results.\n\n| File | Pipeline Stage | Purpose | Output Format |\n|---|---|---|---|\n| [`aggregate-content.md`](./aggregate-content.md) | Stage 1 Aggregation | Merges per-chunk summaries into one cohesive title verdict, core summary, and user Q&A for the whole content. | JSON (`titleVerdict`, `coreSummary`, `customQuestionAnswers`) |\n| [`aggregate-egg.md`](./aggregate-egg.md) | Stage 2 Aggregation | Synthesizes per-chunk findings into unified knowledge entries, key question answers, and read verdict for each egg. | JSON (`novelDelta`, `keyQuestionAnswers`, `rejected`, `rejectReason`, `readVerdict`, `readVerdictReason`) |\n\n### 4. Independent Features\n\n| File | Trigger | Purpose | Output Format |\n|---|---|---|---|\n| [`follow-up.md`](./follow-up.md) | User asks questions in Chrome popup (Standalone or Connected) | Answers follow-up questions about the captured content with conversation history context and timestamp citations for direct video player jumping. | JSON (`answers`: `[{"question", "answer", "sources": [{"ref", "quote"}]}]`) |\n| [`merge-unprocessed.md`](./merge-unprocessed.md) | Manual button or 20+ entries threshold | Deduplicates and nests accumulated `# Unprocessed` entries into the structured `# Knowledge` tree. | JSON (`knowledge`, `unprocessed`) |\n| [`localize-egg.md`](./localize-egg.md) | New egg with non-English description | Translates the egg template into the language of the egg\'s description while keeping parser-critical headings in English. | Full egg note (Markdown) |\n\n---\n\n## Customization Rules & Guidelines\n\n### \u2705 What You Can Safely Customize\n- **Tone and Perspective**: You can instruct the AI to be more critical, more technical, or focus on specific themes.\n- **Summary Depth**: You can change how concise or detailed summaries should be.\n- **Language / Idiom Preferences**: You can tweak phrasing, formatting preferences, or custom analytical lenses.\n- **Shared Output Rules**: Edit `shared-output-rules.md` to adjust how strictly the AI stays grounded to the source content or handles output languages across all prompts.\n\n### \u26A0\uFE0F What You Must Preserve (To Prevent Parser Errors)\n1. **`{{placeholders}}`**: The strings enclosed in double curly braces (e.g. `{{content}}`, `{{egg_description}}`, `{{knowledge_tree}}`) are replaced dynamically by the engine. Do not delete or rename them.\n2. **JSON Schemas**: Prompts that output JSON must keep the exact JSON key names specified in the template. The TypeScript engine parses these exact keys.\n3. **Markdown Structural Headings**: In prompts that output markdown (`localize-egg.md`), structural labels and headings like `# Knowledge` and `# Unprocessed` must remain verbatim in English for the note parser.\n\n---\n\n## Updates & Conflict Resolution\n\nWhen NutEgg updates to a newer version:\n- **If you haven\'t edited a workflow file**: The plugin automatically updates it to the latest version.\n- **If you have customized a workflow file**: NutEgg will **never overwrite your custom version**. Instead, it writes `[filename].new.md` alongside your file so you can inspect what changed in the update.\n- **Obsolete prompt cleanup**: Any unedited prompt files that were removed in a newer release of NutEgg are automatically pruned so your `_workflow/` folder stays clean.\n- **Use Defaults (Clean Reset)**: You can reset all workflow files back to factory defaults at any time from `Obsidian Settings \u2192 NutEgg \u2192 Use Default Workflow Prompts` by clicking **Use Defaults**. This safely moves all your existing files to a timestamped backup folder (`_workflow/_backup/<timestamp>/`), clears obsolete files, and restores clean built-in defaults.\n';

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
          if (file instanceof import_obsidian6.TFile) {
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
            if (file instanceof import_obsidian6.TFile) {
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
                new import_obsidian6.Notice(
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
    new import_obsidian6.Notice(`[NutEgg] Reset workflow files to defaults. Previous files moved to ${backupFolder}`);
  }
  /** Alias for backward compatibility */
  async syncToDefaults() {
    return this.resetToDefaults();
  }
  async onFileChanged(file) {
    if (!(file instanceof import_obsidian6.TFile) || !file.path.startsWith(this.workflowFolder)) {
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
var NutEggPlugin = class extends import_obsidian7.Plugin {
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
      new import_obsidian7.Notice(t("serverStarted", { port: this.settings.serverPort }));
    } catch (err) {
      console.error("[NutEgg] Failed to start server:", err);
      new import_obsidian7.Notice(t("serverFailed"));
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
    this.addRibbonIcon("egg", t("ribbonOpenIndex"), async () => {
      const indexPath = this.settings.indexFile;
      const file = this.app.vault.getAbstractFileByPath(indexPath);
      if (file) {
        const leaf = this.app.workspace.getLeaf(false);
        await leaf.openFile(file);
      }
    });
    this.addRibbonIcon("coins", t("ribbonCheckCredit"), async () => {
      await this.updateCreditStatusBar(true);
    });
    this.addCommand({
      id: "nutegg-new-egg",
      name: t("cmdNewEgg"),
      callback: () => {
        new CreateEggModal(this.app, this).open();
      }
    });
    this.addCommand({
      id: "nutegg-open-index",
      name: t("cmdOpenIndex"),
      callback: async () => {
        const indexPath = this.settings.indexFile;
        const file = this.app.vault.getAbstractFileByPath(indexPath);
        if (file) {
          const leaf = this.app.workspace.getLeaf(false);
          await leaf.openFile(file);
        } else {
          new import_obsidian7.Notice(t("indexNotFound", { path: indexPath }));
        }
      }
    });
    this.addCommand({
      id: "nutegg-merge-current-egg",
      name: t("cmdMergeCurrent"),
      callback: async () => {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
          new import_obsidian7.Notice(t("noActiveFile"));
          return;
        }
        if (!isEggPath(activeFile.path, this.vaultFolder)) {
          new import_obsidian7.Notice(t("notEggNote"));
          return;
        }
        new import_obsidian7.Notice(t("mergingEntries", { name: activeFile.basename }));
        const activeView = this.app.workspace.getActiveViewOfType(import_obsidian7.MarkdownView);
        const cm = activeView?.editor?.cm;
        const docText = cm ? cm.state.doc.toString() : null;
        const result = await runMerge(this, activeFile.path, docText);
        if (result && result.entries > 0) {
          new import_obsidian7.Notice(t("mergedEntries", { count: result.entries }));
        } else {
          new import_obsidian7.Notice(t("noUnprocessed"));
        }
      }
    });
    this.addCommand({
      id: "nutegg-check-credit",
      name: t("cmdCheckCredit"),
      callback: async () => {
        await this.updateCreditStatusBar(true);
      }
    });
    this.addCommand({
      id: "nutegg-use-default-workflow-prompts",
      name: t("cmdUseDefaultWorkflowPrompts"),
      callback: async () => {
        await this.workflowManager.resetToDefaults();
      }
    });
    this.addCommand({
      id: "nutegg-report-bug",
      name: t("cmdReportBug"),
      callback: () => {
        this.openBugReport();
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
          new import_obsidian7.Notice(`[NutEgg] ${credit.providerLabel}: ${credit.statusText}`);
        }
      } else {
        const label = this.settings.aiProvider === "openrouter" ? "OpenRouter" : credit.providerLabel;
        this.creditStatusBarItem.setText(`\u{1FA99} ${label}`);
        this.creditStatusBarItem.setAttribute(
          "aria-label",
          `NutEgg AI: ${credit.statusText} (Click to refresh)`
        );
        if (showNotice) {
          new import_obsidian7.Notice(`[NutEgg] AI Provider: ${credit.statusText}`);
        }
      }
    } catch {
      this.creditStatusBarItem.setText("\u{1FA99} AI");
    }
  }
  /**
   * Redirect to GitHub issues prefilled with bug report template.
   */
  openBugReport(contentUrl = "", errorContext = "") {
    const version = this.manifest.version || "0.0.0";
    const osInfo = typeof process !== "undefined" ? `${process.platform} ${process.arch}` : navigator.userAgent || "Desktop";
    const observed = errorContext ? `Encountered error: ${errorContext}` : "<!-- Describe what actually happened (e.g. error message, unexpected output, failed merge, sync issue) -->";
    const body = [
      "### URL of the content",
      contentUrl || "[Enter the URL of the article, video, or webpage here if applicable]",
      "",
      "### Expected behavior",
      "<!-- A clear description of what you expected to happen -->",
      "",
      "",
      "### Observed behavior",
      observed,
      "",
      "",
      "### Environment",
      `- NutEgg Obsidian Plugin Version: v${version}`,
      `- OS / Platform: ${osInfo}`,
      `- AI Provider: ${this.settings.aiProvider}`,
      `- AI Model: ${this.settings.aiModel}`
    ].join("\n");
    const title = errorContext ? `[Bug]: ${errorContext.slice(0, 60)}` : "[Bug]: ";
    const issueUrl = `https://github.com/staff-000/nutegg/issues/new?title=${encodeURIComponent(
      title
    )}&body=${encodeURIComponent(body)}`;
    window.open(issueUrl, "_blank");
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
