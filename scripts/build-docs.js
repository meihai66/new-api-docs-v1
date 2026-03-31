#!/usr/bin/env node
// scripts/build-docs.js
// Merges all OpenAPI JSON files from openapi/generated/ and generates docs/index.html

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const GENERATED_DIR = path.join(REPO_ROOT, 'openapi', 'generated');
const OUTPUT_FILE = path.join(REPO_ROOT, 'docs', 'index.html');

/** Recursively collect all .json files under a directory */
function collectJsonFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectJsonFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      results.push(fullPath);
    }
  }
  return results;
}

/** Merge all OpenAPI specs into one */
function mergeSpecs(files) {
  const mergedPaths = {};
  const tagMap = new Map(); // name -> tag object
  const securitySchemes = {};

  for (const file of files) {
    let spec;
    try {
      spec = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
      console.warn(`Warning: failed to parse ${file}: ${e.message}`);
      continue;
    }

    // Merge paths (first occurrence wins for path+method conflicts)
    if (spec.paths) {
      for (const [pathKey, pathItem] of Object.entries(spec.paths)) {
        if (!mergedPaths[pathKey]) {
          mergedPaths[pathKey] = {};
        }
        for (const [method, operation] of Object.entries(pathItem)) {
          if (!mergedPaths[pathKey][method]) {
            mergedPaths[pathKey][method] = operation;
          }
        }
      }
    }

    // Merge tags (deduplicate by name)
    if (Array.isArray(spec.tags)) {
      for (const tag of spec.tags) {
        if (tag.name && !tagMap.has(tag.name)) {
          tagMap.set(tag.name, tag);
        }
      }
    }

    // Merge securitySchemes
    if (spec.components && spec.components.securitySchemes) {
      for (const [name, scheme] of Object.entries(spec.components.securitySchemes)) {
        if (!securitySchemes[name]) {
          securitySchemes[name] = scheme;
        }
      }
    }
  }

  const merged = {
    openapi: '3.1.0',
    info: {
      title: 'New API 文档',
      version: '1.0.0',
      description: 'New API 完整接口文档，包含 AI 模型接口和管理接口。',
    },
    tags: Array.from(tagMap.values()),
    paths: mergedPaths,
    components: {
      securitySchemes,
    },
  };

  return merged;
}

/** Generate the HTML file with the inline spec */
function generateHtml(spec) {
  const specJson = JSON.stringify(spec, null, 2);
  return `<!doctype html>
<html>
  <head>
    <title>New API 文档</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <script id="api-reference" type="application/json">
    ${specJson}
    </script>
    <script>
      document.getElementById('api-reference').dataset.configuration = JSON.stringify({
        theme: 'default',
        layout: 'sidebar',
        defaultHttpClient: { targetKey: 'javascript', clientKey: 'fetch' }
      })
    </script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>
`;
}

// Main
const jsonFiles = collectJsonFiles(GENERATED_DIR);
console.log(`Found ${jsonFiles.length} JSON files`);

const merged = mergeSpecs(jsonFiles);

const pathCount = Object.keys(merged.paths).length;
const tagCount = merged.tags.length;
const schemeCount = Object.keys(merged.components.securitySchemes).length;
console.log(`Merged: ${pathCount} paths, ${tagCount} tags, ${schemeCount} security schemes`);

const html = generateHtml(merged);

fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
fs.writeFileSync(OUTPUT_FILE, html, 'utf8');
console.log(`Generated: ${OUTPUT_FILE}`);
