const API_URL =
  (import.meta as any).env?.VITE_API_URL || "https://esquire-api.onrender.com";

export type AuthResponse = {
  token: string;
  user: { id: string; email: string; name?: string | null; state?: string | null; educationLevel?: string | null };
};

export function getToken() {
  return localStorage.getItem("token");
}

export function setToken(token: string) {
  localStorage.setItem("token", token);
}

export function clearToken() {
  localStorage.removeItem("token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export const api = {
  signup: (data: { email: string; password: string; state: string; educationLevel: string }) =>
    request<AuthResponse>("/auth/signup", { method: "POST", body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  me: () => request<{ user: { id: string; email: string; name?: string | null } }>("/me"),

  feed: (params?: { take?: number; skip?: number }) => {
    const query = new URLSearchParams();
    if (params?.take) query.set("take", String(params.take));
    if (params?.skip) query.set("skip", String(params.skip));
    const qs = query.toString();
    return request<{ items: any[]; take: number; skip: number }>(`/feed/posts${qs ? `?${qs}` : ""}`);
  },
  createPost: (data: { content: string }) =>
    request<any>("/feed/posts", { method: "POST", body: JSON.stringify(data) }),
  likePost: (id: string) => request<any>(`/feed/posts/${id}/like`, { method: "POST" }),
  unlikePost: (id: string) => request<any>(`/feed/posts/${id}/like`, { method: "DELETE" }),
  comment: (id: string, data: { content: string }) =>
    request<any>(`/feed/posts/${id}/comments`, { method: "POST", body: JSON.stringify(data) }),

  follow: (userId: string) => request<any>(`/social/follow/${userId}`, { method: "POST" }),
  unfollow: (userId: string) => request<any>(`/social/follow/${userId}`, { method: "DELETE" }),
  following: () => request<any[]>("/social/following"),
  followers: () => request<any[]>("/social/followers"),

  uploadPostMedia: (postId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<any>(`/uploads/posts/${postId}`, { method: "POST", body: form });
  },

  searchUsers: (query: string) => request<{ users: any[] }>(`/search/users?q=${encodeURIComponent(query)}`),
  searchPosts: (query: string) => request<{ posts: any[] }>(`/search/posts?q=${encodeURIComponent(query)}`),

  notifications: () => request<{ notifications: any[]; unreadCount: number }>("/notifications"),
  markNotificationRead: (id: string) => request<any>(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllNotificationsRead: () => request<any>("/notifications/read-all", { method: "POST" }),
  deleteNotification: (id: string) => request<any>(`/notifications/${id}`, { method: "DELETE" })
};
