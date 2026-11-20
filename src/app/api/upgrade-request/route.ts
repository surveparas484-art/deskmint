// Server-only lead capture route for DeskMint Pro upgrade requests.
// Receiving email & delivery API keys stay strictly in server environment variables.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    if (!(req.headers.get("content-type") || "").includes("application/json")) {
      return Response.json({ ok: false, error: "Invalid request format." }, { status: 415 });
    }
    const body = (await req.json()) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
    const email = typeof body.email === "string" ? body.email.trim().slice(0, 160) : "";
    const phone = typeof body.phone === "string" ? body.phone.trim().slice(0, 40) : "";
    const tools = typeof body.tools === "string" ? body.tools.trim().slice(0, 400) : "";

    if (!name) return Response.json({ ok: false, error: "Please enter your name." }, { status: 400 });
    if (!email || !EMAIL_RE.test(email)) return Response.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 });

    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || "";
    const web3formsKey = process.env.WEB3FORMS_ACCESS_KEY || "";
    const resendKey = process.env.RESEND_API_KEY || "";

    const summary = [
      `Name: ${name}`,
      `Email: ${email}`,
      `WhatsApp / Phone: ${phone || "Not provided"}`,
      `Interested Mint: ${tools || "AI Studio & Translation Studio"}`,
      `Submitted: ${new Date().toISOString()}`,
    ].join("\n");

    let delivered = false;

    // Option A: Web3Forms (free, zero domain verification needed)
    if (web3formsKey) {
      const r = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: web3formsKey,
          subject: `New DeskMint Pro Request from ${name}`,
          from_name: "DeskMint Pro Funnel",
          replyto: email,
          message: summary,
        }),
      });
      if (r.ok) delivered = true;
    }

    // Option B: Resend API
    if (!delivered && resendKey && adminEmail) {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || "DeskMint <onboarding@resend.dev>",
          to: [adminEmail],
          reply_to: email,
          subject: `New DeskMint Pro Request from ${name}`,
          text: summary,
        }),
      });
      if (r.ok) delivered = true;
    }

    // Local/dev fallback: log safely to server terminal
    if (!delivered) {
      console.info("[DeskMint Pro Request]\n" + summary);
    }

    return Response.json({
      ok: true,
      message: "Thank you! We received your request and will email you payment & activation details shortly.",
    });
  } catch {
    return Response.json({ ok: false, error: "Could not submit your request right now. Please try again." }, { status: 500 });
  }
}
