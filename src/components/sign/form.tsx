"use client";

import { useState } from "react";
import { SiGithub, SiGoogle } from "react-icons/si";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import EmailAuthForm from "@/components/sign/email-form";
import { cn } from "@/lib/utils";

type AuthMode = "sign-in" | "sign-up" | "forgot";

export default function SignForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const t = useTranslations();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const showGoogle = process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED === "true";
  const showGithub = process.env.NEXT_PUBLIC_AUTH_GITHUB_ENABLED === "true";
  const title =
    mode === "sign-up"
      ? t("sign_modal.sign_up_title")
      : mode === "forgot"
        ? t("sign_modal.reset_password")
        : t("sign_modal.sign_in_title");
  const description =
    mode === "sign-up"
      ? t("sign_modal.sign_up_description")
      : mode === "forgot"
        ? t("sign_modal.forgot_description")
        : t("sign_modal.sign_in_description");

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {mode !== "forgot" && showGoogle && (
              <Button variant="outline" className="w-full" onClick={() => signIn("google")}>
                <SiGoogle className="w-4 h-4" />
                {t("sign_modal.google_sign_in")}
              </Button>
            )}
            {mode !== "forgot" && showGithub && (
              <Button variant="outline" className="w-full" onClick={() => signIn("github")}>
                <SiGithub className="w-4 h-4" />
                {t("sign_modal.github_sign_in")}
              </Button>
            )}
            {mode !== "forgot" && (showGoogle || showGithub) ? (
              <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
                <span className="relative z-10 bg-background px-2 text-muted-foreground">{t("sign_modal.or")}</span>
              </div>
            ) : null}
            <EmailAuthForm onModeChange={setMode} />
          </div>
        </CardContent>
      </Card>
      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
        By clicking continue, you agree to our{" "}
        <a href="/terms-of-service" target="_blank">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="/privacy-policy" target="_blank">
          Privacy Policy
        </a>
        .
      </div>
    </div>
  );
}
