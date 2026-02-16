export async function logoutSession(signal?: AbortSignal): Promise<Response> {
  return fetch("/api/logout", {
    method: "POST",
    credentials: "include",
    signal,
  });
}
