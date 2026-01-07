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
      <mj-class name="footer" text-align="center" color="#777" padding-top="20px" font-size="12px" />
    </mj-attributes>
  </mj-head>

  <mj-body background-color="#f4f4f4" padding="20px">
    <mj-section css-class="container">
      <mj-column>

        <!-- Header -->
        <mj-text css-class="header">
          <h2>Physical Deposit Summary</h2>
        </mj-text>

        <mj-divider border-color="#ddd" />

        <!-- Greeting -->
        <mj-text>
          <p>Dear <strong>${fullName}</strong>,</p>
          <p>
            Please find below the complete summary of your physical deposit.
            Kindly review the terms and conditions carefully before proceeding.
          </p>
        </mj-text>

        <!-- Deposit Summary -->
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

        <!-- Product Details -->
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

        <!-- Terms -->
        <mj-text css-class="section-title">📜 Important Terms & Conditions</mj-text>

        <mj-text font-size="13px" line-height="1.6" color="#333">
          <ol style="padding-left:16px; margin:0;">
            <li>
              Upon opting for the physical deposit process with the jeweller selected by you
              or allocated through the App (“Jeweller”), the gold and/or silver (“Precious Metals”)
              purchased shall be deposited with such Jeweller.
            </li>
            <li>
              Custody, safekeeping and possession of the Precious Metals shall thereafter vest
              solely with the Jeweller.
            </li>
            <li>
              The physical deposit shall be deemed complete upon successful verification of the
              one-time password (“OTP”) and/or issuance of a deposit acknowledgement by the Jeweller.
              Such confirmation constitutes final and binding acceptance of the deposit arrangement
              by you.
            </li>
            <li>
              <strong>
                Upon completion of the deposit with the Jeweller, all risk, responsibility,
                custody and control in relation to the Precious Metals shall stand transferred
                from the Company to the Jeweller.
              </strong>
              You acknowledge that you shall not hold the Company, its affiliates, directors,
              officers, employees or service providers liable for any loss, theft, damage,
              substitution, deterioration, misappropriation, delay, insolvency of the Jeweller,
              or any dispute arising between you and the Jeweller.
            </li>
            <li>
              The Company acts solely as a technology platform facilitating the deposit request
              and coordination between you and the Jeweller.
              <strong>
                The Company does not act as a bailee, custodian, trustee or insurer of the Precious
                Metals once the physical deposit is completed.
              </strong>
            </li>
            <li>
              <strong>
                Any acts, omissions, representations or defaults of the Jeweller shall be solely
                attributable to the Jeweller
              </strong>, and the Company shall not be responsible for the performance, storage
              standards, insurance coverage or compliance of the Jeweller.
            </li>
            <li>
              Any withdrawal, redemption or dispute relating to the deposited Precious Metals
              shall be addressed directly with the Jeweller, and
              <strong>no claim, refund or reversal shall lie against the Company</strong>
              after completion of the deposit.
            </li>
            <li>
              The Company shall not be responsible for any fluctuations in the prices of the
              Precious Metals after the sale and during the physical deposit.
            </li>
            <li>
              You acknowledge that you have independently evaluated and accepted the Jeweller
              and the deposit terms offered by the Jeweller.
            </li>
            <li>
              <strong>
                By proceeding with the physical deposit, you confirm that the Company’s role
                ends upon successful deposit with the Jeweller, and you irrevocably waive any
                claim against the Company arising thereafter.
              </strong>
            </li>
          </ol>
        </mj-text>

        <mj-divider border-color="#ddd" />

        <!-- Consent -->
        <mj-text font-size="14px" color="#000">
          <strong>
            By proceeding further and sharing the OTP below, you confirm that you have read,
            understood, and agreed to the above terms and conditions.
          </strong>
        </mj-text>

        <mj-divider border-color="#007BFF" />

        <!-- OTP Section (AFTER TERMS) -->
        <mj-text css-class="section-title">🔐 OTP for Verification</mj-text>

        <mj-text font-size="16px">
          <p>Your OTP is:</p>
          <h2 style="text-align:center; letter-spacing:4px;">${otp}</h2>
          <p>
            This OTP is valid for <strong>5 minutes</strong>.
            Please share it with the Jeweller to complete the physical deposit.
          </p>
        </mj-text>

        <!-- Footer -->
        <mj-text css-class="footer">
          <p>
            This is an automated message from <strong>Vyapara</strong>. Please do not reply.
          </p>
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
