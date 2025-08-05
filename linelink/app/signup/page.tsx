"use client";

import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Monitor,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Loader2,
  Check,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, useApi, useDebounce } from "@/contexts/AuthContext";
import toast from 'react-hot-toast';

interface SignUpFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  company: string;
  terms: boolean;
}

interface ApiError {
  message: string;
  field?: string;
}

interface SignUpResponse {
  success: boolean;
  message: string;
  token?: string;
  data?: {
    user: {
      user_id: number;
      first_name: string;
      last_name: string;
      email: string;
      company: string;
      account_type: string;
    };
  };
  errors?: ApiError[];
}

interface PasswordStrength {
  score: number;
  requirements: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
}

export default function SignUp() {
  const router = useRouter();
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const api = useApi();

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<SignUpFormData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    company: "",
    terms: false,
  });

  // Password strength calculation
  const calculatePasswordStrength = useCallback(
    (password: string): PasswordStrength => {
      const requirements = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /\d/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      };

      const score = Object.values(requirements).filter(Boolean).length;

      return { score, requirements };
    },
    []
  );

  // Debounced password validation
  const debouncedPasswordValidation = useDebounce((password: string) => {
    if (!password) return;

    const strength = calculatePasswordStrength(password);
    if (strength.score < 5) {
      const missing: string[] = [];
      if (!strength.requirements.length) missing.push("8+ characters");
      if (!strength.requirements.uppercase) missing.push("uppercase letter");
      if (!strength.requirements.lowercase) missing.push("lowercase letter");
      if (!strength.requirements.number) missing.push("number");
      if (!strength.requirements.special) missing.push("special character");

      setFieldErrors((prev) => ({
        ...prev,
        password: `Password must include: ${missing.join(", ")}`,
      }));
    } else {
      setFieldErrors((prev) => {
        const { password: _, ...rest } = prev;
        return rest;
      });
    }
  }, 500);

  // Real-time field validation
  const validateField = useCallback((name: string, value: string | boolean) => {
    let error = "";

    switch (name) {
      case "firstName":
      case "lastName":
      case "company":
        if (typeof value === "string" && value.trim().length < 2) {
          error = `${name.charAt(0).toUpperCase() + name.slice(1)
            } must be at least 2 characters`;
        }
        break;
      case "email":
        if (typeof value === "string") {
          if (!value.trim()) {
            error = "Email is required";
          } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            error = "Please enter a valid email address";
          }
        }
        break;
    }

    if (error) {
      setFieldErrors((prev) => ({ ...prev, [name]: error }));
    } else {
      setFieldErrors((prev) => {
        const { [name]: _, ...rest } = prev;
        return rest;
      });
    }
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const fieldValue =
      type === "checkbox" ? (e.target as HTMLInputElement).checked : value;

    setFormData((prev) => ({
      ...prev,
      [name]: fieldValue,
    }));

    // Clear general errors
    setError("");

    // Real-time validation for specific fields
    if (name === "email" && typeof fieldValue === "string") {
      validateField(name, fieldValue);
    } else if (name === "password" && typeof fieldValue === "string") {
      debouncedPasswordValidation(fieldValue);
    } else {
      validateField(name, fieldValue);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    validateField(name, value);
  };

  const validateForm = useCallback((): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!formData.firstName.trim()) errors.firstName = "First name is required";
    if (!formData.lastName.trim()) errors.lastName = "Last name is required";
    if (!formData.email.trim()) errors.email = "Email is required";
    if (!formData.password) errors.password = "Password is required";
    if (!formData.company.trim()) errors.company = "Company name is required";
    if (!formData.terms)
      errors.terms = "You must agree to the terms and conditions";

    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }

    // Password strength validation
    if (formData.password) {
      const strength = calculatePasswordStrength(formData.password);
      if (strength.score < 5) {
        errors.password = "Password does not meet security requirements";
      }
    }

    return errors;
  }, [formData, calculatePasswordStrength]);

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
      const response = await api.post("/users/signup", {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        company: formData.company.trim(),
      });

      // Success: backend returns user_id
      if (response.user_id) {
        toast.success("Signup successful! Please sign in.");
        router.push("/signin");
        return;
      }

      if (response.data?.user && response.token) {
        await login(response.token, response.data.user);
        router.push("/dashboard");
      }
    } catch (error: any) {
      console.error("Signup error:", error);

      if (error.message && error.message.includes("already exists")) {
        setFieldErrors({ email: "Email is already registered" });
      } else if (error.message && error.message.includes("Network")) {
        setError("Network error. Please check your connection and try again.");
      } else {
        setError(error.message || "An error occurred during signup");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<{ url: string }>("/auth/google");
      window.location.href = response.url;
    } catch (error: any) {
      setError("Failed to initiate Google signup");
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
          const response = await api.post<SignUpResponse>("/auth/callback", {
            code,
          });
          if (response.data?.user && response.token) {
            await login(response.token, response.data.user);
            router.push("/dashboard");
          } else {
            setError("Invalid response from server");
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
  }, [api, login, router]);

  const getPasswordStrengthColor = () => {
    if (!formData.password) return "bg-gray-200";
    const strength = calculatePasswordStrength(formData.password);
    if (strength.score === 5) return "bg-green-500";
    if (strength.score >= 3) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getPasswordStrengthText = () => {
    if (!formData.password) return "";
    const strength = calculatePasswordStrength(formData.password);
    if (strength.score === 5) return "Strong password";
    if (strength.score >= 3) return "Medium strength";
    return "Weak password";
  };

  const passwordStrength = calculatePasswordStrength(formData.password);

  // Show loading spinner while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Don't render if already authenticated
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
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
            Create your account
          </h2>
          <p className="mt-2 text-gray-600">
            Already have an account?{" "}
            <Link href="/signin" className="text-blue-600 hover:text-blue-500">
              Sign in
            </Link>
          </p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-center text-lg">
              Get started with LineLink
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="firstName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    First name
                  </label>
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    placeholder="John"
                    required
                    className={`h-11 ${fieldErrors.firstName
                      ? "border-red-500 focus:ring-red-500"
                      : ""
                      }`}
                    disabled={isLoading}
                  />
                  {fieldErrors.firstName && (
                    <p className="mt-1 text-sm text-red-600">
                      {fieldErrors.firstName}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="lastName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Last name
                  </label>
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    placeholder="Doe"
                    required
                    className={`h-11 ${fieldErrors.lastName
                      ? "border-red-500 focus:ring-red-500"
                      : ""
                      }`}
                    disabled={isLoading}
                  />
                  {fieldErrors.lastName && (
                    <p className="mt-1 text-sm text-red-600">
                      {fieldErrors.lastName}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email address
                </label>
                <div className="relative">
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    placeholder="john@company.com"
                    required
                    className={`h-11 ${fieldErrors.email ? "border-red-500 focus:ring-red-500" : ""
                      }`}
                    disabled={isLoading}
                  />

                </div>
              </div>


              <div>
                <label
                  htmlFor="company"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Company name
                </label>
                <Input
                  id="company"
                  name="company"
                  type="text"
                  value={formData.company}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  placeholder="Your company"
                  required
                  className={`h-11 ${fieldErrors.company
                    ? "border-red-500 focus:ring-red-500"
                    : ""
                    }`}
                  disabled={isLoading}
                />
                {fieldErrors.company && (
                  <p className="mt-1 text-sm text-red-600">
                    {fieldErrors.company}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="accountType"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Account type
                </label>
                <select
                  id="accountType"
                  name="accountType"
                  value="business" // Default value
                  onChange={handleInputChange}
                  className="h-11 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                >
                  <option value="business">Business</option>
                  <option value="personal">Personal</option>
                  <option value="enterprise">Enterprise</option>
                </select>
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
                    onBlur={handleBlur}
                    placeholder="Create a strong password"
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

                {/* Password strength indicator */}
                {formData.password && (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                          style={{
                            width: `${(passwordStrength.score / 5) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-600">
                        {getPasswordStrengthText()}
                      </span>
                    </div>

                    {/* Password requirements checklist */}
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div
                        className={`flex items-center space-x-1 ${passwordStrength.requirements.length
                          ? "text-green-600"
                          : "text-gray-400"
                          }`}
                      >
                        {passwordStrength.requirements.length ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        <span>8+ characters</span>
                      </div>
                      <div
                        className={`flex items-center space-x-1 ${passwordStrength.requirements.uppercase
                          ? "text-green-600"
                          : "text-gray-400"
                          }`}
                      >
                        {passwordStrength.requirements.uppercase ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        <span>Uppercase</span>
                      </div>
                      <div
                        className={`flex items-center space-x-1 ${passwordStrength.requirements.lowercase
                          ? "text-green-600"
                          : "text-gray-400"
                          }`}
                      >
                        {passwordStrength.requirements.lowercase ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        <span>Lowercase</span>
                      </div>
                      <div
                        className={`flex items-center space-x-1 ${passwordStrength.requirements.number
                          ? "text-green-600"
                          : "text-gray-400"
                          }`}
                      >
                        {passwordStrength.requirements.number ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        <span>Number</span>
                      </div>
                      <div
                        className={`flex items-center space-x-1 ${passwordStrength.requirements.special
                          ? "text-green-600"
                          : "text-gray-400"
                          }`}
                      >
                        {passwordStrength.requirements.special ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        <span>Special char</span>
                      </div>
                    </div>
                  </div>
                )}

                {fieldErrors.password && (
                  <p className="mt-1 text-sm text-red-600">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <div className="flex items-start">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  checked={formData.terms}
                  onChange={handleInputChange}
                  required
                  className={`mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${fieldErrors.terms ? "border-red-500" : ""
                    }`}
                  disabled={isLoading}
                />
                <label
                  htmlFor="terms"
                  className="ml-2 block text-sm text-gray-700"
                >
                  I agree to the{" "}
                  <Link
                    href="/terms"
                    className="text-blue-600 hover:text-blue-500"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy"
                    className="text-blue-600 hover:text-blue-500"
                  >
                    Privacy Policy
                  </Link>
                </label>
              </div>
              {fieldErrors.terms && (
                <p className="text-sm text-red-600">{fieldErrors.terms}</p>
              )}

              <Button
                type="submit"
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading || Object.keys(fieldErrors).length > 0}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create account"
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
                  onClick={handleGoogleSignup}
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

            <div className="mt-6 space-y-2">
              <div className="flex items-center text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                <span>30-day free trial</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
