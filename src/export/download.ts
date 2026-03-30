export function downloadFile(content: Blob | string, filename: string, mimeType: string): void {
  let blob: Blob;

  if (typeof content === "string") {
    blob = new Blob([content], { type: mimeType });
  } else {
    blob = content;
  }

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

export function downloadCSV(content: string, filename: string): void {
  downloadFile("\ufeff" + content, filename, "text/csv;charset=utf-8;");
}

export function downloadXLSX(blob: Blob, filename: string): void {
  downloadFile(blob, filename, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}

export function downloadJSON(data: object, filename: string): void {
  const content = JSON.stringify(data, null, 2);
  downloadFile(content, filename, "application/json");
}
