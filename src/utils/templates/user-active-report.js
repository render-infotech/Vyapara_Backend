/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/no-unused-vars */
import * as handlebars from 'handlebars';
import moment from 'moment';

handlebars.registerHelper('formatDate', (date, formatter = 0) => {
  if (!date) return '';
  switch (formatter) {
    case 1:
      return moment(date).format('MMMM, YYYY');
    default:
      return moment(date).format('Do MMMM YYYY');
  }
});
handlebars.registerHelper('printNotNull', (data) => {
  if (data) {
    return data;
  }
  return '';
});
handlebars.registerHelper('eq', (a, b) => a === b);

// minified at https://www.minifier.org/html-minifier
const minifiedTemplate =
  // eslint-disable-next-line max-len, quotes
  "<!DOCTYPE html><html lang='en'><head><meta charset='UTF-8' /><meta name='viewport' content='width=device-width, initial-scale=1.0' /><title>CUSTOMER ACTIVE REPORT - {{printNotNull data.headers.name}}</title><style> @page { size: A4 landscape; margin: 10mm; @bottom-right { content: 'Page ' counter(page); } } body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #000; background-color: #fff; } .header { display: flex; justify-content: space-between; align-items: flex-start; } .header img { height: 100px; } .report-info { text-align: right; font-weight: bold; } table { width: 100%; border-collapse: collapse; font-size: 14px; } th, td { border: 1px solid #fef8ed; padding: 8px; text-align: center; } th { border: 0.5px solid black; background-color: #a07722; color: white; } </style></head><body><div class='report-container'><div class='header' style='position: sticky; top: 0; background: #fff'><div><img src='{{printNotNull data.headers.logo}}' alt='{{printNotNull data.headers.name}}' /></div><div class='report-info'><strong><u>CUSTOMER ACTIVE REPORT</u></strong><p> DATE RANGE: {{formatDate data.filters.start_date}} TO {{formatDate data.filters.end_date}} </p><p>DISCLAIMER: {{printNotNull data.headers.disclaimer}}</p><p> REPORT GENERATED ON: {{formatDate data.headers.reportGeneratedOn}} </p></div></div><table><thead><tr style='position: sticky; top: 104px'><th>CUSTOMER NAME</th><th>EMAIL</th><th>CONTACT</th><th>LAST TRANSACTION DATE</th><th>LAST TRANSACTION (GRAMS)</th></tr></thead><tbody> {{#each data.data}} <tr><td>{{printNotNull this.name}}</td><td>{{printNotNull this.email}}</td><td>{{printNotNull this.contact}}</td><td> {{#if this.last_transaction}} {{formatDate this.last_transaction.created_at}} {{else}} N/A {{/if}} </td><td> {{#if this.last_transaction}} {{printNotNull this.last_transaction.grams}} {{else}} N/A {{/if}} </td></tr> {{/each}} <tr style='font-weight: bold; background-color: #fef8ed'><td colspan='4' style='text-align: right'>TOTAL ACTIVE USERS</td><td>{{printNotNull data.total_users}}</td></tr></tbody></table><div class='footer' style='margin-top: 40px; font-size: 13px'><div style=' display: flex; justify-content: space-between; border-top: 1px solid #fef8ed; padding-top: 20px; ' ><div style='max-width: 70%'><p style='margin: 0'>{{printNotNull data.headers.name}}</p></div></div></div></div></body></html>";

// eslint-disable-next-line no-unused-vars
const userActiveReportTemplate = `
 <!DOCTYPE html>
<html lang='en'>
  <head>
    <meta charset='UTF-8' />
    <meta name='viewport' content='width=device-width, initial-scale=1.0' />
    <title>CUSTOMER ACTIVE REPORT - {{printNotNull data.headers.name}}</title>
    <style>
      @page {
        size: A4 landscape;
        margin: 10mm;
        @bottom-right {
          content: 'Page ' counter(page);
        }
      }
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 0;
        color: #000;
        background-color: #fff;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }
      .header img {
        height: 100px;
      }
      .report-info {
        text-align: right;
        font-weight: bold;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 14px;
      }
      th,
      td {
        border: 1px solid #fef8ed;
        padding: 8px;
        text-align: center;
      }
      th {
        border: 0.5px solid black;
        background-color: #a07722;
        color: white;
      }
    </style>
  </head>

  <body>
    <div class='report-container'>
      <div class='header' style='position: sticky; top: 0; background: #fff'>
        <div>
          <img
            src='{{printNotNull data.headers.logo}}'
            alt='{{printNotNull data.headers.name}}'
          />
        </div>
        <div class='report-info'>
          <strong><u>CUSTOMER ACTIVE REPORT</u></strong>
          <p>
            DATE RANGE: {{formatDate data.filters.start_date}} TO
            {{formatDate data.filters.end_date}}
          </p>
          <p>DISCLAIMER: {{printNotNull data.headers.disclaimer}}</p>
          <p>
            REPORT GENERATED ON:
            {{formatDate data.headers.reportGeneratedOn}}
          </p>
        </div>
      </div>

      <table>
        <thead>
          <tr style='position: sticky; top: 104px'>
            <th>CUSTOMER NAME</th>
            <th>EMAIL</th>
            <th>CONTACT</th>
            <th>LAST TRANSACTION DATE</th>
            <th>LAST TRANSACTION (GRAMS)</th>
          </tr>
        </thead>

        <tbody>
          {{#each data.data}}
          <tr>
            <td>{{printNotNull this.name}}</td>
            <td>{{printNotNull this.email}}</td>
            <td>{{printNotNull this.contact}}</td>
            <td>
              {{#if this.last_transaction}}
                {{formatDate this.last_transaction.created_at}}
              {{else}}
                N/A
              {{/if}}
            </td>
            <td>
              {{#if this.last_transaction}}
                {{printNotNull this.last_transaction.grams}}
              {{else}}
                N/A
              {{/if}}
            </td>
          </tr>
          {{/each}}

          <tr style='font-weight: bold; background-color: #fef8ed'>
            <td colspan='4' style='text-align: right'>TOTAL ACTIVE USERS</td>
            <td>{{printNotNull data.total_users}}</td>
          </tr>
        </tbody>
      </table>

      <div class='footer' style='margin-top: 40px; font-size: 13px'>
        <div
          style='
            display: flex;
            justify-content: space-between;
            border-top: 1px solid #fef8ed;
            padding-top: 20px;
          '
        >
          <div style='max-width: 70%'>
            <p style='margin: 0'>{{printNotNull data.headers.name}}</p>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>
`;

export const UserActiveReportTemplate = (context) => handlebars.compile(minifiedTemplate)(context);
// export const getIndividualTemplate = (context) => handlebars.compile(userActiveReportTemplate)(context);

export default UserActiveReportTemplate;
