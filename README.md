# Airtable → ShipStation Location Sync

This app syncs Airtable product location data into ShipStation's product catalog.

## What it does
- reads Airtable inventory rows
- matches ShipStation products by SKU
- creates missing products in ShipStation
- updates ShipStation product `warehouseLocation`
- also updates basic name and price

## Why this works
ShipStation's product model includes `warehouseLocation`, and ShipStation's product update operation requires the full resource body rather than a partial update. See official docs:
- Product model includes `warehouseLocation`
- Update Product does not support partial updates

## Suggested use
Run hourly as a Railway cron service:
- Start Command: `npm run sync-products`

## Required Airtable fields
- SKU
- Title
- Location
- Price
- Qty On Hand
- Listed
