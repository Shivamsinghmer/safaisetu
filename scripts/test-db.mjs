// Runs the pgTAP tests in supabase/tests/database against the linked (hosted) Supabase
// project, without Docker.
//
// `supabase test db --linked` still needs Docker (it runs pg_prove in a container), so this
// sends each test file through `supabase db query --linked` instead. That returns only the
// last result set, so every assertion is rewritten to store its TAP line in a temp table that
// is read back at the end. Each file runs in one transaction and ends in ROLLBACK: nothing is
// left in the database.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = "supabase/tests/database";
const files = readdirSync(dir).filter((f) => f.endsWith(".test.sql")).sort();
const tmp = mkdtempSync(join(tmpdir(), "safaisetu-tap-"));
let failed = 0;

for (const file of files) {
  let sql = readFileSync(join(dir, file), "utf8");

  // A results table every role used in the tests (postgres, authenticated, anon) can write to
  sql = sql.replace(
    /^begin;\s*$/m,
    `begin;
create temp table tap_out (line text, at timestamptz not null default clock_timestamp());
grant insert, select on pg_temp.tap_out to public;`,
  );
  // Capture each assertion's TAP output
  sql = sql.replace(
    /^select (plan|is|isnt|ok|throws_ok|lives_ok|results_eq|set_eq|bag_eq|has_table|has_column|policies_are)\(/gm,
    (_, fn) => `insert into pg_temp.tap_out (line) select ${fn}(`,
  );
  sql = sql.replace(
    /^select \* from finish\(\);\s*$/m,
    "insert into pg_temp.tap_out (line) select * from finish();\nselect line from pg_temp.tap_out order by at;",
  );

  const path = join(tmp, file);
  writeFileSync(path, sql);
  let out;
  try {
    out = execFileSync("npx", ["supabase", "db", "query", "--linked", "-f", path], {
      encoding: "utf8",
      shell: process.platform === "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (e) {
    console.error(`✗ ${file}: query failed\n${e.stdout ?? ""}${e.stderr ?? ""}`);
    failed++;
    continue;
  }

  const json = JSON.parse(out.slice(out.indexOf("{")));
  if (json.error || !Array.isArray(json.rows)) {
    console.error(`✗ ${file}:`, json.error ?? json);
    failed++;
    continue;
  }
  const lines = json.rows.flatMap((r) => String(r.line).split("\n"));
  console.log(`# ${file}`);
  for (const l of lines) console.log(l);
  const bad = lines.filter((l) => /^not ok/.test(l) || /^# Looks like/.test(l));
  if (bad.length) failed++;
}

console.log(failed ? `\nFAIL (${failed} file${failed === 1 ? "" : "s"})` : "\nPASS");
process.exit(failed ? 1 : 0);
