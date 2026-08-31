import test from "node:test";
import assert from "node:assert/strict";
import { evaluateMetrics, normalizeResult } from "../scripts/monitor-production.mjs";

const healthy = {
  server_errors: 0,
  rate_limited: 0,
  auth_failures: 0,
  latency_p95_ms: 250,
  latency_samples: 50
};

test("monitor aceita uma janela saudável", () => {
  assert.deepEqual(evaluateMetrics(healthy), []);
});

test("monitor sinaliza todos os limites operacionais", () => {
  const failures = evaluateMetrics({
    server_errors: 1,
    rate_limited: 5,
    auth_failures: 5,
    latency_p95_ms: 1600,
    latency_samples: 20
  });
  assert.equal(failures.length, 4);
});

test("p95 não alerta quando a amostra é insuficiente", () => {
  assert.deepEqual(evaluateMetrics({ ...healthy, latency_p95_ms: 9000, latency_samples: 19 }), []);
});

test("normaliza números retornados como texto pela API", () => {
  assert.deepEqual(normalizeResult({ result: [{
    server_errors: "0",
    rate_limited: "1",
    auth_failures: "2",
    latency_p95_ms: "321.5",
    latency_samples: "40"
  }] }), {
    server_errors: 0,
    rate_limited: 1,
    auth_failures: 2,
    latency_p95_ms: 321.5,
    latency_samples: 40
  });
});
