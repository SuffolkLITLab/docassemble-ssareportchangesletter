# Social Security reporting interviews

This docassemble package includes two public interviews.

- [Report changes to Social Security](https://courtformsonline.org/ma/forms/report-changes-to-social-security) helps people who receive SSI or SSDI prepare a statement about changes in their circumstances.
- [Report of benefits and dedicated account](https://courtformsonline.org/ma/forms/report-of-benefits-and-dedicated-account) helps representative payees prepare answers about a beneficiary’s dedicated account using the report that Social Security mailed them.

On a docassemble server with this package installed, use these interview paths.

- `/interview?i=docassemble.ssareportchangesletter:ssa_report_change.yml`
- `/interview?i=docassemble.ssareportchangesletter:ssa_report_of_dedicated_account.yml`

The separate `ssa_dedicated_account_ledger.yml` interview tracks transactions throughout the year. The `ssa_office_test.yml` interview links to the official SSA office locator.

## Run the browser regression tests

Install this package on a local docassemble server. With Node.js, Chromium for Playwright, and Poppler installed, run the tests from this checkout.

```sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium
node --test tests/*.test.cjs
```

The tests default to `http://localhost`. Set `DOCASSEMBLE_URL` to use a different test server.

## Author

Quinten Steenhuis, qsteenhuis@gmail.com

## Changelog
* 2022-01-11 Bugfixes
* 2021-12-18 Incorporate feedback from VLP
* 2021-03-26 bugfixes
* 2021-03-25 Add branding
* 2020-12-31 Migrate to asking for details one at a time; more logical detail questions
* 2020-12-04 Upgrade for newest docassemble version
* 2019-09-21 Cleanup / integrate ssn + tel auto-input validation
* 2019-08-26 Add phone number auto-format, complete template variable mapping
* 2019-08-20 Reorganize question order to be more logical, add review/edit ledgers, separate deposits and withdrawals
* 2019-08-18 Add section headings to record of dedicated account
* 2019-03-23 Include the Record of dedicated account
* 2019-03-06 Work on question order and commpleting letter
* 2019-02-26 Use SSA API to list nearby offices
