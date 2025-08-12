"use client";

import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Monitor, Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, useApi, useDebounce } from "@/contexts/AuthContext";
import toast from 'react-hot-toast';

interface SignInFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface ApiError {
  message: string;
  field?: string;
}

interface SignInResponse {
  success: boolean;
  message: string;
  data?: {
    user: {
      user_id: number;
      first_name: string;
      last_name: string;
      email: string;
      company: string;
      account_type: string;
    };
    token: string;
  };
  errors?: ApiError[];
}

export default function SignIn() {
  const router = useRouter();
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const api = useApi();

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<SignInFormData>({
    email: "",
    password: "",
    rememberMe: false,
  });

  // Removed useEffect that redirects to /dashboard when isAuthenticated changes
  // useEffect(() => {
  //   if (!authLoading && isAuthenticated) {
  //     router.push("/dashboard");
  //   }
  // }, [isAuthenticated, authLoading, router]);

  // Debounced email validation
  const debouncedEmailValidation = useDebounce(async (email: string) => {
    if (!email.trim()) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setFieldErrors((prev) => ({
        ...prev,
        email: "Please enter a valid email address",
      }));
    } else {
      setFieldErrors((prev) => {
        const { email: _, ...rest } = prev;
        return rest;
      });
    }
  }, 500);

  // Form validation
  const validateForm = useCallback((): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      errors.password = "Password is required";
    }

    return errors;
  }, [formData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === "checkbox" ? checked : value;

    setFormData((prev) => ({
      ...prev,
      [name]: fieldValue,
    }));

    // Clear errors when user starts typing
    setError("");
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const { [name]: _, ...rest } = prev;
        return rest;
      });
    }

    // Debounced email validation
    if (name === "email" && typeof fieldValue === "string") {
      debouncedEmailValidation(fieldValue);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setFieldErrors({});

    // Validate all fields
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.post("/users/signin", {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      // Accept backend response with user and token at root
      if (response.user && response.token) {
        await login(response.token, response.user);
        toast.success("Signed in successfully!");
        router.push("/dashboard");
        return;
      }
    } catch (error: any) {
      console.error("Signin error:", error);

      // Handle specific error types
      if (error.message.includes("Invalid")) {
        setError("Invalid email or password");
      } else if (error.message.includes("Network")) {
        setError("Network error. Please check your connection and try again.");
      } else {
        setError(error.message || "An error occurred during sign in");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<{ url: string }>("/google/auth");
      window.location.href = response.url;
    } catch (error: any) {
      setError("Failed to initiate Google login");
      setIsLoading(false);
    }
  };

  // Handle OAuth callback
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const error = urlParams.get("error");

      if (error) {
        setError("Authentication was cancelled or failed");
        return;
      }

      if (code) {
        try {
          setIsLoading(true);
          const response = await api.post<SignInResponse>("/auth/callback", {
            code,
          });

          if (response.data?.user && response.data?.token) {
            await login(response.data.token, response.data.user);
          }
        } catch (error: any) {
          console.error("OAuth callback error:", error);
          setError("Authentication failed. Please try again.");
        } finally {
          setIsLoading(false);
        }
      }
    };

    handleOAuthCallback();
  }, [api, login]);

  // Show loading spinner while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Don't render if already authenticated (prevents flash)
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center space-x-2 mb-6">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Monitor className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-semibold text-gray-900">
              LineLink
            </span>
          </Link>
          <h2 className="text-3xl font-bold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-gray-600">
            Or{" "}
            <Link href="/signup" className="text-blue-600 hover:text-blue-500">
              create a new account
            </Link>
          </p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-center text-lg">Welcome back</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email address
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email"
                  required
                  className={`h-11 ${fieldErrors.email ? "border-red-500 focus:ring-red-500" : ""
                    }`}
                  disabled={isLoading}
                />
                {fieldErrors.email && (
                  <p className="text-red-600 text-sm mt-1">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter your password"
                    required
                    className={`h-11 pr-10 ${fieldErrors.password
                      ? "border-red-500 focus:ring-red-500"
                      : ""
                      }`}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-red-600 text-sm mt-1">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="rememberMe"
                    name="rememberMe"
                    type="checkbox"
                    checked={formData.rememberMe}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={isLoading}
                  />
                  <label
                    htmlFor="rememberMe"
                    className="ml-2 block text-sm text-gray-700"
                  >
                    Remember me
                  </label>
                </div>

                <Link
                  href="/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  Forgot password?
                </Link>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              <Button
                disabled={isLoading}
                type="submit"
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <Button
                  variant="outline"
                  className="w-full h-11 bg-transparent"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  type="button"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
