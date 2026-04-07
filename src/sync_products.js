import { CFG, logger, fetchAllAirtableRecords, fetchAllShipStationProducts, normalizeSku, normalizeLocation, updateShipStationProduct } from "./lib.js";

function buildShipStationPayloadFromAirtable(fields) {
  const sku = normalizeSku(fields[CFG.airtable.skuField]);
  const name = String(fields[CFG.airtable.nameField] || sku || "Unnamed Product");
  const warehouseLocation = normalizeLocation(fields[CFG.airtable.locationField]);
  const price = Number(fields[CFG.airtable.priceField] ?? 0);
  const quantity = Number(fields[CFG.airtable.qtyField] ?? 0);

  return {
    sku,
    name,
    price,
    warehouseLocation,
    active: quantity > 0
  };
}

async function main() {
  const airtableRecords = await fetchAllAirtableRecords();
  const shipstationProducts = await fetchAllShipStationProducts();
  const shipstationBySku = new Map(
    shipstationProducts
      .filter(p => normalizeSku(p?.sku))
      .map(p => [normalizeSku(p.sku), p])
  );

  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let missing = 0;
  const missingSkus = [];

  for (const record of airtableRecords) {
    const fields = record.fields || {};
    const sku = normalizeSku(fields[CFG.airtable.skuField]);
    if (!sku) {
      skipped += 1;
      continue;
    }

    if (CFG.syncOnlyActive) {
      const listed = Boolean(fields[CFG.airtable.activeField]);
      const qty = Number(fields[CFG.airtable.qtyField] ?? 0);
      if (!listed && qty <= 0) {
        skipped += 1;
        continue;
      }
    }

    processed += 1;
    const existing = shipstationBySku.get(sku) || null;
    if (!existing) {
      missing += 1;
      missingSkus.push(sku);
      logger("warn", "ShipStation product missing; skipped create", { sku });
      continue;
    }

    const payload = buildShipStationPayloadFromAirtable(fields);
    await updateShipStationProduct(existing, payload);
    updated += 1;
    logger("info", "Updated ShipStation product from Airtable", {
      sku,
      warehouseLocation: payload.warehouseLocation,
      price: payload.price
    });
  }

  console.log(JSON.stringify({
    ok: true,
    airtableRecords: airtableRecords.length,
    shipstationProducts: shipstationProducts.length,
    processed,
    updated,
    skipped,
    missing,
    missingSkus
  }, null, 2));
}

main().catch(err => {
  logger("error", "sync-products failed", err.message);
  process.exit(1);
});
