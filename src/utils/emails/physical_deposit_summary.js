const mjml2html = require('mjml');

export const physicalDepositSummary = (fullName, otp, depositSummary, products) =>
  mjml2html(
    `
<mjml>
  <mj-head>
    <mj-title>Deposit Summary - ${depositSummary.deposit_code}</mj-title>
    <mj-attributes>
      <mj-all font-family="Arial, sans-serif" />
      <mj-class name="container" background-color="#ffffff" padding="20px" border-radius="8px" />
      <mj-class name="header" text-align="center" padding="10px" />
      <mj-class name="section-title" color="#007BFF" font-size="18px" font-weight="bold" />
      <mj-class name="footer" text-align="center" color="#777" padding-top="20px" />
    </mj-attributes>
  </mj-head>

  <mj-body background-color="#f4f4f4" padding="20px">
    <mj-section css-class="container">
      <mj-column>

        <mj-text css-class="header">
          <h2>Physical Deposit Summary</h2>
        </mj-text>

        <mj-divider border-color="#ddd" />
        <mj-text>
          <p>Dear <strong>${fullName}</strong>,</p>
          <p>Please find below the complete summary of your physical deposit along with the OTP required for verification.</p>
        </mj-text>

        <mj-text css-class="section-title">📦 Deposit Summary</mj-text>

        <mj-table>
          <tr><td><strong>Deposit Code</strong></td><td>${depositSummary.deposit_code}</td></tr>
          <tr><td><strong>Customer Code</strong></td><td>${depositSummary.customer_code}</td></tr>
          <tr><td><strong>Material</strong></td><td>${depositSummary.material}</td></tr>
          <tr><td><strong>Total Items</strong></td><td>${products.length}</td></tr>
          <tr><td><strong>Total Pure (g)</strong></td><td>${parseFloat(depositSummary.total_pure_grams).toFixed(3)} g</td></tr>
          <tr><td><strong>Price per Gram (₹)</strong></td><td>₹${depositSummary.price_per_gram}</td></tr>
          <tr><td><strong>Estimated Value (₹)</strong></td><td><strong>₹${depositSummary.estimated_value}</strong></td></tr>
        </mj-table>

        <mj-divider border-color="#007BFF" />

        <mj-text css-class="section-title">📍 Product Details</mj-text>

        <mj-table>
          <tr>
            <th>Type</th>
            <th>Purity</th>
            <th>Gross (g)</th>
            <th>Net (g)</th>
            <th>PME (g)</th>
          </tr>

          ${products
            .map(
              (p) => `
            <tr>
              <td>${p.product_type}</td>
              <td>${p.purity}k</td>
              <td>${parseFloat(p.gross_weight).toFixed(3)} g</td>
              <td>${parseFloat(p.net_weight).toFixed(3)} g</td>
              <td>${parseFloat(p.pure_metal_equivalent).toFixed(3)} g</td>
            </tr>
          `,
            )
            .join('')}
        </mj-table>

        <mj-divider border-color="#007BFF" />

        <mj-text css-class="section-title">🔐 OTP for Verification</mj-text>
        <mj-text font-size="16px">
          <p>Your OTP is:</p>
          <h2 style="text-align:center; letter-spacing:4px;">${otp}</h2>
          <p>This OTP is valid for 5 minutes. Please share it with the vendor to proceed.</p>
        </mj-text>

        <mj-divider border-color="#ddd" />

        <mj-text css-class="footer">
          <p>This is an automated message from <strong>Vyapara</strong>. Please do not reply.</p>
        </mj-text>

      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
`,
    {},
  ).html;

export default {
  physicalDepositSummary,
};
