const AGENT_URL =
  process.env.LEGAL_AGENT_URL ||
  "https://myjurisagent-dec-1008791897094.us-east1.run.app";

const routes = {
  "/api/session": "/apps/app/users/web-user-01/sessions",
  "/api/run": "/run",
};

export default async (request) => {
  const pathname = new URL(request.url).pathname;
  const target = routes[pathname];

  if (request.method !== "POST" || !target) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const body = await request.text();
    const upstream = await fetch(`${AGENT_URL}${target}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body || undefined,
    });

    return new Response(await upstream.arrayBuffer(), {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") || "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json(
      { error: "Juris Copilot service is unavailable. Please try again." },
      { status: 502 }
    );
  }
};

export const config = {
  path: "/api/*",
};