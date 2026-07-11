import * as mupdf from "mupdf";

export type ParsedOrderItem = {
  id: string;
  articleNumber: string | null;
  description: string;
  bestNumber: string | null;
  quantity: number;
  unit: string | null;
  deliveredQuantity: number | null;
  price: number | null;
  lineTotal: number | null;
  checked: boolean;
  checkedBy: string | null;
  checkedAt: string | null;
  isFreight: boolean;
};

export type ParsedOrder = {
  orderNumber: string | null;
  customerName: string | null;
  phone: string | null;
  orderDate: string | null;
  seller: string | null;
  items: ParsedOrderItem[];
  rawText: string;
  parserVersion: string;
};

const PARSER_VERSION = "obsbygg-mupdf-v5";

function clean(value?: string | null): string {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDecimal(value?: string | null): number | null {
  const normalized = clean(value)
    .replace(/\./g, "")
    .replace(",", ".");

  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeCustomerName(value?: string | null): string | null {
  const customer = clean(value).replace(/^\d+\s+/, "");
  if (!customer) return null;

  if (customer.includes(",")) {
    const [lastName, firstName] = customer.split(",", 2).map(clean);
    if (lastName && firstName) return `${firstName} ${lastName}`;
  }

  return customer;
}

function extractText(buffer: Buffer): string {
  const document = mupdf.PDFDocument.openDocument(
    new Uint8Array(buffer),
    "application/pdf"
  );

  try {
    const pages: string[] = [];

    for (let index = 0; index < document.countPages(); index++) {
      const page = document.loadPage(index);

      try {
        const text = page.toStructuredText("preserve-whitespace").asText();
        pages.push(text);
      } finally {
        page.destroy();
      }
    }

    return pages.join("\n");
  } finally {
    document.destroy();
  }
}

function normalizeLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map(clean)
    .filter(Boolean);
}

function extractOrderNumber(text: string): string | null {
  return (
    text.match(/\bKundeordre\s*[:#-]?\s*(\d+)\b/i)?.[1] ??
    text.match(/\bOrdre(?:nummer|nr\.?)\s*[:#-]?\s*(\d+)\b/i)?.[1] ??
    null
  );
}

function extractCustomerName(lines: string[], text: string): string | null {
  for (const line of lines) {
    const match = line.match(/\bKunde:\s*(\d+\s+.+)$/i);
    if (match?.[1]) return normalizeCustomerName(match[1]);
  }

  return normalizeCustomerName(
    text.match(/\bKunde:\s*(\d+\s+[^\r\n]+)/i)?.[1] ?? null
  );
}

function extractPhone(lines: string[], text: string): string | null {
  const source =
    lines.find((line) => /\bMobiltelefon:/i.test(line)) ??
    text.match(/\bMobiltelefon:\s*([^\r\n]+)/i)?.[0] ??
    "";

  const raw = clean(source.replace(/^.*?Mobiltelefon:\s*/i, ""));

  if (!raw || /telefonnummer|mangler|ikke registrert/i.test(raw)) {
    return null;
  }

  const phone = raw.replace(/[^\d+]/g, "");
  return phone.length >= 6 ? phone : null;
}

function extractOrderDate(text: string): string | null {
  return (
    text.match(
      /\bOrdredato:\s*([0-9]{1,2}[.\-/][0-9]{1,2}[.\-/][0-9]{2,4})/i
    )?.[1] ?? null
  );
}

function extractSeller(lines: string[], text: string): string | null {
  const line = lines.find((value) => /^Selger:/i.test(value));

  if (line) {
    return clean(line.replace(/^Selger:\s*/i, "")) || null;
  }

  return clean(text.match(/\bSelger:\s*([^\r\n]+)/i)?.[1]) || null;
}

function createItem(
  values: {
    articleNumber: string;
    description: string;
    bestNumber: string;
    quantity: string;
    unit: string;
    deliveredQuantity: string;
    price: string;
    lineTotal: string;
  },
  index: number
): ParsedOrderItem {
  const description = clean(values.description);
  const isFreight = /frakt/i.test(description);

  return {
    id: `${values.articleNumber}-${index + 1}`,
    articleNumber: values.articleNumber,
    description,
    bestNumber: values.bestNumber,
    quantity: parseDecimal(values.quantity) ?? 1,
    unit: clean(values.unit) || null,
    deliveredQuantity: parseDecimal(values.deliveredQuantity),
    price: parseDecimal(values.price),
    lineTotal: parseDecimal(values.lineTotal),
    checked: isFreight,
    checkedBy: isFreight ? "SYSTEM" : null,
    checkedAt: isFreight ? new Date().toISOString() : null,
    isFreight
  };
}

function parseRow(line: string, index: number): ParsedOrderItem | null {
  const pattern =
    /^(\d{6,14})\s+(.+?)\s+(\d{5,10})\s+(?:(?:\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4})\s+)?(\d+(?:[.,]\d+)?)\s+(Stk|M|LM|Pk|Pak|Sett|Eske|Par)\s+(\d+(?:[.,]\d+)?)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)$/i;

  const match = clean(line).match(pattern);
  if (!match) return null;

  return createItem(
    {
      articleNumber: match[1],
      description: match[2],
      bestNumber: match[3],
      quantity: match[4],
      unit: match[5],
      deliveredQuantity: match[6],
      price: match[7],
      lineTotal: match[9]
    },
    index
  );
}

function parseRows(lines: string[]): ParsedOrderItem[] {
  const headerIndex = lines.findIndex(
    (line) =>
      /EAN\/PLU/i.test(line) &&
      /Varetekst/i.test(line) &&
      /Bestnr/i.test(line)
  );

  const candidates = headerIndex >= 0 ? lines.slice(headerIndex + 1) : lines;
  const items: ParsedOrderItem[] = [];

  for (const line of candidates) {
    if (/^(SUM|TOTALSUM|TOTAL SUM)\b/i.test(line)) break;

    const item = parseRow(line, items.length);
    if (item) items.push(item);
  }

  return items;
}

function parseCollapsedRows(lines: string[]): ParsedOrderItem[] {
  const compact = clean(lines.join(" "));
  const start = compact.search(/\bEAN\/PLU\b/i);
  if (start < 0) return [];

  const endings = [
    compact.search(/\bTOTALSUM\b/i),
    compact.search(/\bTOTAL SUM\b/i),
    compact.search(/\bSUM\b/i)
  ].filter((value) => value > start);

  if (endings.length === 0) return [];

  const body = compact.slice(start, Math.min(...endings));
  const pattern =
    /(\d{6,14})\s+(.+?)\s+(\d{5,10})\s+(?:(?:\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4})\s+)?(\d+(?:[.,]\d+)?)\s+(Stk|M|LM|Pk|Pak|Sett|Eske|Par)\s+(\d+(?:[.,]\d+)?)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)/gi;

  const items: ParsedOrderItem[] = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(body)) !== null) {
    items.push(
      createItem(
        {
          articleNumber: match[1],
          description: match[2],
          bestNumber: match[3],
          quantity: match[4],
          unit: match[5],
          deliveredQuantity: match[6],
          price: match[7],
          lineTotal: match[9]
        },
        items.length
      )
    );
  }

  return items;
}

function deduplicate(items: ParsedOrderItem[]): ParsedOrderItem[] {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = [
      item.articleNumber,
      item.bestNumber,
      item.description,
      item.quantity,
      item.unit
    ].join("|");

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function parseOrderPdf(buffer: Buffer): Promise<ParsedOrder> {
  const extracted = extractText(buffer);
  const lines = normalizeLines(extracted);
  const rawText = lines.join("\n");

  const rowItems = parseRows(lines);
  const fallbackItems =
    rowItems.length > 0 ? [] : parseCollapsedRows(lines);

  return {
    orderNumber: extractOrderNumber(rawText),
    customerName: extractCustomerName(lines, rawText),
    phone: extractPhone(lines, rawText),
    orderDate: extractOrderDate(rawText),
    seller: extractSeller(lines, rawText),
    items: deduplicate([...rowItems, ...fallbackItems]),
    rawText,
    parserVersion: PARSER_VERSION
  };
}
