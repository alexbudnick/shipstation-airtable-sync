import dotenv from "dotenv";
import { log } from "./common.js";

dotenv.config();

export const CFG = {
  logLevel: process.env.LOG_LEVEL || "info",
  dryRun: String(process.env.DRY_RUN || "false").toLowerCase() === "true",
  syncOnlyActive: String(process.env.SYNC_ONLY_ACTIVE || "true").toLowerCase() === "true",
  triggerSecret: process.env.SYNC_TRIGGER_SECRET || "",
  airtable: {
    pat: process.env.AIRTABLE_PAT || "",
    baseId: process.env.AIRTABLE_BASE_ID || "",
    tableName: process.env.AIRTABLE_TABLE_NAME || "Inventory",
    skuField: process.env.AIRTABLE_SKU_FIELD || "SKU",
    nameField: process.env.AIRTABLE_NAME_FIELD || "Title",
    locationField: process.env.AIRTABLE_LOCATION_FIELD || "Location",
    priceField: process.env.AIRTABLE_PRICE_FIELD || "Price",
    qtyField: process.env.AIRTABLE_QTY_FIELD || "Qty On Hand",
    activeField: process.env.AIRTABLE_ACTIVE_FILTER_FIELD || "Listed",
  },
  shipstation: {
    apiBase: process.env.SHIPSTATION_API_BASE || "https://ssapi.shipstation.com",
    apiKey: process.env.SHIPSTATION_API_KEY || "",
    apiSecret: process.env.SHIPSTATION_API_SECRET || "",
  }
};

export function logger(level, msg, meta) {
  return log(level, CFG.logLevel, msg, meta);
}

export async function airtableRequest(path = "", options = {}) {
  const url = `https://api.airtable.com/v0/${CFG.airtable.baseId}/${encodeURIComponent(CFG.airtable.tableName)}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Authorization": `Bearer ${CFG.airtable.pat}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  if (!res.ok) throw new Error(`Airtable request failed ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function fetchAllAirtableRecords() {
  let offset = null;
  const records = [];
  while (true) {
    const query = new URLSearchParams();
    query.set("pageSize", "100");
    if (offset) query.set("offset", offset);
    const data = await airtableRequest(`?${query.toString()}`);
    records.push(...(data.records || []));
    if (!data.offset) break;
    offset = data.offset;
  }
  return records;
}

function basicAuthHeader(key, secret) {
  return "Basic " + Buffer.from(`${key}:${secret}`).toString("base64");
}

export async function shipstationRequest(path = "", options = {}) {
  const url = `${CFG.shipstation.apiBase}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Authorization": basicAuthHeader(CFG.shipstation.apiKey, CFG.shipstation.apiSecret),
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  if (!res.ok) throw new Error(`ShipStation request failed ${res.status}: ${await res.text()}`);
  return res.json();
}

export function normalizeSku(value) {
  return String(value || "").trim();
}

export function normalizeLocation(value) {
  return String(value || "").trim();
}

export async function findShipStationProductBySku(sku) {
  const params = new URLSearchParams({ sku: normalizeSku(sku), page: "1", pageSize: "100" });
  const data = await shipstationRequest(`/products?${params.toString()}`);
  const products = Array.isArray(data?.products) ? data.products : [];
  return products.find(p => normalizeSku(p?.sku) === normalizeSku(sku)) || null;
}

export async function updateShipStationProduct(existingProduct, payload) {
  if (CFG.dryRun) {
    logger("info", "DRY_RUN would update ShipStation product", payload);
    return { dryRun: true };
  }
  const merged = { ...existingProduct, ...payload, productId: existingProduct.productId };
  return shipstationRequest(`/products/${existingProduct.productId}`, {
    method: "PUT",
    body: JSON.stringify(merged)
  });
}
