// Run against a local installation with Playwright, Chromium, and Poppler available.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');

test('editing an out-of-order transaction preserves balances and the receipt in the ledger', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const url = new URL('/interview', process.env.DOCASSEMBLE_URL || 'http://localhost');
    url.searchParams.set('i', 'docassemble.ssareportchangesletter:ssa_dedicated_account_ledger.yml');
    const next = () => page.getByRole('button', { name: 'Continue', exact: true }).click();
    const row = text => page.locator('tr:visible').filter({ hasText: text });
    const choose = text => page.locator('label:visible').filter({ hasText: text }).click();
    await page.goto(url.href);
    await next();
    await page.getByLabel('Date', { exact: true }).fill('2025-01-01');
    await page.getByRole('textbox', { name: 'Starting balance' }).fill('100');
    await page.getByLabel('Description').selectOption('original');
    await next();

    for (const [kind, date, amount, description] of [
      ['Deposit', '2025-01-12', '25', 'Refund'],
      ['Withdrawal', '2025-01-03', '5', 'Books'],
    ]) {
      await page.getByText('Add a transaction', { exact: true }).first().click();
      await choose(new RegExp('^' + kind + '$'));
      await page.getByLabel('Date', { exact: true }).fill(date);
      await page.getByLabel('Amount', { exact: true }).fill(amount);
      await page.getByLabel('Description', { exact: true }).fill(description);
      if (kind === 'Withdrawal') {
        await page.getByLabel('Purpose', { exact: true }).selectOption({ label: 'Education' });
        await choose(/^Yes$/);
        await page.getByLabel('Who did you talk to').fill('Local office confirmed');
        await choose(/Add a receipt/);
        await page.locator('input[type=file]').setInputFiles(
          require.resolve('../docassemble/ssareportchangesletter/data/static/box_6.png')
        );
      }
      await next();
      await row(description).waitFor();
    }

    await row('Refund').getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('Amount', { exact: true }).fill('30');
    await next();
    assert.match(await row('Refund').innerText(), /\$30\.00\s+\$125\.00/);
    assert.match(await row('Books').innerText(), /-\$5\.00\s+\$95\.00/);
    assert.equal(await row('Opening balance').getByRole('button', { name: 'Delete' }).count(), 0);
    await page.getByRole('link', { name: 'Download your ledger', exact: true }).click();
    const link = page.getByRole('link', { name: 'Download PDF', exact: true });
    const pdf = await page.request.get(new URL(await link.getAttribute('href'), page.url()).href);
    assert.equal(pdf.status(), 200);
    const input = await pdf.body();
    const text = execFileSync('pdftotext', ['-', '-'], { input, encoding: 'utf8' });
    assert.match(text, /Books[\s\S]+Local office confirmed[\s\S]+Receipt for Books[\s\S]+\$95\.00[\s\S]+Refund[\s\S]+\$125\.00/);
    const images = execFileSync('pdfimages', ['-list', '-'], { input, encoding: 'utf8' });
    assert.match(images, /^\s*\d+\s+\d+\s+image\s/m);
  } finally {
    await browser.close();
  }
});
