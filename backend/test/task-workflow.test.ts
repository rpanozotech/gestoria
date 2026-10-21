import test from "node:test";
import assert from "node:assert/strict";
import { normalizeTaskStatus } from "../src/utils/task-workflow.ts";

test("normaliza los estados de trabajo visibles en las capturas", () => {
  assert.equal(normalizeTaskStatus("pendiente"), "pendiente");
  assert.equal(normalizeTaskStatus("en_espera_cliente"), "en_espera_cliente");
  assert.equal(normalizeTaskStatus("completada"), "completada");
  assert.equal(normalizeTaskStatus("revision"), "revision");
});

test("rechaza estados desconocidos y usa pendiente como estado seguro", () => {
  assert.equal(normalizeTaskStatus("estado-inventado"), "pendiente");
  assert.equal(normalizeTaskStatus(""), "pendiente");
  assert.equal(normalizeTaskStatus(undefined), "pendiente");
});
