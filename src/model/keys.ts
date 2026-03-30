function encodePart(p: unknown): string {
  if (p === null) return "n";
  if (p === undefined) return "u";
  if (p instanceof Date) return `t:${p.toISOString()}`;
  switch (typeof p) {
    case "string":
      return `s:${encodeURIComponent(p)}`;
    case "number":
      return `d:${String(p)}`;
    case "boolean":
      return `b:${p ? "1" : "0"}`;
    default:
      return `o:${encodeURIComponent(String(p))}`;
  }
}

function decodePart(s: string): string {
  const idx = s.indexOf(":");
  if (idx === -1) return s;
  const type = s.slice(0, idx);
  const payload = s.slice(idx + 1);
  if (type === "s" || type === "o") return decodeURIComponent(payload);
  if (type === "t") return payload;
  if (type === "b") return payload === "1" ? "true" : "false";
  return payload;
}

export function generateRowKey(path: (string | number)[]): string {
  return `row:${path.map(encodePart).join("|")}`;
}

export function generateColumnKey(path: (string | number)[]): string {
  return `col:${path.map(encodePart).join("|")}`;
}

export function generateCellKey(rowKey: string, colKey: string, measureIndex: number): string {
  return `${rowKey}::${colKey}::m${measureIndex}`;
}

export function parseRowKey(key: string): string[] {
  if (!key.startsWith("row:")) return [];
  return key.slice(4).split("|").map(decodePart);
}

export function parseColumnKey(key: string): string[] {
  if (!key.startsWith("col:")) return [];
  return key.slice(4).split("|").map(decodePart);
}

export function getNodeDepth(key: string): number {
  const parts = key.includes("|") ? key.split("|") : [key];
  return parts.length - 1;
}

export function isDescendantOf(childKey: string, parentKey: string): boolean {
  return childKey.startsWith(parentKey + "|");
}

export function getParentKey(key: string): string | null {
  const lastPipe = key.lastIndexOf("|");
  if (lastPipe === -1) return null;
  return key.slice(0, lastPipe);
}
