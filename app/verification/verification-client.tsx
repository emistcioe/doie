"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, CheckCircle2, Mail, Loader2 } from "lucide-react";
import Link from "next/link";

type VerificationStatus = "pending" | "verifying" | "success" | "error";

export function VerificationClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const email = searchParams.get("email") || "";
  const name = searchParams.get("name") || "";
  const type = searchParams.get("type") || "project";
  const sessionId = searchParams.get("session") || "";
  
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [status, setStatus] = useState<VerificationStatus>("pending");
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const purpose = type === "research" 
    ? "research_submission" 
    : type === "journal" 
    ? "journal_submission" 
    : "project_submission";

  const returnPath = type === "research" 
    ? "/submit-research" 
    : type === "journal" 
    ? "/submit-journal" 
    : "/submit-project";

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleInputChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, "").slice(-1);
    
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setError("");

    // Auto-focus next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pastedData) {
      const newOtp = [...otp];
      for (let i = 0; i < pastedData.length && i < 6; i++) {
        newOtp[i] = pastedData[i];
      }
      setOtp(newOtp);
      // Focus the next empty input or the last one
      const nextIndex = Math.min(pastedData.length, 5);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    setStatus("verifying");
    setError("");

    try {
      const response = await fetch("/api/submissions/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp_code: code,
          session_id: sessionId,
          purpose,
        }),
      });
      
      const data = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        throw new Error(data?.detail || data?.error || "Invalid verification code");
      }

      setStatus("success");
      
      // Store verification in sessionStorage for the form to pick up
      sessionStorage.setItem("verification_complete", JSON.stringify({
        email,
        sessionId,
        purpose,
        verifiedAt: Date.now(),
      }));

      // Redirect back after a brief moment
      setTimeout(() => {
        router.push(returnPath + "?verified=true");
      }, 2000);
      
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Verification failed");
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError("");
    
    try {
      const response = await fetch("/api/submissions/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, full_name: name, purpose }),
      });
      
      const data = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        throw new Error(data?.detail || data?.error || "Failed to resend code");
      }

      // Update session ID if a new one is returned
      if (data.session_id || data.sessionId) {
        const newSessionId = data.session_id || data.sessionId;
        // Update URL with new session ID
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set("session", newSessionId);
        window.history.replaceState({}, "", newUrl.toString());
      }

      setCountdown(60);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend code");
    } finally {
      setResending(false);
    }
  };

  if (!email || !sessionId) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-muted-foreground">Invalid verification link.</p>
            <Button variant="outline" asChild>
              <Link href="/">Go to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Email Verified!</h2>
            <p className="text-muted-foreground">
              Your email has been verified successfully. Redirecting you back...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Button variant="ghost" size="sm" className="mb-4 text-muted-foreground hover:text-foreground" asChild>
          <Link href={returnPath}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>

        <Card>
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Verify your email</CardTitle>
            <CardDescription className="mt-2">
              We sent a 6-digit code to<br />
              <span className="font-medium text-foreground">{email}</span>
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* OTP Input */}
            <div className="flex justify-center gap-2" onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <Input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-12 text-center text-lg font-semibold"
                  disabled={status === "verifying"}
                />
              ))}
            </div>

            {error && (
              <p className="text-sm text-red-600 text-center">{error}</p>
            )}

            <Button 
              onClick={handleVerify} 
              className="w-full" 
              disabled={status === "verifying" || otp.join("").length !== 6}
            >
              {status === "verifying" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify Email"
              )}
            </Button>

            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Didn't receive the code?
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResend}
                disabled={resending || countdown > 0}
              >
                {resending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : countdown > 0 ? (
                  `Resend in ${countdown}s`
                ) : (
                  "Resend code"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="mt-4 text-xs text-muted-foreground text-center">
          Make sure to check your spam folder if you don't see the email.
        </p>
      </div>
    </div>
  );
}
