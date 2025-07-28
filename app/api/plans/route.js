// app/api/plans/route.js
export async function GET() {
  return Response.json([
    { id: '101', name: 'Basic Plan', price: 5.99 },
    { id: '102', name: 'Pro Plan', price: 12.99 },
    { id: '103', name: 'Enterprise', price: 24.99 },
  ]);
}
