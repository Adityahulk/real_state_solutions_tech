import { Injectable } from '@nestjs/common';
import Handlebars from 'handlebars';

const ALLOTMENT_LETTER = `<!doctype html>
<html><head><meta charset="utf-8"><title>Allotment Letter — {{plot.plotNumber}}</title>
<style>
  body { font-family: Georgia, serif; max-width: 720px; margin: 40px auto; color: #111; line-height: 1.6; }
  h1 { text-align: center; letter-spacing: 1px; }
  .meta { display: flex; justify-content: space-between; font-size: 12px; color: #555; }
  .signature { margin-top: 60px; display: flex; justify-content: space-between; }
  .signature div { text-align: center; }
  .signature span { display: block; border-top: 1px solid #444; padding-top: 4px; min-width: 220px; }
  table.shares { width: 100%; border-collapse: collapse; margin: 16px 0; }
  table.shares th, table.shares td { border: 1px solid #ddd; padding: 8px; text-align: left; }
  table.shares th { background: #f7f7f7; }
</style>
</head><body>
  <h1>ALLOTMENT LETTER</h1>
  <div class="meta">
    <span>Ref: {{allotment.id}}</span>
    <span>Date: {{formatDate allotment.allottedAt}}</span>
  </div>
  <p>This Allotment Letter is issued by <strong>{{org.name}}</strong> in respect of:</p>
  <p>
    Site: <strong>{{site.name}}</strong> ({{site.code}})<br/>
    Plot No.: <strong>{{plot.plotNumber}}</strong>{{#if plot.areaSqft}}, Area: <strong>{{plot.areaSqft}} sq.ft.</strong>{{/if}}<br/>
    Sale Consideration: <strong>₹ {{formatINR allotment.salePrice}}</strong>
  </p>
  <p>To the following owner(s):</p>
  <table class="shares">
    <thead><tr><th>Name</th><th>PAN</th><th>Share %</th><th>Nominee</th></tr></thead>
    <tbody>
      {{#each shares}}
        <tr>
          <td>{{this.name}}</td>
          <td>{{#if this.panMasked}}{{this.panMasked}}{{else}}—{{/if}}</td>
          <td>{{this.sharePercent}}%</td>
          <td>{{#if this.nomineeName}}{{this.nomineeName}}{{#if this.nomineeRelation}} ({{this.nomineeRelation}}){{/if}}{{else}}—{{/if}}</td>
        </tr>
      {{/each}}
    </tbody>
  </table>
  <p>
    This allotment is subject to the company's standard terms and conditions and the
    payment schedule annexed herewith. Title shall pass on registration in accordance
    with applicable law.
  </p>
  <div class="signature">
    <div><span>For {{org.name}}</span></div>
    <div><span>Allottee Signature(s)</span></div>
  </div>
</body></html>`;

const TRANSFER_LETTER = `<!doctype html>
<html><head><meta charset="utf-8"><title>Transfer Letter — {{plot.plotNumber}}</title>
<style>
  body { font-family: Georgia, serif; max-width: 720px; margin: 40px auto; color: #111; line-height: 1.6; }
  h1 { text-align: center; letter-spacing: 1px; }
  table.shares { width: 100%; border-collapse: collapse; margin: 16px 0; }
  table.shares th, table.shares td { border: 1px solid #ddd; padding: 8px; text-align: left; }
  table.shares th { background: #f7f7f7; }
  .signature { margin-top: 60px; display: flex; justify-content: space-between; }
  .signature span { display: block; border-top: 1px solid #444; padding-top: 4px; min-width: 220px; }
</style>
</head><body>
  <h1>TRANSFER LETTER</h1>
  <p>This Transfer Letter records the resale of:</p>
  <p>
    Site: <strong>{{site.name}}</strong><br/>
    Plot No.: <strong>{{plot.plotNumber}}</strong><br/>
    Consideration: <strong>₹ {{formatINR transfer.salePrice}}</strong>
  </p>
  <p><strong>From (current owners):</strong></p>
  <table class="shares">
    <thead><tr><th>Name</th><th>Share %</th></tr></thead>
    <tbody>{{#each fromShares}}<tr><td>{{this.name}}</td><td>{{this.sharePercent}}%</td></tr>{{/each}}</tbody>
  </table>
  <p><strong>To (new owners):</strong></p>
  <table class="shares">
    <thead><tr><th>Name</th><th>Share %</th></tr></thead>
    <tbody>{{#each toShares}}<tr><td>{{this.name}}</td><td>{{this.sharePercent}}%</td></tr>{{/each}}</tbody>
  </table>
  <p>
    Upon counter-signature by {{org.name}} and completion of statutory registration,
    title in the above plot shall pass to the new owners in the proportions stated.
  </p>
  <div class="signature">
    <div><span>Current Owner(s)</span></div>
    <div><span>New Owner(s)</span></div>
    <div><span>For {{org.name}}</span></div>
  </div>
</body></html>`;

const RECEIPT = `<!doctype html>
<html><head><meta charset="utf-8"><title>Receipt — {{installment.label}}</title>
<style>
  body { font-family: Georgia, serif; max-width: 720px; margin: 40px auto; color: #111; line-height: 1.6; }
  h1 { text-align: center; letter-spacing: 1px; }
  .meta { display: flex; justify-content: space-between; font-size: 12px; color: #555; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
  th { background: #f7f7f7; }
  .amount { font-size: 24px; font-weight: 700; margin: 16px 0; text-align: center; }
  .signature { margin-top: 60px; display: flex; justify-content: flex-end; }
  .signature span { display: block; border-top: 1px solid #444; padding-top: 4px; min-width: 220px; }
</style>
</head><body>
  <h1>PAYMENT RECEIPT</h1>
  <div class="meta">
    <span>Site: {{site.name}}</span>
    <span>Plot: {{plot.plotNumber}}</span>
    <span>Date: {{formatDate paidAt}}</span>
  </div>
  <p>Received from:</p>
  <table>
    <thead><tr><th>Name</th><th>Share %</th></tr></thead>
    <tbody>
      {{#each owners}}
        <tr><td>{{this.name}}</td><td>{{this.sharePercent}}%</td></tr>
      {{/each}}
    </tbody>
  </table>
  <p class="amount">₹ {{formatINR installment.amount}}</p>
  <p>Towards: <strong>{{installment.label}}</strong></p>
  {{#if installment.reference}}<p>Reference: <strong>{{installment.reference}}</strong></p>{{/if}}
  <p style="font-size: 12px; color: #555;">Receipt issued in respect of payment of <strong>{{installment.label}}</strong> installment. This is a system-generated receipt and is valid without physical signature.</p>
  <div class="signature">
    <div><span>For {{org.name}}</span></div>
  </div>
</body></html>`;

@Injectable()
export class LetterRenderer {
  private readonly allotmentTpl: HandlebarsTemplateDelegate;
  private readonly transferTpl: HandlebarsTemplateDelegate;
  private readonly receiptTpl: HandlebarsTemplateDelegate;

  constructor() {
    Handlebars.registerHelper('formatINR', (n: unknown) => {
      const num = Number(n ?? 0);
      return num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
    });
    Handlebars.registerHelper('formatDate', (d: unknown) => {
      if (!d) return '';
      const date = d instanceof Date ? d : new Date(String(d));
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    });
    this.allotmentTpl = Handlebars.compile(ALLOTMENT_LETTER);
    this.transferTpl = Handlebars.compile(TRANSFER_LETTER);
    this.receiptTpl = Handlebars.compile(RECEIPT);
  }

  renderAllotment(ctx: unknown): string {
    return this.allotmentTpl(ctx);
  }
  renderTransfer(ctx: unknown): string {
    return this.transferTpl(ctx);
  }
  renderReceipt(ctx: unknown): string {
    return this.receiptTpl(ctx);
  }
}
