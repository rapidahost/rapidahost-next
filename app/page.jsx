'use client';
import { useState } from 'react';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import firebaseApp from '../utils/firebase';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignUp = async () => {
    try {
      const auth = getAuth(firebaseApp);
      await createUserWithEmailAndPassword(auth, email, password);
      window.location.href = '/billing';
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <h2 className="text-xl font-bold mb-4">สมัครสมาชิก</h2>
      <input className="border p-2 w-full mb-2" placeholder="Email" onChange={e => setEmail(e.target.value)} />
      <input className="border p-2 w-full mb-4" type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />
      <button className="bg-blue-600 text-white p-2 w-full" onClick={handleSignUp}>ต่อไป</button>
    </div>
  );
}
