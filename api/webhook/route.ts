case 'checkout.session.completed': {
  const session = event.data.object;
  const metadata = session.metadata || {};
  const clientEmail = session.customer_email;

  const { clientId, invoiceId, password } = await createWHMCSClientAndInvoice({
    email: clientEmail,
    name: metadata.name || '',
    plan_id: metadata.plan_id,
    payment_method: 'stripe',
    promocode: metadata.promocode,
    billingcycle: metadata.billingcycle,
  });

  // ส่ง Welcome Email หลังสมัครสำเร็จ
  try {
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: clientEmail,
        name: metadata.name || '',
        email: clientEmail,
        password: password || '',
        clientId,
        invoiceId,
        paymentMethod: 'stripe'
      })
    });
  } catch (e) {
    console.error('Send Welcome Email failed', e);
  }

  return res.status(200).json({ received: true });
}
