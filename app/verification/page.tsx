import { Suspense } from "react";
import { VerificationClient } from "./verification-client";

export const metadata = {
  title: "Verify Your Email - DOECE",
  description: "Verify your campus email to complete your submission",
};

export default function VerificationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    }>
      <VerificationClient />
    </Suspense>
  );
}
