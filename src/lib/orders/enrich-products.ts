import { uploadPrivateBlob, type StoredBlob } from "@/lib/blob-storage";
import type { ParsedOrderItem } from "@/lib/orders/parse-order-pdf";

type ExistingItem = ParsedOrderItem & {
  productName?: string | null;
  productUrl?: string | null;
  productImageBlob?: StoredBlob | null;
  productLookupStatus?: string | null;
  productLookupAt?: string | null;
};

export type EnrichedOrderItem = ParsedOrderItem & {
  productName: string | null;
  productUrl: string | null;
  productImageBlob: StoredBlob | null;
  productLookupStatus: "FOUND" | "NOT_FOUND" | "ERROR" | "SKIPPED";
  productLookupAt: string;
};

type ProductInfo = {
  name: string;
  productUrl: string;
  imageUrl: string | null;
};

const REQUEST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; Hjemleveringordre/1.3; +https://jobbverktoy.no)",
  Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
  "Accept-Language": "nb-NO,nb;q=0.9,no;q=0.8,en;q=0.6"
};

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\\u002F/g, "/")
    .replace(/\\u0026/g, "&")
    .replace(/\\u003A/g, ":")
    .trim();
}

function stripTags(value: string): string {
  return decodeHtml(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
}

function absoluteUrl(value: string, base: string): string | null {
  try {
    const url = new URL(decodeHtml(value), base);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function imageFromJson(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = imageFromJson(item);
      if (found) return found;
    }
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      imageFromJson(record.url) ??
      imageFromJson(record.contentUrl) ??
      imageFromJson(record.image)
    );
  }
  return null;
}

function findProductJson(value: unknown, ean: string): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;

  if (Array.isArray(value)) {
    for (const child of value) {
      const match = findProductJson(child, ean);
      if (match) return match;
    }
    return null;
  }

  const record = value as Record<string, unknown>;
  const type = record["@type"];
  const types = Array.isArray(type) ? type.map(String) : [String(type ?? "")];
  const serialized = JSON.stringify(record);

  if (types.some((entry) => entry.toLowerCase() === "product") && serialized.includes(ean)) {
    return record;
  }

  for (const child of Object.values(record)) {
    const match = findProductJson(child, ean);
    if (match) return match;
  }

  return null;
}

function metaContent(html: string, property: string): string | null {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`,
      "i"
    )
  ];

  for (const pattern of patterns) {
    const value = html.match(pattern)?.[1];
    if (value) return decodeHtml(value);
  }

  return null;
}

function parseProductPage(html: string, pageUrl: string, ean: string): ProductInfo | null {
  if (!html.includes(ean)) return null;

  const scripts = [...html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )];

  for (const script of scripts) {
    try {
      const json = JSON.parse(script[1].trim()) as unknown;
      const product = findProductJson(json, ean);
      if (!product) continue;

      const name = String(product.name ?? "").trim();
      const image = imageFromJson(product.image);
      const url = absoluteUrl(String(product.url ?? pageUrl), pageUrl) ?? pageUrl;

      if (name) {
        return {
          name,
          productUrl: url,
          imageUrl: image ? absoluteUrl(image, pageUrl) : null
        };
      }
    } catch {
      // Continue with OpenGraph and HTML fallbacks.
    }
  }

  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const title =
    metaContent(html, "og:title") ??
    (h1 ? stripTags(h1) : null) ??
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ??
    null;

  if (!title) return null;

  const canonical =
    html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] ??
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i)?.[1] ??
    pageUrl;

  const image =
    metaContent(html, "og:image") ??
    metaContent(html, "twitter:image") ??
    null;

  return {
    name: stripTags(title).replace(/\s*\|\s*Obsbygg\.no.*$/i, "").trim(),
    productUrl: absoluteUrl(canonical, pageUrl) ?? pageUrl,
    imageUrl: image ? absoluteUrl(image, pageUrl) : null
  };
}

function candidateLinks(html: string, baseUrl: string, ean: string): string[] {
  const normalized = html
    .replace(/\\u002F/g, "/")
    .replace(/\\u003A/g, ":")
    .replace(/\\u0026/g, "&");

  const candidates: Array<{ url: string; score: number }> = [];

  for (const match of normalized.matchAll(/(?:href=|["']url["']\s*:\s*)["']([^"'#]+)["']/gi)) {
    const raw = match[1];
    const url = absoluteUrl(raw, baseUrl);
    if (!url) continue;

    const parsed = new URL(url);
    if (parsed.hostname !== "www.obsbygg.no" && parsed.hostname !== "obsbygg.no") continue;
    if (/\/(?:sok|search)(?:\/|\?|$)/i.test(parsed.pathname)) continue;
    if (/\.(?:js|css|svg|png|jpe?g|webp|woff2?)(?:\?|$)/i.test(parsed.pathname)) continue;

    const position = match.index ?? 0;
    const context = normalized.slice(Math.max(0, position - 800), position + 1000);
    const numericProductPath = /\/\d{6,10}(?:\/)?$/.test(parsed.pathname);
    const score = (context.includes(ean) ? 100 : 0) + (numericProductPath ? 20 : 0);

    if (score > 0) candidates.push({ url, score });
  }

  return [...new Map(
    candidates
      .sort((a, b) => b.score - a.score)
      .map((candidate) => [candidate.url, candidate])
  ).values()]
    .slice(0, 8)
    .map((candidate) => candidate.url);
}

async function fetchText(url: string, timeoutMs = 8000): Promise<{
  html: string;
  finalUrl: string;
}> {
  const response = await fetch(url, {
    headers: REQUEST_HEADERS,
    redirect: "follow",
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs)
  });

  if (!response.ok) {
    throw new Error(`Obsbygg svarte med HTTP ${response.status}.`);
  }

  return {
    html: await response.text(),
    finalUrl: response.url || url
  };
}

async function lookupProduct(ean: string): Promise<ProductInfo | null> {
  const searchUrls = [
    `https://www.obsbygg.no/sok?q=${encodeURIComponent(ean)}`,
    `https://www.obsbygg.no/sok?query=${encodeURIComponent(ean)}`,
    `https://www.obsbygg.no/search?q=${encodeURIComponent(ean)}`
  ];

  const visited = new Set<string>();

  for (const searchUrl of searchUrls) {
    try {
      const search = await fetchText(searchUrl);
      visited.add(search.finalUrl);

      const direct = parseProductPage(search.html, search.finalUrl, ean);
      if (
        direct &&
        !/\/(?:sok|search)(?:\/|\?|$)/i.test(new URL(direct.productUrl).pathname)
      ) {
        return direct;
      }

      const links = candidateLinks(search.html, search.finalUrl, ean);

      for (const link of links) {
        if (visited.has(link)) continue;
        visited.add(link);

        try {
          const page = await fetchText(link);
          const product = parseProductPage(page.html, page.finalUrl, ean);
          if (product) return product;
        } catch {
          // A single product candidate must never stop the order import.
        }
      }
    } catch {
      // Try the next known search URL.
    }
  }

  return null;
}

function extensionFromContentType(contentType: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  if (contentType.includes("avif")) return "avif";
  return "jpg";
}

async function copyProductImage(input: {
  imageUrl: string;
  productUrl: string;
  orderId: string;
  ean: string;
}): Promise<StoredBlob | null> {
  const response = await fetch(input.imageUrl, {
    headers: {
      ...REQUEST_HEADERS,
      Accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8",
      Referer: input.productUrl
    },
    redirect: "follow",
    cache: "no-store",
    signal: AbortSignal.timeout(10000)
  });

  if (!response.ok) return null;

  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  if (!contentType.startsWith("image/")) return null;

  const bytes = await response.arrayBuffer();
  if (bytes.byteLength === 0 || bytes.byteLength > 10 * 1024 * 1024) return null;

  const extension = extensionFromContentType(contentType);

  return uploadPrivateBlob({
    pathnamePrefix: `orders/${input.orderId}/products/${input.ean}`,
    filename: `product.${extension}`,
    body: bytes,
    contentType
  });
}

async function enrichOne(
  item: ParsedOrderItem,
  orderId: string,
  existing?: ExistingItem
): Promise<EnrichedOrderItem> {
  const lookupAt = new Date().toISOString();
  const ean = item.articleNumber?.trim();

  if (!ean || item.isFreight) {
    return {
      ...item,
      productName: existing?.productName ?? null,
      productUrl: existing?.productUrl ?? null,
      productImageBlob: existing?.productImageBlob ?? null,
      productLookupStatus: "SKIPPED",
      productLookupAt: lookupAt
    };
  }

  try {
    const product = await lookupProduct(ean);

    if (!product) {
      return {
        ...item,
        productName: existing?.productName ?? null,
        productUrl: existing?.productUrl ?? null,
        productImageBlob: existing?.productImageBlob ?? null,
        productLookupStatus: "NOT_FOUND",
        productLookupAt: lookupAt
      };
    }

    let productImageBlob: StoredBlob | null = null;

    if (product.imageUrl) {
      try {
        productImageBlob = await copyProductImage({
          imageUrl: product.imageUrl,
          productUrl: product.productUrl,
          orderId,
          ean
        });
      } catch {
        productImageBlob = null;
      }
    }

    return {
      ...item,
      productName: product.name,
      productUrl: product.productUrl,
      productImageBlob: productImageBlob ?? existing?.productImageBlob ?? null,
      productLookupStatus: "FOUND",
      productLookupAt: lookupAt
    };
  } catch {
    return {
      ...item,
      productName: existing?.productName ?? null,
      productUrl: existing?.productUrl ?? null,
      productImageBlob: existing?.productImageBlob ?? null,
      productLookupStatus: "ERROR",
      productLookupAt: lookupAt
    };
  }
}

export async function enrichOrderItems(
  items: ParsedOrderItem[],
  orderId: string,
  existingItems: ExistingItem[] = []
): Promise<EnrichedOrderItem[]> {
  const existingByEan = new Map(
    existingItems
      .filter((item) => item.articleNumber)
      .map((item) => [String(item.articleNumber), item])
  );

  const result: EnrichedOrderItem[] = [];

  // Small batches avoid hammering Obsbygg.no and keep the Vercel function stable.
  for (let index = 0; index < items.length; index += 3) {
    const batch = items.slice(index, index + 3);
    const enriched = await Promise.all(
      batch.map((item) =>
        enrichOne(
          item,
          orderId,
          item.articleNumber
            ? existingByEan.get(String(item.articleNumber))
            : undefined
        )
      )
    );
    result.push(...enriched);
  }

  return result;
}
