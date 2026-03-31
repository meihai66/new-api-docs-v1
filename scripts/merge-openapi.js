'use strict';

const fs = require('fs');
const path = require('path');

const OPENAPI_DIR = path.join(__dirname, '..', 'openapi', 'generated');

function scanJsonFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...scanJsonFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      results.push(full);
    }
  }
  return results;
}

function mergeOpenApi() {
  const files = scanJsonFiles(OPENAPI_DIR);

  const merged = {
    openapi: '3.1.0',
    info: {
      title: 'New API',
      version: '1.0.0',
      description: 'New API 完整接口文档，包含 AI 模型接口和管理后台接口。',
    },
    tags: [],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: '使用 Bearer Token 认证。格式: Authorization: Bearer sk-xxxxxx',
        },
      },
    },
    paths: {},
  };

  const tagSet = new Set();

  for (const file of files) {
    let spec;
    try {
      spec = JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch (e) {
      console.warn(`Warning: failed to parse ${file}: ${e.message}`);
      continue;
    }

    // Collect tags
    if (Array.isArray(spec.tags)) {
      for (const tag of spec.tags) {
        const key = tag.name;
        if (!tagSet.has(key)) {
          tagSet.add(key);
          merged.tags.push(tag);
        }
      }
    }

    // Merge paths
    if (spec.paths) {
      for (const [urlPath, pathItem] of Object.entries(spec.paths)) {
        if (!merged.paths[urlPath]) {
          merged.paths[urlPath] = {};
        }
        for (const [method, operation] of Object.entries(pathItem)) {
          merged.paths[urlPath][method] = operation;
        }
      }
    }
  }

  return merged;
}

module.exports = { mergeOpenApi };

// When run directly, write docs/openapi.json for debugging
if (require.main === module) {
  const spec = mergeOpenApi();
  const outDir = path.join(__dirname, '..', 'docs');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const outFile = path.join(outDir, 'openapi.json');
  fs.writeFileSync(outFile, JSON.stringify(spec, null, 2), 'utf-8');
  console.log(`Written ${outFile}`);
}
