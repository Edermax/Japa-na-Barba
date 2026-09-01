import test from "node:test";
import assert from "node:assert/strict";
import { inspectHtml } from "../scripts/audit-site-integrity.mjs";

test("auditoria semântica aceita documento íntegro", () => {
  const html = '<!doctype html><html lang="pt-BR"><head><meta name="viewport" content="width=device-width"><title>Teste</title></head><body><main><h1>Título</h1><img src="x.png" alt=""><button aria-label="Abrir"></button></main></body></html>';
  assert.deepEqual(inspectHtml(html, "https://example.test").failures, []);
});

test("auditoria semântica detecta falhas relevantes", () => {
  const html = '<html><head><title>Um</title><title>Dois</title></head><body><h1>A</h1><h1>B</h1><img src="x"><button></button><a target="_blank" href="/x">X</a><div id="a"></div><div id="a"></div></body></html>';
  const failures = inspectHtml(html, "https://example.test").failures.join(" ");
  for (const expected of ["Idioma", "Viewport", "Título", "Quantidade de H1", "main", "IDs duplicados", "imagem", "noopener", "botão"]) assert.match(failures, new RegExp(expected, "i"));
});
