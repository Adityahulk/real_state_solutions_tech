import { Injectable, Logger } from '@nestjs/common';
import { ApsClient } from './aps.client';

/**
 * CAD parser.
 *
 * Inputs supported:
 *  - .geojson / .json — used as-is (great for dev without APS)
 *  - .dwg / .dxf with APS credentials — uploaded to APS, translated,
 *      entities extracted via metadata API
 *  - .dwg / .dxf without APS — synthetic grid for review UI testing
 */

export interface ParsedEntity {
  layer: string;
  label: string;
  kind: 'plot' | 'dev_item';
  devKind?: string;
  /** GeoJSON geometry (Polygon for plots, Point/LineString/Polygon for dev items) */
  geometry: Record<string, unknown>;
  areaSqft?: number;
}

export interface ParsedDrawing {
  entities: ParsedEntity[];
  svg?: string;
  source: 'geojson' | 'aps_stub' | 'aps';
}

const LAYER_TO_DEV_KIND: Record<string, string> = {
  ROADS: 'road',
  POLES: 'pole',
  WATER: 'water_line',
  SEWER: 'sewer_line',
  CLUB_HOUSE: 'club_house',
  PARK: 'park',
  PLANTATION: 'plantation',
  BOUNDARY: 'boundary',
};

@Injectable()
export class CadParser {
  private readonly log = new Logger(CadParser.name);

  constructor(private readonly aps: ApsClient) {}

  async parse(buf: Buffer, filename: string): Promise<ParsedDrawing> {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.geojson') || lower.endsWith('.json')) {
      return this.parseGeoJson(buf);
    }
    if (lower.endsWith('.dwg') || lower.endsWith('.dxf')) {
      if (this.aps.enabled) {
        try {
          return await this.parseWithAps(buf, filename);
        } catch (e: unknown) {
          this.log.error(`APS path failed (${(e as Error).message}); falling back to stub`);
        }
      } else {
        this.log.warn(
          `APS not configured — returning synthetic parse for ${filename}. ` +
            'Set APS_CLIENT_ID/SECRET to enable real DWG/DXF parsing.',
        );
      }
      return this.sample();
    }
    throw new Error(`Unsupported CAD format: ${filename}`);
  }

  private async parseWithAps(buf: Buffer, filename: string): Promise<ParsedDrawing> {
    const { urn } = await this.aps.uploadAndTranslate(filename, buf);
    await this.aps.waitForReady(urn);
    const rows = await this.aps.readEntities(urn);

    // Filter to entities on the layers we care about + extract a geometry.
    // Note: full coordinate extraction requires SVF — for v1 we set a
    // placeholder geometry and rely on the admin review step (where a CAD
    // operator can paste or sketch polygons over the preview SVG). This is
    // a deliberate Phase-4 incremental — the heavy SVF reader lands in v2.
    const entities: ParsedEntity[] = [];
    for (const r of rows) {
      const layer = r.layer.toUpperCase();
      if (!layer) continue;
      const isPlot = layer === 'PLOTS' || layer === 'PLOT';
      const known = layer in LAYER_TO_DEV_KIND;
      if (!isPlot && !known) continue;
      entities.push({
        layer,
        label: r.label,
        kind: isPlot ? 'plot' : 'dev_item',
        devKind: isPlot ? undefined : LAYER_TO_DEV_KIND[layer],
        geometry: { type: 'Point', coordinates: [0, 0], _todo: 'svf-coords' },
      });
    }
    return { entities, source: 'aps' };
  }

  private parseGeoJson(buf: Buffer): ParsedDrawing {
    const fc = JSON.parse(buf.toString('utf8'));
    if (fc?.type !== 'FeatureCollection' || !Array.isArray(fc.features)) {
      throw new Error('Expected GeoJSON FeatureCollection');
    }
    const entities: ParsedEntity[] = [];
    for (const f of fc.features) {
      const layer = String(f?.properties?.layer ?? '').toUpperCase();
      const label = String(f?.properties?.label ?? f?.properties?.name ?? '');
      const isPlot = layer === 'PLOTS' || layer === 'PLOT';
      entities.push({
        layer,
        label,
        kind: isPlot ? 'plot' : 'dev_item',
        devKind: isPlot ? undefined : LAYER_TO_DEV_KIND[layer] ?? layer.toLowerCase(),
        geometry: f.geometry,
        areaSqft: f?.properties?.areaSqft ?? undefined,
      });
    }
    return { entities, source: 'geojson' };
  }

  /** Synthetic 3x3 grid of plots + a road for demo / dev. */
  private sample(): ParsedDrawing {
    const entities: ParsedEntity[] = [];
    const size = 30;
    const gap = 10;
    let n = 1;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const x = col * (size + gap);
        const y = row * (size + gap);
        entities.push({
          layer: 'PLOTS',
          label: `P-${String(n).padStart(2, '0')}`,
          kind: 'plot',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [x, y],
                [x + size, y],
                [x + size, y + size],
                [x, y + size],
                [x, y],
              ],
            ],
          },
          areaSqft: size * size,
        });
        n++;
      }
    }
    entities.push({
      layer: 'ROADS',
      label: 'Main Road',
      kind: 'dev_item',
      devKind: 'road',
      geometry: {
        type: 'LineString',
        coordinates: [
          [-10, -5],
          [130, -5],
        ],
      },
    });
    return { entities, source: 'aps_stub' };
  }
}
