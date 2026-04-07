# Airtable → ShipStation Location Sync (update-only patch)

This patch removes product creation and only updates existing ShipStation products by SKU.

## What changed
- updates existing ShipStation products
- skips missing ShipStation products instead of crashing
- logs missing SKUs so they can be reviewed later

## Use case
Use this version until ShipStation confirms a supported automated product-creation path for your account/API.
