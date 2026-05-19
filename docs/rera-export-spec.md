# RERA quarterly export — shape

`GET /api/reports/rera?siteId=<uuid>&year=<YYYY>&quarter=<1..4>`

Returns JSON suitable for filing under the **Real Estate (Regulation and Development) Act, 2016** quarterly progress requirements. The state RERA portals each have their own intake format; this report is the canonical internal data that an operator (or a future RERA adapter) maps onto the state portal's CSV/XLS template.

## Shape

```jsonc
{
  "meta": {
    "site": { "id": "...", "name": "Green Meadows", "code": "GM-P1", "reraNumber": "P52000012345" },
    "year": 2026,
    "quarter": 2,
    "quarterStart": "2026-04-01T00:00:00.000Z",
    "quarterEnd": "2026-07-01T00:00:00.000Z",
    "generatedAt": "2026-07-01T08:32:00.000Z"
  },
  "inventory": {
    "totalPlots": 40,
    "statusCounts": {
      "UNSOLD": 12, "ALLOTTED": 18, "UNDER_CONSTRUCTION": 8, "COMPLETED": 2
    }
  },
  "allotments": {
    "inQuarter": 6,
    "cumulative": 28,
    "plotsAllotted": [
      { "plotId": "...", "plotNumber": "P-12", "allottedAt": "...", "salePrice": 4500000 }
    ]
  },
  "transfers": {
    "approvedInQuarter": 1,
    "rows": [
      { "plotId": "...", "plotNumber": "P-07", "approvedAt": "...", "salePrice": 5200000 }
    ]
  },
  "financials": {
    "collectedInQuarter": 12450000,
    "cumulativeCollected": 84320000,
    "overdue": { "count": 3, "amount": 1875000 }
  },
  "development": {
    "items": [
      { "id": "...", "kind": "club_house", "label": "Club House", "status": "IN_PROGRESS", "averageProgress": 62.5 },
      { "id": "...", "kind": "road", "label": "Main Road", "status": "COMPLETED", "averageProgress": 100 }
    ],
    "overallProgress": 71.4
  },
  "construction": {
    "plotsUnderConstruction": 10,
    "averageCompletion": 38.2
  }
}
```

## Notes

- "Quarter" follows the calendar year — Q1 = Jan-Mar, Q2 = Apr-Jun, Q3 = Jul-Sep, Q4 = Oct-Dec.
- "Cumulative" sums all events with timestamp **before** the quarter end — so a Q2 report includes Q1's data too.
- "Overdue" counts unpaid installments whose `dueDate` is before the quarter end.
- Permission: `Site.RERAExport:export` — by default granted to `super_admin` and `admin`.
- Future work (Phase 5): a state-specific adapter (Maharashtra MahaRERA, Karnataka K-RERA…) that takes this canonical JSON and produces the exact CSV / XLS the state portal accepts.
