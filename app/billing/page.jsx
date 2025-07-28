'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';

export default function BillingPage() {
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);

  useEffect(() => {
    axios.get('/api/plans').then(res => setPlans(res.data));
  }, []);

  const handleCheckout = async () => {
    if (!selectedPlan) return;
    const res = await axios.post('/api/payment/checkout', {
      plan_id: selectedPlan.id,
      description: selectedPlan.name,
      price: selectedPlan.price,
    });
    window.location.href = res.data.url;
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <h2 className="text-xl font-bold mb-4">เลือกแผนบริการ</h2>
      <select className="w-full p-2 mb-4" onChange={(e) => {
        const plan = plans.find(p => p.id === e.target.value);
        setSelectedPlan(plan);
      }}>
        <option value="">-- เลือกแผน --</option>
        {plans.map(plan => (
          <option key={plan.id} value={plan.id}>{plan.name} - ${plan.price}</option>
        ))}
      </select>
      <button className="bg-green-600 text-white p-2 w-full" onClick={handleCheckout}>ชำระเงิน</button>
    </div>
  );
}
