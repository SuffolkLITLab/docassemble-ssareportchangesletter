const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');

const statementURL = new URL('/interview', process.env.DOCASSEMBLE_URL || 'http://localhost');
statementURL.searchParams.set('i', 'docassemble.ssareportchangesletter:ssa_report_change.yml');

async function continueFrom(page, heading) {
  const title = page.locator('#daMainQuestion');
  assert.match(await title.innerText(), heading);
  const previous = await title.innerText();
  await page.getByRole('button', { name: 'Continue', exact: true }).last().click();
  await page.waitForFunction(old => document.querySelector('#daMainQuestion')?.innerText !== old, previous);
}

async function readPDF(page, link) {
  const url = await link.getAttribute('href');
  const response = await page.request.get(new URL(url, page.url()).href);
  assert.equal(response.status(), 200);
  assert.match(response.headers()['content-type'], /pdf/);
  return execFileSync('pdftotext', ['-layout', '-', '-'], {
    input: await response.body(),
    encoding: 'utf8',
  });
}

test('preview and signed statement preserve every narrative marker', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const markers = Array.from({ length: 120 }, (_, i) => 'Entry' + String(i + 1).padStart(3, '0'));
    const narrative = markers.map(marker => marker + ' records a change in my situation.').join('\n');

    await page.goto(statementURL.href);
    await page.locator('label').filter({ hasText: 'I accept the terms of use' }).click();
    await continueFrom(page, /help/i);
    await page.getByLabel('First name').fill('Taylor');
    await page.getByLabel('Last name').fill('Example');
    await continueFrom(page, /your name/i);
    await page.getByLabel('Address', { exact: true }).fill('10 Example Street');
    await page.getByLabel('City', { exact: true }).fill('Boston');
    await page.getByLabel('State', { exact: true }).selectOption('MA');
    await page.getByLabel('Zip code').fill('02108');
    await continueFrom(page, /live/i);
    await page.locator('label').filter({ hasText: 'SSDI (' }).click();
    await continueFrom(page, /benefits/i);
    await page.locator('label').filter({ hasText: 'Something else' }).click();
    await page.locator('textarea').fill(narrative);
    await continueFrom(page, /kind of change/i);
    await page.locator('textarea').fill('Final detail from the next screen.');
    await continueFrom(page, /details/i);
    await page.getByLabel('Address', { exact: true }).fill('20 Example Street');
    await page.getByLabel('City', { exact: true }).fill('Boston');
    await page.getByLabel('State', { exact: true }).selectOption('MA');
    await page.getByLabel('Zip', { exact: true }).fill('02108');
    await continueFrom(page, /office/i);

    const preview = await readPDF(page, page.getByRole('link', { name: /unsigned preview/i }));
    await continueFrom(page, /preview/i);
    const box = await page.locator('canvas:visible').boundingBox();
    await page.mouse.move(box.x + 20, box.y + 20);
    await page.mouse.down();
    await page.mouse.move(box.x + 70, box.y + 50, { steps: 8 });
    await page.mouse.up();
    await continueFrom(page, /sign your letter/i);
    const final = await readPDF(page, page.getByRole('link', { name: /^PDF/i }).first());
    for (const document of [preview, final]) {
      assert.deepEqual(document.match(/Entry\d{3}/g), markers);
      assert.match(document.replace(/\s+/g, ' '), /Final detail from the next screen\./);
    }
  } finally {
    await browser.close();
  }
});
