import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { api, clearToken, getToken, setToken } from "./api";

type FeedItem = {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; email: string; name?: string | null };
  media?: { id: string; url: string; mimeType: string }[];
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
};

type Notification = {
  id: string;
  type: string;
  content: string;
  read: boolean;
  createdAt: string;
};

type User = {
  id: string;
  email: string;
  name?: string | null;
  _count?: { posts: number; followers: number; following: number };
};

export default function App() {
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [stateCode, setStateCode] = useState("CA");
  const [educationLevel, setEducationLevel] = useState("COLLEGE_PLUS");
  const [me, setMe] = useState<{ id: string; email: string } | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [postContent, setPostContent] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"feed" | "search" | "notifications">("feed");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ users: User[]; posts: FeedItem[] }>({ users: [], posts: [] });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState<Socket | null>(null);

  const loadMeAndFeed = async () => {
    try {
      setError(null);
      const meRes = await api.me();
      setMe(meRes.user);
      const feedRes = await api.feed({ take: 20, skip: 0 });
      setFeed(feedRes.items);
    } catch (e: any) {
      setError(e.message || "Failed to load");
    }
  };

  const loadNotifications = async () => {
    try {
      const res = await api.notifications();
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch (e: any) {
      console.error("Failed to load notifications:", e);
    }
  };

  useEffect(() => {
    if (getToken()) {
      loadMeAndFeed();
      loadNotifications();

      // Connect to WebSocket
      const newSocket = io("http://localhost:4000", {
        auth: { token: getToken() }
      });

      newSocket.on("notification", (notification: Notification) => {
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    }
  }, []);

  const handleAuth = async () => {
    setLoading(true);
    try {
      setError(null);
      if (authMode === "signup") {
        const res = await api.signup({ email, password, state: stateCode, educationLevel });
        setToken(res.token);
      } else {
        const res = await api.login({ email, password });
        setToken(res.token);
      }
      window.location.reload(); // Reload to establish WebSocket connection
    } catch (e: any) {
      setError(e.message || "Auth failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    setLoading(true);
    try {
      setError(null);
      const post = await api.createPost({ content: postContent });
      if (uploadFile) {
        await api.uploadPostMedia(post.id, uploadFile);
      }
      setPostContent("");
      setUploadFile(null);
      await loadMeAndFeed();
    } catch (e: any) {
      setError(e.message || "Failed to create post");
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (item: FeedItem) => {
    try {
      if (item.likedByMe) {
        await api.unlikePost(item.id);
      } else {
        await api.likePost(item.id);
      }
      await loadMeAndFeed();
    } catch (e: any) {
      setError(e.message || "Failed to like");
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const [usersRes, postsRes] = await Promise.all([
        api.searchUsers(searchQuery),
        api.searchPosts(searchQuery)
      ]);
      setSearchResults({ users: usersRes.users, posts: postsRes.posts });
    } catch (e: any) {
      setError(e.message || "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (userId: string) => {
    try {
      await api.follow(userId);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Failed to follow");
    }
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e: any) {
      console.error("Failed to mark as read:", e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e: any) {
      console.error("Failed to mark all as read:", e);
    }
  };

  const handleLogout = () => {
    socket?.disconnect();
    clearToken();
    setMe(null);
    setFeed([]);
    setNotifications([]);
  };

  return (
    <div className="container">
      <header className="header">
        <h1>⚖️ Esquire Social</h1>
        {me && (
          <div className="me">
            <span>{me.email}</span>
            <button onClick={handleLogout} className="secondary">Logout</button>
          </div>
        )}
      </header>

      {!getToken() && (
        <div className="card auth-card">
          <h2>{authMode === "signup" ? "Create Account" : "Sign In"}</h2>
          <div className="row">
            <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {authMode === "signup" && (
            <div className="row">
              <input
                placeholder="State (e.g., CA)"
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value.toUpperCase())}
                maxLength={2}
              />
              <select value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)}>
                <option value="GRADE_4_6">Grade 4-6</option>
                <option value="GRADE_7_8">Grade 7-8</option>
                <option value="GRADE_9_10">Grade 9-10</option>
                <option value="GRADE_11_12_GED">Grade 11-12/GED</option>
                <option value="COLLEGE_PLUS">College+</option>
              </select>
            </div>
          )}

          <div className="row">
            <button onClick={handleAuth} disabled={loading} className="primary-btn">
              {authMode === "signup" ? "Sign Up" : "Sign In"}
            </button>
            <button
              className="secondary"
              onClick={() => setAuthMode(authMode === "signup" ? "login" : "signup")}
            >
              {authMode === "signup" ? "Already have an account?" : "Need an account?"}
            </button>
          </div>
        </div>
      )}

      {getToken() && (
        <>
          <nav className="tabs">
            <button
              className={activeTab === "feed" ? "active" : ""}
              onClick={() => setActiveTab("feed")}
            >
              📰 Feed
            </button>
            <button
              className={activeTab === "search" ? "active" : ""}
              onClick={() => setActiveTab("search")}
            >
              🔍 Search
            </button>
            <button
              className={activeTab === "notifications" ? "active" : ""}
              onClick={() => { setActiveTab("notifications"); loadNotifications(); }}
            >
              🔔 Notifications {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
            </button>
          </nav>

          {activeTab === "feed" && (
            <>
              <div className="card">
                <h3>✍️ Create Post</h3>
                <textarea
                  placeholder="What's on your mind?"
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  rows={3}
                />
                <div className="row">
                  <input type="file" accept="image/*,video/*" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
                  <button onClick={handleCreatePost} disabled={loading || !postContent} className="primary-btn">
                    📤 Post
                  </button>
                </div>
              </div>

              <div className="feed">
                {feed.length === 0 && <p className="muted">No posts yet. Follow some users or create a post!</p>}
                {feed.map((item) => (
                  <div key={item.id} className="card post-card">
                    <div className="meta">
                      <strong>{item.user?.name || item.user?.email}</strong>
                      <span className="muted">{new Date(item.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="content">{item.content}</p>
                    {item.media && item.media.length > 0 && (
                      <div className="media">
                        {item.media.map((m) =>
                          m.mimeType.startsWith("video/") ? (
                            <video key={m.id} src={`http://localhost:4000${m.url}`} controls />
                          ) : (
                            <img key={m.id} src={`http://localhost:4000${m.url}`} alt="Post media" />
                          )
                        )}
                      </div>
                    )}
                    <div className="row actions">
                      <button onClick={() => handleLike(item)} className={item.likedByMe ? "liked" : ""}>
                        {item.likedByMe ? "❤️" : "🤍"} {item.likeCount}
                      </button>
                      <span className="muted">💬 {item.commentCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === "search" && (
            <div className="search-view">
              <div className="card">
                <h3>🔍 Search</h3>
                <div className="row">
                  <input
                    placeholder="Search users or posts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  />
                  <button onClick={handleSearch} disabled={loading || !searchQuery.trim()} className="primary-btn">
                    Search
                  </button>
                </div>
              </div>

              {searchResults.users.length > 0 && (
                <div className="card">
                  <h3>👥 Users</h3>
                  {searchResults.users.map((user) => (
                    <div key={user.id} className="user-result">
                      <div>
                        <strong>{user.name || user.email}</strong>
                        <span className="muted">
                          {user._count && ` • ${user._count.posts} posts • ${user._count.followers} followers`}
                        </span>
                      </div>
                      <button onClick={() => handleFollow(user.id)} className="secondary">
                        + Follow
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {searchResults.posts.length > 0 && (
                <div className="card">
                  <h3>📝 Posts</h3>
                  {searchResults.posts.map((post) => (
                    <div key={post.id} className="post-result">
                      <div className="meta">
                        <strong>{post.user?.name || post.user?.email}</strong>
                        <span className="muted">{new Date(post.createdAt).toLocaleString()}</span>
                      </div>
                      <p>{post.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {searchQuery && searchResults.users.length === 0 && searchResults.posts.length === 0 && (
                <p className="muted">No results found</p>
              )}
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="notifications-view">
              <div className="card">
                <div className="row">
                  <h3>🔔 Notifications</h3>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="secondary">
                      Mark all read
                    </button>
                  )}
                </div>
              </div>

              {notifications.length === 0 && <p className="muted">No notifications yet</p>}
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`card notification ${notif.read ? "read" : "unread"}`}
                  onClick={() => !notif.read && handleMarkNotificationRead(notif.id)}
                >
                  <p>{notif.content}</p>
                  <span className="muted">{new Date(notif.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {error && <div className="error">⚠️ {error}</div>}
    </div>
  );
}
