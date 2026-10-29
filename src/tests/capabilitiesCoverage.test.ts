/**
 * Power BI only stores properties declared in capabilities.json; anything else the visual writes is
 * dropped when the report is saved or reloaded, so the edit appears to work and then disappears.
 * Every setting the visual reads from the host must therefore be declared, with a matching type.
 */
import * as fs from "fs";
import * as path from "path";

const root = path.resolve(__dirname, "../..");
// Test-only reads of two fixed files in this repository.
// eslint-disable-next-line powerbi-visuals/non-literal-fs-path
const capabilitiesText = fs.readFileSync(path.join(root, "capabilities.json"), "utf8");
const capabilities = JSON.parse(capabilitiesText).objects as Record<
  string,
  { properties?: Record<string, { type?: Record<string, unknown> }> }
>;
// eslint-disable-next-line powerbi-visuals/non-literal-fs-path
const settingsSource = fs.readFileSync(path.join(root, "src/settings/settings.ts"), "utf8");

const reads = Array.from(settingsSource.matchAll(/get(Value|Color)\(objects,\s*"([a-zA-Z]+)",\s*"([a-zA-Z0-9]+)"/g)).map(m => ({
  kind: m[1] as "Value" | "Color",
  object: m[2],
  property: m[3],
}));

describe("capabilities.json covers every setting the visual reads", () => {
  it("finds the settings to check", () => {
    expect(reads.length).toBeGreaterThan(100);
  });

  it("declares every object and property read from the host", () => {
    const missing = reads
      .filter(r => !capabilities[r.object]?.properties?.[r.property])
      .map(r => `${r.object}.${r.property}`);
    expect(missing).toEqual([]);
  });

  it("declares colour settings as fills, and everything else as a non-fill", () => {
    const wrong = reads
      .filter(r => capabilities[r.object]?.properties?.[r.property])
      .filter(r => {
        const isFill = !!capabilities[r.object].properties![r.property].type?.fill;
        return r.kind === "Color" ? !isFill : isFill;
      })
      .map(r => `${r.object}.${r.property}`);
    expect(wrong).toEqual([]);
  });
});
