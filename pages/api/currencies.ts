// pages/api/currencies.ts
import type { NextApiRequest, NextApiResponse } from "next";

type Currency = {
  code: string;
  symbol: string;
  name?: string;
  rate?: number; // เทียบกับ USD (ตัวอย่าง)
};

type ApiOk = {
  ok: true;
  traceId: string;
  source: "remote" | "stub";
  currencies: Currency[];
  diagnostics?: unknown;
};

type ApiErr = {
  ok: false;
  traceId: string;
  error: {
    message: string;
    code?: string;
  };
  diagnostics?: unknown;
};

type ApiResp = ApiOk | ApiErr;

/** ----- Utilities ----- */

const STUB_CURRENCIES: Currency[] = [
  { code: "USD", symbol: "$", name: "US Dollar", rate: 1 },
  { code: "THB", symbol: "฿", name: "Thai Baht", rate: 36.5 },
  { code: "EUR", symbol: "€", name: "Euro", rate: 0.91 },
];

const safeBool = (v: unknown) => (v ? true : false);

function mask(v?: string | null) {
  if (!v) return false;
  if (v.length <= 6) return "***";
  return `${v.slice(0, 3)}***${v.slice(-2)}`;
}

function makeTraceId(req: NextApiRequest) {
  const fromHeader =
    (req.headers["x-request-id"] as string) ||
    (req.headers["x-vercel-id"] as string);
  if (fromHeader) return String(fromHeader);
  // very light trace id
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function pickHeaders(req: NextApiRequest) {
  return {
    "user-agent": req.headers["user-agent"] ?? "",
    "x-forwarded-for": req.headers["x-forwarded-for"] ?? "",
    "x-vercel-id": req.headers["x-vercel-id"] ?? "",
  };
}

function envSnapshot() {
  return {
    // แสดงแค่ว่ามี/ไม่มี (ไม่โชว์ค่าเต็ม)
    has_WHMCS_API_URL: safeBool(process.env.WHMCS_API_URL),
    has_LOGTAIL_TOKEN: safeBool(process.env.LOGTAIL_TOKEN),
    has_SENDGRID_API_KEY: safeBool(process.env.SENDGRID_API_KEY),
    has_PAYPAL_CLIENT_SECRET: safeBool(process.env.PAYPAL_CLIENT_SECRET),
    has_SUPABASE_URL: safeBool(process.env.SUPABASE_URL),
    has_SUPABASE_SERVICE_ROLE_KEY: safeBool(process.env.SUPABASE_SERVICE_ROLE_KEY),
    CURRENCIES_SOURCE_URL: process.env.CURRENCIES_SOURCE_URL
      ? mask(process.env.CURRENCIES_SOURCE_URL)
      : false,
    CURRENCIES_FALLBACK_STUB: process.env.CURRENCIES_FALLBACK_STUB ?? undefined,
  };
}

function serializeError(err: unknown) {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack?.split("\n").slice(0, 4).join("\n"),
    };
  }
  try {
    return { message: JSON.stringify(err) };
  } catch {
    return { message: String(err) };
  }
}

/** ----- Remote fetcher (optional) -----
 *  ตั้งค่า CURRENCIES_SOURCE_URL = URL ที่คืน JSON ของ currencies
 *  รูปแบบที่คาดหวัง: { currencies: Currency[] }
 */
async function fetchCurrenciesFromRemote(
  traceId: string
): Promise<Currency[]> {
  const url = process.env.CURRENCIES_SOURCE_URL;

  if (!url) {
    throw new Error("CURRENCIES_SOURCE_URL is not configured.");
  }

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "x-trace-id": traceId,
      "content-type": "application/json",
    },
  });

  // ไม่เชื่อใจ status 200 อย่างเดียว — บังคับ parse JSON
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch (e) {
    throw new Error(
      `Remote did not return JSON (status ${res.status}): ${text.slice(0, 200)}`
    );
  }

  if (!res.ok) {
    throw new Error(
      `Remote error ${res.status}: ${JSON.stringify(json).slice(0, 300)}`
    );
  }

  if (!json || !Array.isArray(json.currencies)) {
    throw new Error(
      `Remote JSON shape invalid, expected { currencies: Currency[] }`
    );
  }

  return json.currencies;
}

/** ----- Handler ----- */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResp>
) {
  const traceId = makeTraceId(req);
  const debug = String(req.query.debug ?? "") === "1";
  const wantStub =
    String(req.query.stub ?? "") === "1" ||
    String(process.env.CURRENCIES_FALLBACK_STUB ?? "") === "1";

  // ให้แน่ใจว่าคืน JSON เสมอ
  res.setHeader("content-type", "application/json; charset=utf-8");
  // อย่าแคชตอน debug
  res.setHeader(
    "Cache-Control",
    debug ? "no-store" : "public, max-age=60, s-maxage=60, stale-while-revalidate=300"
  );

  const commonDiag = {
    traceId,
    method: req.method,
    url: req.url,
    headers: pickHeaders(req),
    env: envSnapshot(),
    query: req.query,
  };

  if (req.method !== "GET") {
    const payload: ApiErr = {
      ok: false,
      traceId,
      error: { message: `Method ${req.method} not allowed`, code: "METHOD_NOT_ALLOWED" },
      diagnostics: debug ? commonDiag : undefined,
    };
    // 405 แต่ยังคง JSON
    res.status(405).json(payload);
    return;
  }

  try {
    let source: "remote" | "stub" = "remote";
    let currencies: Currency[];

    if (wantStub) {
      source = "stub";
      currencies = STUB_CURRENCIES;
    } else {
      try {
        currencies = await fetchCurrenciesFromRemote(traceId);
      } catch (remoteErr) {
        // log แล้ว fallback เป็น stub เพื่อให้หน้า billing ใช้งานต่อได้
        console.error("[/api/currencies] remote fetch failed", {
          traceId,
          error: serializeError(remoteErr),
          diag: commonDiag,
        });
        source = "stub";
        currencies = STUB_CURRENCIES;
      }
    }

    const payload: ApiOk = {
      ok: true,
      traceId,
      source,
      currencies,
      diagnostics: debug ? commonDiag : undefined,
    };
    res.status(200).json(payload);
  } catch (err) {
    // กันทุกกรณีให้ได้ JSON เสมอ
    const errorObj = serializeError(err);

    // log แบบละเอียด (sanitized)
    console.error("[/api/currencies] unhandled error", {
      traceId,
      error: errorObj,
      diag: commonDiag,
    });

    const payload: ApiErr = {
      ok: false,
      traceId,
      error: { message: errorObj.message || "Internal Server Error" },
      diagnostics: debug ? { ...commonDiag, error: errorObj } : undefined,
    };

    // เลือกตอบ 200 ก็ได้ถ้าอยากให้หน้า client ไม่ล้ม
    // แต่ที่นี่จะคง 500 ไว้ (ยังคง JSON)
    res.status(500).json(payload);
  }
}
