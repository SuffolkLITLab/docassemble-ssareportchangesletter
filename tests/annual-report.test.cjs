// Run with node --test against a local installation with Playwright, Chromium, and Poppler.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');

for (const hasPurchase of [false, true]) {
  const scenario = hasPurchase ? 'mixed-purpose purchase' : 'zero withdrawals';
  test('questions 6–8 worksheet with ' + scenario, async () => {
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      const url = new URL('/interview', process.env.DOCASSEMBLE_URL || 'http://localhost');
      url.searchParams.set('i', 'docassemble.ssareportchangesletter:ssa_report_of_dedicated_account.yml');
      const next = () => page.getByRole('button', { name: 'Continue', exact: true }).last().click();
      const choice = pattern => page.locator('label:visible').filter({ hasText: pattern });
      await page.goto(url.href);
      await choice(/only questions 6 through 8/).click();
      await next();
      await choice(/I accept the terms of use/).click();
      await next();
      for (const [heading, first] of [[/Who is getting/, 'Sydney'], [/What is your name/, 'Taylor']]) {
        await page.getByRole('heading', { name: heading }).waitFor();
        await page.getByLabel('First name').fill(first);
        await page.getByLabel('Last name').fill('Example');
        await next();
      }
      await page.getByLabel('Report begins').fill('2025-01-01');
      await page.getByLabel('Report ends').fill('2025-12-31');
      await next();
      await page.getByLabel(/amount printed in box 6/i).fill('1000');
      await choice(/^No$/).nth(0).click(); // Deposits
      await choice(hasPurchase ? /^Yes$/ : /^No$/).nth(1).click(); // Withdrawals
      await next();
      if (hasPurchase) {
        await page.getByLabel(/Date of purchase/).first().fill('2025-02-12');
        await page.getByLabel('Amount', { exact: true }).first().fill('35');
        await page.getByLabel(/What did you buy/).first().fill('Adaptive pencils');
        await choice(/^No$/).first().click();
        await choice(/^Education$/).first().click();
        await choice(/^Something else$/).first().click();
        await page.getByLabel(/Explain why you bought/).first().fill('For school and adapted home activities');
        await next();
      }
      await page.getByRole('heading', { name: /Review your dedicated account entries/ }).waitFor();
      await next();
      if (hasPurchase) {
        await page.getByRole('heading', { name: /Do you have any receipts/ }).waitFor();
        await next();
        await page.getByLabel(/How did your spending benefit/).fill('Supports daily communication');
        await next();
      }
      await page.getByLabel(/Ending balance for question 8/).fill(hasPurchase ? '966.23' : '1001.23');
      await next();
      const download = page.getByRole('link', { name: /Download your worksheet \(PDF\)/ });
      const response = await page.request.get(new URL(await download.getAttribute('href'), page.url()).href);
      assert.equal(response.status(), 200);
      assert.match(response.headers()['content-type'], /pdf/);
      const pdf = execFileSync('pdftotext', ['-layout', '-', '-'], {
        input: await response.body(), encoding: 'utf8',
      });
      assert.doesNotMatch(pdf, /3A\./);
      assert.match(pdf, /Sydney Example/);
      assert.match(pdf, /Taylor Example/);
      if (hasPurchase) {
        assert.match(pdf, /7A\.[^\n]*Yes/);
        assert.match(pdf, /7B\.[^\n]*No/);
        assert.match(pdf, /Adaptive pencils/);
        assert.match(pdf, /Supports daily communication/);
        assert.match(pdf, /\$966\.23/);
      } else {
        assert.match(pdf, /7A\.[^\n]*No/);
        assert.doesNotMatch(pdf, /7B\./);
        assert.match(pdf, /\$1,001\.23/);
      }
    } finally {
      await browser.close();
    }
  });
}
