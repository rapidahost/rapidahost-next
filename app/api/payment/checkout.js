const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  mode: 'payment',
  line_items,
  success_url: 'https://rapidahost.vercel.app/signup/thank-you',
  cancel_url: 'https://rapidahost.vercel.app/signup/cancel',
});
