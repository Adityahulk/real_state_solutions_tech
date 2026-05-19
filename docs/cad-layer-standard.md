# CAD layer-naming standard

> Status: stub — finalised at the start of Phase 1.

When architects deliver DWG/DXF files for a Site, the importer maps named layers to entity kinds. Architects must use the names below verbatim (case-insensitive).

| Layer name | Entity kind | Required attribute |
|---|---|---|
| `PLOTS` | `Plot` | text label = plot number |
| `BOUNDARY` | `DevelopmentItem(kind=boundary)` | — |
| `ROADS` | `DevelopmentItem(kind=road)` | text label = road code (optional) |
| `POLES` | `DevelopmentItem(kind=pole)` | block name = pole type |
| `WATER` | `DevelopmentItem(kind=water_line)` | — |
| `SEWER` | `DevelopmentItem(kind=sewer_line)` | — |
| `CLUB_HOUSE` | `DevelopmentItem(kind=club_house)` | text label = name |
| `PARK` | `DevelopmentItem(kind=park)` | — |
| `PLANTATION` | `DevelopmentItem(kind=plantation)` | — |

Unknown layers are surfaced in the review screen for the admin to either ignore or map manually.
