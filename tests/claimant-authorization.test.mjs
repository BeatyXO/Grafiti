import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const contractPath = new URL("../contracts/grafiti.py", import.meta.url);

async function contractSource() {
  return readFile(contractPath, "utf8");
}

function methodBody(source, methodName, nextMethodName) {
  const start = source.indexOf(`    def ${methodName}(`);
  const end = source.indexOf(`    def ${nextMethodName}(`, start);
  assert.notEqual(start, -1, `${methodName} must exist`);
  assert.notEqual(end, -1, `${nextMethodName} must exist after ${methodName}`);
  return source.slice(start, end);
}

test("a non-claimant cannot add evidence to a claimant's review packet", async () => {
  const source = await contractSource();
  const addEvidence = methodBody(source, "add_evidence", "request_review");

  assert.match(
    addEvidence,
    /claim = self\._load\(raw_claim\)[\s\S]*self\._require_claimant\(claim\)[\s\S]*entries\.append/,
  );
  assert.match(
    source,
    /def _require_claimant\(self, claim: dict\)[\s\S]*self\._sender\(\) != str\(claim\.get\("owner", ""\)\)\.lower\(\)[\s\S]*Only the claimant can manage evidence or request review/,
  );
});

test("a non-claimant cannot request a review that changes the claimant's score", async () => {
  const source = await contractSource();
  const requestReview = methodBody(source, "request_review", "get_claim");

  const authorization = requestReview.indexOf("self._require_claimant(claim)");
  const scoreUpdate = requestReview.indexOf('rep["gravity_score"] = new_score');
  assert.notEqual(authorization, -1, "review must require the claimant");
  assert.notEqual(scoreUpdate, -1, "review must have a score update");
  assert.ok(
    authorization < scoreUpdate,
    "claimant authorization must happen before a score can change",
  );
});
