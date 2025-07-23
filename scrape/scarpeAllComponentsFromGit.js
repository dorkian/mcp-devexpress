import axios from "axios";
import 'dotenv/config';
import fs from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const owner = "DevExpress";
const repo = "devextreme-documentation";
const basePath = "api-reference";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";

async function listDirectory(path) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const response = await axios.get(url, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      ...(GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {}),
    },
  });
  return response.data;
}

async function fetchMdContent(url) {
  const response = await axios.get(url, {
    headers: {
      Accept: "application/vnd.github.v3.raw",
      ...(GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {}),
    },
  });
  return response.data;
}

function stripNumberPrefix(name) {
  // Remove leading numbers, dashes, and spaces (e.g., '01-Button' -> 'Button')
  return name.replace(/^\d+-?\s*/, "");
}

async function buildFolderTree(path) {
  const items = await listDirectory(path);
  const result = {};
  for (const item of items) {
    if (item.type === "dir") {
      // Recursively process subfolders
      result[stripNumberPrefix(item.name)] = await buildFolderTree(
        `${path}/${item.name}`
      );
    } else if (item.type === "file" && item.name.endsWith(".md")) {
      const propName = item.name.replace(/\.md$/, "");
      const mdContent = await fetchMdContent(item.download_url);
      result[propName] = mdContent;
    }
  }
  return result;
}

function cleanMarkdownLinks(text) {
  // Replace all [text](url) with [text]
  let cleaned = text ? text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '[$1]') : text;
  // Remove placeholder descriptions
  if (cleaned && cleaned.trim() === '<!-- Description goes here -->') {
    return null;
  }
  return cleaned;
}

async function parseMarkdownForFields(md, fetchMdContent) {
  // Extract type, default, and shortDescription from markdown text
  const typeMatch = md.match(/type:\s*([^\n]+)/i);
  const defaultMatch = md.match(/default:\s*([^\n]+)/i);
  const shortDescMatch = md.match(/shortDescription\s*\n*[-:]*\s*([^\n]+)/i) || md.match(/shortDescription\s*\n*<p>(.*?)<\/p>/i);

  // Find markdown links to .md files
  const linkMatch = md.match(/\[.*?\]\(([^)]+\.md)\)/);
  let description = shortDescMatch ? shortDescMatch[1].trim() : null;
  if (linkMatch) {
    // If the link is relative, prepend the GitHub repo path
    let mdPath = linkMatch[1];
    if (mdPath.startsWith('/')) {
      mdPath = mdPath.replace(/^\//, '');
    }
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/22_2/${mdPath}`;
    try {
      description = await fetchMdContent(url);
    } catch (e) {
      // fallback to original description if fetch fails
    }
  }
  // Clean markdown links in the description
  description = cleanMarkdownLinks(description);
  return {
    type: typeMatch ? typeMatch[1].trim() : null,
    default: defaultMatch ? defaultMatch[1].trim() : null,
    description
  };
}

async function extractSectionData(tree) {
  const properties = [];
  const Methods = [];
  const Events = [];
  const Types = [];
  const seen = new Set();

  for (const [key, value] of Object.entries(tree)) {
    const keyLower = key.toLowerCase();
    if (seen.has(keyLower) && keyLower === 'configuration') continue;
    seen.add(keyLower);
    if (typeof value === 'object' && value !== null) {
      // Recursively extract subMembers
      const sub = await extractSectionData(value);
      if (keyLower === 'methods') {
        Methods.push(...(sub.properties || []), ...(sub.Methods || []));
      } else if (keyLower === 'events') {
        Events.push(...(sub.properties || []), ...(sub.Events || []));
      } else if (keyLower === 'types') {
        Types.push(...(sub.properties || []), ...(sub.Types || []));
      } else {
        // Merge up all found events from subtrees
        if (sub.Events && sub.Events.length > 0) {
          Events.push(...sub.Events);
        }
        properties.push({ name: key === 'Configuration' ? 'Properties' : key, ...(sub.properties && sub.properties.length > 0 ? { subMembers: sub.properties } : {}) });
      }
    } else if (keyLower === 'methods' || keyLower === 'events' || keyLower === 'types') {
      continue;
    } else if (/^on[A-Z]/.test(key)) {
      // If property name matches event handler pattern, add to Events
      const parsed = await parseMarkdownForFields(value, fetchMdContent);
      Events.push({ name: key, ...parsed });
    } else {
      const parsed = await parseMarkdownForFields(value, fetchMdContent);
      properties.push({ name: key, ...parsed });
    }
  }
  return { properties, Methods, Events, Types };
}

async function flattenSingleSubMembers(arr) {
  if (!Array.isArray(arr)) return arr;
  const result = [];
  for (const item of arr) {
    if (
      item &&
      Array.isArray(item.subMembers) &&
      item.subMembers.length === 1 &&
      (!item.subMembers[0].subMembers || item.subMembers[0].subMembers.length === 0)
    ) {
      // Flatten only if the single subMember does not itself have subMembers
      result.push({ ...item.subMembers[0] });
    } else if (item && Array.isArray(item.subMembers)) {
      // Recursively flatten subMembers
      result.push({ ...item, subMembers: await flattenSingleSubMembers(item.subMembers) });
    } else {
      result.push(item);
    }
  }
  return result;
}

// (async () => {
//   const topFolders = await listDirectory(basePath);
//   for (const folder of topFolders.filter((f) => f.type === "dir")) {
//     const subfolders = await listDirectory(`${basePath}/${folder.name}`);
//     for (const subfolder of subfolders.filter((f) => f.type === "dir")) {
//       const subfolderName = stripNumberPrefix(subfolder.name);
//       const tree = await buildFolderTree(
//         `${basePath}/${folder.name}/${subfolder.name}`
//       );
//       const json = { [subfolderName]: tree };
//       const outPath = join(__dirname, `../data/${subfolderName}.json`);
//       await fs.writeFile(
//         outPath,
//         JSON.stringify(json, null, 2),
//         "utf8"
//       );
//       console.log(`Saved: ${outPath}`);
//     }
//   }
// })();

(async () => {
  const topFolders = await listDirectory(basePath);
  for (const folder of topFolders.filter((f) => f.type === "dir")) {
    const subfolders = await listDirectory(`${basePath}/${folder.name}`);
    for (const subfolder of subfolders.filter((f) => f.type === "dir")) {
      const subfolderName = stripNumberPrefix(subfolder.name);
      try {
        const tree = await buildFolderTree(
          `${basePath}/${folder.name}/${subfolder.name}`
        );
        let { properties, Methods, Events, Types } = await extractSectionData(tree);
        properties = await flattenSingleSubMembers(properties);
        Methods = await flattenSingleSubMembers(Methods);
        Events = await flattenSingleSubMembers(Events);
        Types = await flattenSingleSubMembers(Types);
        const json = { properties, Methods, Events, Types };
        const outPath = join(__dirname, `../data/${subfolderName}.json`);
        await fs.writeFile(
          outPath,
          JSON.stringify(json, null, 2),
          "utf8"
        );
        // Validation: read back and check structure
        try {
          const fileContent = await fs.readFile(outPath, "utf8");
          const parsed = JSON.parse(fileContent);
          const hasAllKeys = ["properties", "Methods", "Events", "Types"].every(k => k in parsed);
          if (hasAllKeys) {
            console.log(`SUCCESS: ${outPath} generated and validated.`);
          } else {
            console.error(`ERROR: ${outPath} missing required keys.`);
          }
        } catch (e) {
          console.error(`ERROR: ${outPath} could not be validated:`, e.message);
        }
      } catch (e) {
        console.error(`ERROR processing ${subfolderName}:`, e.message);
      }
    }
  }
})();