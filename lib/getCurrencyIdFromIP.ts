// lib/getCurrencyIdFromIP.ts
import axios from 'axios';

export async function getCurrencyIdFromIP(ip: string) {
  try {
    const { data } = await axios.get(`https://ipapi.co/${ip}/json/`);
    const countryCode = data.country_code; // เช่น "TH"
    const map: Record<string, number> = {
      TH: 2, // THB
      US: 1, // USD
      JP: 3, // JPY
    };
    return map[countryCode] || 1;
  } catch {
    return 1;
  }
}

