'use strict';

const fs = require('fs');
const path = require('path');
const { mergeOpenApi } = require('./merge-openapi');

const spec = mergeOpenApi();
const specJson = JSON.stringify(spec);

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New API 文档</title>
</head>
<body>
  <script
    id="api-reference"
    type="application/json"
    data-configuration='{"theme":"default","layout":"modern","defaultHttpClient":{"targetKey":"shell","clientKey":"curl"}}'
  >${specJson}</script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>
`;

const outDir = path.join(__dirname, '..', 'docs');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}
const outFile = path.join(outDir, 'index.html');
fs.writeFileSync(outFile, html, 'utf-8');
console.log(`Written ${outFile}`);
