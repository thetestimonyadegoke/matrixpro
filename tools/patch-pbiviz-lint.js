const fs = require("fs");
const path = require("path");

function patchFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`pbiviz lint patch: file not found: ${filePath}`);
    process.exitCode = 1;
    return;
  }

  const original = fs.readFileSync(filePath, "utf8");
  let next = original;

  // Fix 1: ESLint option overrideConfigFile must be a string or null (pbiviz ships invalid boolean true)
  next = next.replace(/overrideConfigFile:\s*true/g, "overrideConfigFile: null");

  // Fix 2: Convert flat config (eslint v9 style) from eslint-plugin-powerbi-visuals into legacy ESLint overrideConfig.
  // Stock pbiviz sets overrideConfig: powerbiPlugin.configs.recommended which contains top-level `files`,
  // which ESLint (legacy config) rejects.
  if (next.includes("overrideConfig: powerbiPlugin.configs.recommended")) {
    next = next.replace(
      /ConsoleWriter\.warning\("Using recommended eslint config\."\);\s*\n\s*this\.config\s*=\s*\{\s*\n\s*overrideConfig:\s*powerbiPlugin\.configs\.recommended,\s*\n\s*overrideConfigFile:\s*(true|null),\s*\n\s*fix:\s*this\.shouldFix,\s*\n\s*\};/m,
      [
        'ConsoleWriter.warning("Using recommended eslint config.");',
        "const flatConfig = powerbiPlugin.configs.recommended;",
        "const languageOptions = flatConfig?.languageOptions ?? {};",
        "const parserModule = languageOptions?.parser;",
        'const parserName = parserModule && parserModule.name ? parserModule.name : "@typescript-eslint/parser";',
        "this.config = {",
        "    overrideConfig: {",
        '        plugins: ["powerbi-visuals"],',
        "        globals: languageOptions?.globals ?? {},",
        "        parser: parserName,",
        "        parserOptions: {",
        '            sourceType: languageOptions?.sourceType ?? "module",',
        "            ecmaVersion: 2020,",
        "            ecmaFeatures: {",
        "                jsx: true",
        "            }",
        "        },",
        "        overrides: [",
        "            {",
        '                files: flatConfig?.files ?? ["**/*.{js,jsx,ts,tsx}"],',
        "                rules: flatConfig?.rules ?? {}",
        "            }",
        "        ]",
        "    },",
        "    overrideConfigFile: null,",
        "    fix: this.shouldFix,",
        "};",
      ].join("\n")
    );
  }

  if (next === original) {
    console.log("pbiviz lint patch: already applied");
    return;
  }

  fs.writeFileSync(filePath, next, "utf8");
  console.log("pbiviz lint patch: applied");
}

const target = path.join(
  __dirname,
  "..",
  "node_modules",
  "powerbi-visuals-tools",
  "lib",
  "LintValidator.js"
);

patchFile(target);
