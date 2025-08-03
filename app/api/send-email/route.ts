import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import axios from 'axios';

const WHMCS_API_URL = process.env.WHMCS_API_URL!;
const WHMCS_IDENTIFIER = process.env.WHMCS_API_IDENTIFIER!;
const WHMCS_SECRET = process.env.WHMCS_API_SECRET!;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY!;
const EMAIL_FROM = 'no-reply@rapidahost.com';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clientId, invoiceId, serviceId } = body;

    if (!clientId || !invoiceId || !serviceId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // ดึงข้อมูลจาก WHMCS
    const [clientRes, invoiceRes, serviceRes] = await Promise.all([
      callWhmcs('GetClientsDetails', { clientid: clientId }),
      callWhmcs('GetInvoice', { invoiceid: invoiceId }),
      callWhmcs('GetClientsProducts', { serviceid: serviceId })
    ]);

    const client = clientRes.data;
    const invoice = invoiceRes.data;
    const service = serviceRes.data;

    if (client.result !== 'success' || invoice.result !== 'success' || service.result !== 'success') {
      console.error('WHMCS API error:', { client, invoice, service });
      return NextResponse.json({ error: 'WHMCS API error' }, { status: 500 });
    }

    // ส่งอีเมลผ่าน SendGrid
    const emailRes = await sendEmail({
      to: client.email,
      subject: `ยืนยันการสั่งซื้อ Rapidahost #${invoice.invoiceid}`,
      html: emailTemplate({ client, invoice, service })
    });

    if (emailRes.status !== 202) {
      console.error('SendGrid error:', emailRes.data);
      return NextResponse.json({ error: 'SendGrid send failed' }, { status: 500 });
    }

    console.log('📧 Email sent successfully to', client.email);
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (err: any) {
    console.error('Unhandled error in /send-email:', err.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ---------------------------
// 🔧 ฟังก์ชันเรียก WHMCS API
async function callWhmcs(action: string, params: Record<string, any>) {
  return axios.post(WHMCS_API_URL, {
    identifier: WHMCS_IDENTIFIER,
    secret: WHMCS_SECRET,
    action,
    responsetype: 'json',
    ...params
  });
}

// ---------------------------
// 📤 ฟังก์ชันส่งอีเมลผ่าน SendGrid
async function sendEmail({ to, subject, html }: { to: string, subject: string, html: string }) {
  return axios.post('https://api.sendgrid.com/v3/mail/send', {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: EMAIL_FROM, name: 'Rapidahost.com' },
    subject,
    content: [{ type: 'text/html', value: html }]
  }, {
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
}

// ---------------------------
// ✉️ เทมเพลตอีเมล HTML
function emailTemplate({ client, invoice, service }: any) {
  return `
    <div style="font-family:sans-serif;line-height:1.5;color:#333;">
      <h2>ขอบคุณที่ใช้บริการ Rapidahost.com</h2>
      <p>เรียนคุณ ${client.firstname} ${client.lastname}</p>
      <p>คำสั่งซื้อของคุณได้ถูกดำเนินการเรียบร้อยแล้ว</p>

      <h3>📄 รายละเอียดใบแจ้งหนี้</h3>
      <ul>
        <li>Invoice #: ${invoice.invoiceid}</li>
        <li>สถานะ: ${invoice.status}</li>
        <li>ยอดรวม: ${invoice.total} ${invoice.currency_code || 'USD'}</li>
      </ul>

      <h3>🖥️ บริการ</h3>
      <ul>
        <li>ชื่อบริการ: ${service.products[0]?.name}</li>
        <li>โดเมน: ${service.products[0]?.domain || '-'}</li>
        <li>สถานะ: ${service.products[0]?.status}</li>
      </ul>

      <p>คุณสามารถเข้าสู่ระบบได้ที่: <a href="https://billing.rapidahost.com/clientarea.php">หน้าลูกค้า</a></p>

      <hr />
      <p>หากคุณมีคำถามหรือต้องการความช่วยเหลือ กรุณาติดต่อฝ่ายสนับสนุนของเรา</p>
    </div>
  `;
}
