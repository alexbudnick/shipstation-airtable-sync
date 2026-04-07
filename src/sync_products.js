import { CFG, logger, fetchAllAirtableRecords, fetchAllShipStationProducts, normalizeSku, normalizeLocation, upsertShipStationProductBySku } from "./lib.js";

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
    active: quantity > 0,
    productCategory: null,
    productType: null,
    warehouseLocationType: null
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
  let skipped = 0;
  let createdOrUpdated = 0;

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

    const payload = buildShipStationPayloadFromAirtable(fields);
    const existing = shipstationBySku.get(sku) || null;

    await upsertShipStationProductBySku(existing, payload);
    createdOrUpdated += 1;
    processed += 1;
    logger("info", existing ? "Updated ShipStation product from Airtable" : "Created ShipStation product from Airtable", {
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
    createdOrUpdated,
    skipped
  }, null, 2));
}

main().catch(err => {
  logger("error", "sync-products failed", err.message);
  process.exit(1);
});
