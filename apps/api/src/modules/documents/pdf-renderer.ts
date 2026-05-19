import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

type Puppeteer = typeof import('puppeteer');
type Browser = Awaited<ReturnType<Puppeteer['launch']>>;

/**
 * HTML → PDF using a long-lived headless Chromium.
 *
 * Lazy-launched on first use. If Chromium can't be started (no Chromium in the
 * image, sandbox restrictions, etc.) we fall back to returning the raw HTML so
 * the rest of the system keeps working — callers see `result.mimeType` and
 * adapt.
 */
@Injectable()
export class PdfRenderer implements OnModuleDestroy {
  private readonly log = new Logger(PdfRenderer.name);
  private browser: Browser | null = null;
  private failed = false;

  async renderHtml(
    html: string,
  ): Promise<{ body: Buffer | string; mimeType: 'application/pdf' | 'text/html' }> {
    if (this.failed) return { body: html, mimeType: 'text/html' };
    try {
      const browser = await this.getBrowser();
      const page = await browser.newPage();
      try {
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdf = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
        });
        return { body: Buffer.from(pdf), mimeType: 'application/pdf' };
      } finally {
        await page.close();
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.log.warn(`Falling back to HTML — Puppeteer failed: ${msg}`);
      this.failed = true;
      return { body: html, mimeType: 'text/html' };
    }
  }

  private async getBrowser(): Promise<Browser> {
    if (this.browser) return this.browser;
    const puppeteer: Puppeteer = await import('puppeteer');
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    return this.browser;
  }

  async onModuleDestroy() {
    await this.browser?.close().catch(() => undefined);
    this.browser = null;
  }
}
