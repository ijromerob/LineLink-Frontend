"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useRef,
} from "react";
import { useRouter } from "next/navigation";

interface User {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  company: string;
  account_type: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (token: string, userData: User) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook for debounced API calls
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    ((...args: Parameters<T>) => {
      clearTimeout(timeoutRef.current as unknown as number);
      timeoutRef.current = setTimeout(() => callback(...args), delay);
    }) as T,
    [callback, delay]
  );
}

// API client with automatic token handling
class ApiClient {
  private static instance: ApiClient;
  private baseURL = "https://linelink-backend.onrender.com/api";
  // private refreshPromise: Promise<boolean> | null = null;

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const token = typeof window !== 'undefined'
      ? localStorage.getItem('authToken')
      : null;

    // Prepare headers
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const config: RequestInit = {
      credentials: "include",
      ...options,
      headers,
    };

    let response = await fetch(url, config);

    // // Handle token expiration
    // if (response.status === 401 && endpoint !== "/auth/refresh") {
    //   const refreshed = await this.handleTokenRefresh();
    //   if (refreshed) {
    //     // Retry the original request
    //     response = await fetch(url, config);
    //   } else {
    //     // Refresh failed, redirect to login
    //     window.location.href = "/signin";
    //     throw new Error("Authentication failed");
    //   }
    // }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // private async handleTokenRefresh(): Promise<boolean> {
  //   if (this.refreshPromise) {
  //     return this.refreshPromise;
  //   }

  //   this.refreshPromise = this.performTokenRefresh();
  //   const result = await this.refreshPromise;
  //   this.refreshPromise = null;
  //   return result;
  // }

  // private async performTokenRefresh(): Promise<boolean> {
  //   try {
  //     const response = await fetch(`${this.baseURL}/auth/refresh`, {
  //       method: "POST",
  //       credentials: "include",
  //     });

  //     return response.ok;
  //   } catch (error) {
  //     console.error("Token refresh failed:", error);
  //     return false;
  //   }
  // }

  async get<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  async post<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

// Token management utilities
class TokenManager {
  private static refreshTimer: NodeJS.Timeout | null = null;
  private static readonly REFRESH_INTERVAL = 14 * 60 * 1000; // 14 minutes

  static startAutoRefresh(refreshCallback: () => Promise<boolean>) {
    this.stopAutoRefresh();

    this.refreshTimer = setInterval(async () => {
      try {
        const success = await refreshCallback();
        if (!success) {
          this.stopAutoRefresh();
          // Force logout on refresh failure
          window.dispatchEvent(new CustomEvent("auth:logout"));
        }
      } catch (error) {
        console.error("Auto refresh failed:", error);
        this.stopAutoRefresh();
        window.dispatchEvent(new CustomEvent("auth:logout"));
      }
    }, this.REFRESH_INTERVAL);
  }

  static stopAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  static async validateSession(): Promise<boolean> {
    try {
      const api = ApiClient.getInstance();
      await api.get("/auth/validate");
      return true;
    } catch (error) {
      return false;
    }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const api = ApiClient.getInstance();

  // Initialize auth state
  useEffect(() => {
    initializeAuth();
  }, []);

  // Handle custom logout events
  useEffect(() => {
    const handleLogout = () => logout();
    window.addEventListener("auth:logout", handleLogout);

    return () => {
      window.removeEventListener("auth:logout", handleLogout);
    };
  }, []);

  const initializeAuth = async () => {
    try {
      setLoading(true);

      // Check if we have a valid session
      const isValid = await TokenManager.validateSession();

      if (isValid) {
        // Get current user data
        const userData = await api.get<{ data: User }>("/users/me");
        setUser(userData.data);
        setIsAuthenticated(true);
        // Start auto-refresh
        // TokenManager.startAutoRefresh(refreshToken);
      } else {
        // No valid session, just update the state without redirecting
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Auth initialization failed:", error);
      // Don't redirect on error, just update the state
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = useCallback(
    async (token: string, userData: User) => {
      try {
        // Store token in localStorage
        localStorage.setItem("authToken", token);
        localStorage.setItem("user", JSON.stringify(userData));
        
        // Also store token in a cookie for server-side access
        const expires = new Date();
        expires.setDate(expires.getDate() + 7); // 7 days expiration
        document.cookie = `authToken=${token}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
        
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Login error:", error);
        setError("Failed to complete login");
      }
    },
    [router]
  );

  // const refreshToken = useCallback(async (): Promise<boolean> => {
  //   try {
  //     await api.post("/auth/refresh");
  //     return true;
  //   } catch (error) {
  //     console.error("Token refresh failed:", error);
  //     return false;
  //   }
  // }, [api]);

  const logout = useCallback(async (redirectToSignIn: boolean = true) => {
    try {
      console.log("Logging out...");
      // Clear localStorage
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      
      // Clear the auth cookie by setting it to expire in the past
      document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
      
      if (redirectToSignIn) {
        router.push("/signin");
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        logout,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );

}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Export the API client for use in components
export const useApi = () => {
  return ApiClient.getInstance();
};