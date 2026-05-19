import { Injectable } from '@nestjs/common';
import { ReraService } from './rera.service';

/**
 * MahaRERA-flavoured CSV adapter on top of the canonical RERA JSON.
 *
 * The state portals each want a slightly different layout — this adapter
 * produces the column set MahaRERA's "Quarterly progress" tab accepts. Other
 * states can layer their own adapters the same way.
 */
@Injectable()
export class MahaReraAdapter {
  constructor(private readonly rera: ReraService) {}

  async toCsv(siteId: string, year: number, quarter: number): Promise<string> {
    const r = await this.rera.build(siteId, year, quarter);

    const rows: Array<[string, string | number]> = [
      ['RERA Number', r.meta.site.reraNumber ?? ''],
      ['Project Name', r.meta.site.name],
      ['Project Code', r.meta.site.code],
      ['Reporting Year', r.meta.year],
      ['Reporting Quarter', `Q${r.meta.quarter}`],
      ['Quarter Start', r.meta.quarterStart.slice(0, 10)],
      ['Quarter End', r.meta.quarterEnd.slice(0, 10)],
      ['Total Inventory (Plots)', r.inventory.totalPlots],
      ['Unsold', r.inventory.statusCounts.UNSOLD ?? 0],
      ['Allotted', r.inventory.statusCounts.ALLOTTED ?? 0],
      ['Under Construction', r.inventory.statusCounts.UNDER_CONSTRUCTION ?? 0],
      ['Completed', r.inventory.statusCounts.COMPLETED ?? 0],
      ['Registered', r.inventory.statusCounts.REGISTERED ?? 0],
      ['Allotments In Quarter', r.allotments.inQuarter],
      ['Allotments Cumulative', r.allotments.cumulative],
      ['Approved Transfers In Quarter', r.transfers.approvedInQuarter],
      ['Collected This Quarter (INR)', r.financials.collectedInQuarter],
      ['Cumulative Collected (INR)', r.financials.cumulativeCollected],
      ['Overdue Installments Count', r.financials.overdue.count],
      ['Overdue Amount (INR)', r.financials.overdue.amount],
      ['Overall Site Development %', r.development.overallProgress],
      ['Plots Under Construction', r.construction.plotsUnderConstruction],
      ['Avg. Plot Construction %', r.construction.averageCompletion],
    ];

    const csv = rows
      .map(([k, v]) => `${csvEscape(k)},${csvEscape(String(v))}`)
      .join('\n');

    const itemsHeader = 'Item,Kind,Status,Average Progress %';
    const itemsBody = r.development.items
      .map(
        (i) =>
          `${csvEscape(i.label)},${csvEscape(i.kind)},${csvEscape(i.status)},${i.averageProgress}`,
      )
      .join('\n');

    return `Field,Value\n${csv}\n\nDevelopment Items\n${itemsHeader}\n${itemsBody}\n`;
  }
}

function csvEscape(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
