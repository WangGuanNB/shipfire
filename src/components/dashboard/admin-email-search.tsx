"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePathname, useRouter } from "@/i18n/navigation";
import { FormEvent, useEffect, useState } from "react";

export default function AdminEmailSearch({
  defaultEmail = "",
}: {
  defaultEmail?: string;
}) {
  const [email, setEmail] = useState(defaultEmail);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setEmail(defaultEmail);
  }, [defaultEmail]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const q = new URLSearchParams();
    const trimmed = email.trim();
    if (trimmed) q.set("email", trimmed);
    const qs = q.toString();
    router.push((qs ? `${pathname}?${qs}` : pathname) as any);
  }

  function onClear() {
    setEmail("");
    router.push(pathname as any);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-wrap items-center gap-2 mb-6"
    >
      <Input
        type="search"
        placeholder="Search by email…"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="max-w-sm"
        name="email"
        autoComplete="off"
      />
      <Button type="submit" size="sm">
        Search
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onClear}>
        Clear
      </Button>
    </form>
  );
}
