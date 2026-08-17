const SHEET_ID_RE = /\/spreadsheets\/d\/(?:e\/)?([a-zA-Z0-9-_]+)/;

export function parseSheetUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new Error("Enter a valid URL.");
  }

  const host = url.hostname.toLowerCase();
  if (host !== "docs.google.com" && host !== "sheets.google.com") {
    throw new Error("URL must point to a Google Sheet.");
  }

  const match = url.pathname.match(SHEET_ID_RE);
  if (!match) {
    throw new Error("Could not find a spreadsheet ID in that URL.");
  }

  const published = url.pathname.includes("/spreadsheets/d/e/");
  let gid = "0";
  if (url.searchParams.has("gid")) {
    gid = url.searchParams.get("gid");
  } else {
    const hashMatch = url.hash.match(/gid=([0-9]+)/);
    if (hashMatch) {
      gid = hashMatch[1];
    }
  }

  return { id: match[1], gid, published };
}

export function csvExportUrl({ id, gid, published }) {
  if (published) {
    return `https://docs.google.com/spreadsheets/d/e/${id}/pub?output=csv&gid=${encodeURIComponent(gid)}`;
  }
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${encodeURIComponent(gid)}`;
}

export function parseCsv(text) {
  const source = text.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    const next = source[i + 1];

    if (inQuotes) {
      if (c === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cell += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (c !== "\r") {
      cell += c;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  while (rows.length > 0 && rows[rows.length - 1].every((value) => value === "")) {
    rows.pop();
  }

  return rows;
}

function looksLikeHtml(contentType, body) {
  return (
    (contentType && contentType.includes("text/html")) ||
    body.trimStart().startsWith("<")
  );
}

export async function readSheet(rawUrl) {
  const parsed = parseSheetUrl(rawUrl);
  const exportUrl = csvExportUrl(parsed);

  const response = await fetch(exportUrl, {
    headers: {
      Accept: "text/csv,text/plain;q=0.9,*/*;q=0.8",
      "User-Agent": "StationSheetReader/1.0",
    },
    redirect: "follow",
  });

  const body = await response.text();
  const contentType = response.headers.get("content-type") || "";

  if (!response.ok || looksLikeHtml(contentType, body)) {
    throw new Error(
      "Could not read that sheet. Share it as “Anyone with the link can view” and try again."
    );
  }

  const rows = parseCsv(body);
  if (rows.length === 0) {
    throw new Error("The sheet is empty.");
  }

  return { rows };
}
