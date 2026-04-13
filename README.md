# Airtable → ShipStation Location Sync (SKU-targeted upgrade)

This upgrade removes the huge full-catalog ShipStation scan.

## What changed
- looks up ShipStation products by SKU using the products list filter
- updates only the matching product
- skips missing ShipStation products instead of crashing

## Why it is faster
Instead of scanning thousands of ShipStation products every run, it only checks the SKUs coming from Airtable.
