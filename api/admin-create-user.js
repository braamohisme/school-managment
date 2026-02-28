export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: "missing_server_env" });
  }

  const authHeader = req.headers?.authorization || req.headers?.Authorization || "";
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!accessToken) {
    return res.status(401).json({ error: "missing_access_token" });
  }

  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: "GET",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const userJson = await userRes.json().catch(() => null);
  if (!userRes.ok || !userJson?.email) {
    return res.status(401).json({
      error: "invalid_access_token",
      details: userJson || null,
    });
  }

  const roleRes = await fetch(
    `${supabaseUrl}/rest/v1/app_users?select=role&email=eq.${encodeURIComponent(userJson.email)}&limit=1`,
    {
      method: "GET",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    }
  );
  const roleRows = await roleRes.json().catch(() => []);
  const callerRole = Array.isArray(roleRows) ? roleRows[0]?.role : null;
  if (!roleRes.ok || callerRole !== "admin") {
    return res.status(403).json({ error: "forbidden_admin_only" });
  }

  let body = {};
  if (typeof req.body === "string") {
    try {
      body = JSON.parse(req.body || "{}");
    } catch {
      return res.status(400).json({ error: "invalid_json_body" });
    }
  } else {
    body = req.body || {};
  }
  const { email, password, name, role, phone, grade, subject, bus_number, route } = body;
  if (!email || !password || !name || !role) {
    return res.status(400).json({ error: "missing_required_fields" });
  }

  try {
    const createAuth = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
      }),
    });

    let createAuthJson = null;
    try { createAuthJson = await createAuth.json(); } catch {}

    const alreadyExists =
      !createAuth.ok &&
      String(
        createAuthJson?.msg ||
        createAuthJson?.error_description ||
        createAuthJson?.error ||
        ""
      ).toLowerCase().includes("already");

    if (!createAuth.ok && !alreadyExists) {
      return res.status(createAuth.status || 500).json({
        error: "auth_create_failed",
        details: createAuthJson || null,
      });
    }

    const upsertProfile = await fetch(`${supabaseUrl}/rest/v1/app_users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify([{
        email,
        name,
        role,
        phone: phone || null,
        grade: grade || null,
        subject: subject || null,
        bus_number: bus_number || null,
        route: route || null,
      }]),
    });

    let upsertJson = null;
    try { upsertJson = await upsertProfile.json(); } catch {}
    if (!upsertProfile.ok) {
      return res.status(upsertProfile.status || 500).json({
        error: "profile_upsert_failed",
        details: upsertJson || null,
      });
    }

    return res.status(200).json({
      ok: true,
      alreadyExists,
    });
  } catch (err) {
    return res.status(500).json({
      error: "server_error",
      details: String(err?.message || err),
    });
  }
}
