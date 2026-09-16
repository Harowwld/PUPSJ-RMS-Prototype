export async function verifyTurnstileToken(token) {
  if (!token) return false;
  
  // Cloudflare Turnstile Verification URL
  const url = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
  
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // If no secret is configured, bypass the check in development
    // (Ensure a secret is set in production!)
    if (process.env.NODE_ENV === "development") {
      console.warn("Turnstile bypassed: TURNSTILE_SECRET_KEY is not set.");
      return true;
    }
    return false;
  }

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secret);
    formData.append("response", token);

    const res = await fetch(url, {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const data = await res.json();
    return data.success;
  } catch (error) {
    console.error("Turnstile verification error:", error);
    return false;
  }
}
