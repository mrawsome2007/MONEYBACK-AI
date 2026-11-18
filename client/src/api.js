async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Request failed (${response.status})`);
  }
  return payload;
}

export async function extractDocument(file) {
  const body = new FormData();
  body.append("document", file);
  return request("/extract", { method: "POST", body });
}

export async function generateMessage(details) {
  return request("/generate-message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(details)
  });
}

export async function getHealth() {
  return request("/health");
}
