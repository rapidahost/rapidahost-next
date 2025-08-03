// app/api/payment/checkout/route.js
import Stripe from 'stripe';

export async function POST(req) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const body = await req.json();
  const { plan_id, description, price } = body;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(price * 100),
          product_data: {
            name: description,
          },
        },
        quantity: 1,
      }],
      metadata: {
        plan_id,
        description,
      },
      success_url: 'https://rapidahost.vercel.app/signup/thank-you',
      cancel_url: 'https://rapidahost.com/cancel',
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Stripe Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to create checkout session' }), { status: 500 });
  }
}
