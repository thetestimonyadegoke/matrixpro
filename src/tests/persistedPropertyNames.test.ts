import * as fs from "fs";
import * as path from "path";

/**
 * Power BI silently drops any property that capabilities.json doesn't declare, so a typo in a
 * literal onPersistProperty("object", "property", …) call means the setting never saves.
 */
describe("literal onPersistProperty calls write declared properties", () => {
  const capabilities = JSON.parse(fs.readFileSync(path.join(__dirname, "../../capabilities.json"), "utf8"));
  const declared = (object: string): Set<string> => new Set(Object.keys(capabilities.objects?.[object]?.properties ?? {}));

  const uiDir = path.join(__dirname, "../ui");
  const files = fs.readdirSync(uiDir).filter(f => f.endsWith(".tsx") || f.endsWith(".ts"));
  const callPattern = /onPersistProperty\(\s*"(\w+)"\s*,\s*"(\w+)"/g;

  it("has no undeclared object or property names", () => {
    const missing: string[] = [];
    for (const file of files) {
      const source = fs.readFileSync(path.join(uiDir, file), "utf8");
      let match: RegExpExecArray | null;
      while ((match = callPattern.exec(source)) !== null) {
        const [, object, property] = match;
        if (!declared(object).has(property)) missing.push(`${file}: ${object}.${property}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
