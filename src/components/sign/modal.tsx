"use client";

import * as React from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { SiGithub, SiGoogle } from "react-icons/si";

import { Button } from "@/components/ui/button";
import EmailAuthForm from "@/components/sign/email-form";
import { cn } from "@/lib/utils";
import { signIn } from "next-auth/react";
import { useAppContext } from "@/contexts/app";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useTranslations } from "next-intl";

type AuthMode = "sign-in" | "sign-up" | "forgot";

export default function SignModal() {
  const t = useTranslations();
  const { showSignModal, setShowSignModal } = useAppContext();
  const [authMode, setAuthMode] = React.useState<AuthMode>("sign-in");
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const title =
    authMode === "sign-up"
      ? t("sign_modal.sign_up_title")
      : authMode === "forgot"
        ? t("sign_modal.reset_password")
        : t("sign_modal.sign_in_title");
  const description =
    authMode === "sign-up"
      ? t("sign_modal.sign_up_description")
      : authMode === "forgot"
        ? t("sign_modal.forgot_description")
        : t("sign_modal.sign_in_description");

  function handleOpenChange(next: boolean) {
    setShowSignModal(next);
    if (!next) setAuthMode("sign-in");
  }

  if (isDesktop) {
    return (
      <Dialog open={showSignModal} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <ProfileForm open={showSignModal} mode={authMode} onModeChange={setAuthMode} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={showSignModal} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[92vh] overflow-y-auto">
        <DrawerHeader className="text-left">
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>
        <ProfileForm className="px-4" open={showSignModal} mode={authMode} onModeChange={setAuthMode} />
        <DrawerFooter className="pt-4">
          <DrawerClose asChild>
            <Button variant="outline">{t("sign_modal.cancel_title")}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function ProfileForm({
  className,
  open,
  mode,
  onModeChange,
}: React.ComponentProps<"form"> & {
  open: boolean;
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
}) {
  const t = useTranslations();
  const showGoogle = process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED === "true";
  const showGithub = process.env.NEXT_PUBLIC_AUTH_GITHUB_ENABLED === "true";
  const showOAuth = mode !== "forgot" && (showGoogle || showGithub);

  return (
    <div className={cn("grid items-start gap-4", className)}>
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
      {showOAuth ? (
        <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
          <span className="relative z-10 bg-background px-2 text-muted-foreground">{t("sign_modal.or")}</span>
        </div>
      ) : null}
      <EmailAuthForm
        key={open ? "open" : "closed"}
        onSignedIn={() => window.location.reload()}
        onModeChange={onModeChange}
      />
    </div>
  );
}
