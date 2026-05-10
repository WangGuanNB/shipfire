"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePathname, useRouter } from "@/i18n/navigation";
import { FormEvent, useEffect, useState } from "react";

export type AdminOrdersFilterDefaults = {
  email?: string;
  status?: string;
  pay_type?: string;
  product_name?: string;
  created_from?: string;
  created_to?: string;
};

function buildQuery(values: AdminOrdersFilterDefaults) {
  const q = new URLSearchParams();
  const set = (k: keyof AdminOrdersFilterDefaults, v: string) => {
    const t = v.trim();
    if (t) q.set(k, t);
  };
  set("email", values.email ?? "");
  set("status", values.status ?? "");
  set("pay_type", values.pay_type ?? "");
  set("product_name", values.product_name ?? "");
  set("created_from", values.created_from ?? "");
  set("created_to", values.created_to ?? "");
  return q;
}

export default function AdminOrdersFilter({
  defaults,
}: {
  defaults: AdminOrdersFilterDefaults;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState(defaults.email ?? "");
  const [status, setStatus] = useState(defaults.status ?? "");
  const [payType, setPayType] = useState(defaults.pay_type ?? "");
  const [productName, setProductName] = useState(defaults.product_name ?? "");
  const [createdFrom, setCreatedFrom] = useState(defaults.created_from ?? "");
  const [createdTo, setCreatedTo] = useState(defaults.created_to ?? "");

  useEffect(() => {
    setEmail(defaults.email ?? "");
    setStatus(defaults.status ?? "");
    setPayType(defaults.pay_type ?? "");
    setProductName(defaults.product_name ?? "");
    setCreatedFrom(defaults.created_from ?? "");
    setCreatedTo(defaults.created_to ?? "");
  }, [defaults]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const q = buildQuery({
      email,
      status,
      pay_type: payType,
      product_name: productName,
      created_from: createdFrom,
      created_to: createdTo,
    });
    const qs = q.toString();
    if (!qs) {
      return;
    }
    router.push(`${pathname}?${qs}` as any);
  }

  function onClear() {
    setEmail("");
    setStatus("");
    setPayType("");
    setProductName("");
    setCreatedFrom("");
    setCreatedTo("");
    router.push(pathname as any);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mb-6 w-full rounded-lg border border-border/60 bg-muted/20 p-4"
    >
      <p className="mb-3 text-sm text-muted-foreground">
        至少填写一项后点击 Search；默认不加载订单数据。
      </p>
      <div className="flex w-full max-w-full flex-nowrap items-end gap-2 overflow-x-auto pb-1 [scrollbar-gutter:stable]">
        <div className="flex w-36 shrink-0 flex-col gap-1">
          <Label htmlFor="admin-order-email" className="text-xs">
            Email
          </Label>
          <Input
            id="admin-order-email"
            type="search"
            placeholder="Email…"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-8 text-sm"
            autoComplete="off"
          />
        </div>
        <div className="flex w-24 shrink-0 flex-col gap-1">
          <Label htmlFor="admin-order-status" className="text-xs">
            Status
          </Label>
          <select
            id="admin-order-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="flex h-8 w-full max-w-full rounded-md border border-input bg-transparent px-1.5 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          >
            <option value="">Any</option>
            <option value="created">created</option>
            <option value="paid">paid</option>
            <option value="deleted">deleted</option>
          </select>
        </div>
        <div className="flex w-28 shrink-0 flex-col gap-1">
          <Label htmlFor="admin-order-pay" className="text-xs">
            Pay Type
          </Label>
          <Input
            id="admin-order-pay"
            placeholder="Pay…"
            value={payType}
            onChange={(e) => setPayType(e.target.value)}
            className="h-8 text-sm"
            autoComplete="off"
          />
        </div>
        <div className="flex w-32 shrink-0 flex-col gap-1">
          <Label htmlFor="admin-order-product" className="text-xs">
            Product
          </Label>
          <Input
            id="admin-order-product"
            placeholder="Name…"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            className="h-8 text-sm"
            autoComplete="off"
          />
        </div>
        <div className="flex w-[8.75rem] shrink-0 flex-col gap-1">
          <Label htmlFor="admin-order-from" className="text-xs">
            From
          </Label>
          <Input
            id="admin-order-from"
            type="date"
            value={createdFrom}
            onChange={(e) => setCreatedFrom(e.target.value)}
            className="h-8 px-1 text-sm"
          />
        </div>
        <div className="flex w-[8.75rem] shrink-0 flex-col gap-1">
          <Label htmlFor="admin-order-to" className="text-xs">
            To
          </Label>
          <Input
            id="admin-order-to"
            type="date"
            value={createdTo}
            onChange={(e) => setCreatedTo(e.target.value)}
            className="h-8 px-1 text-sm"
          />
        </div>
        <div className="flex shrink-0 items-center gap-2 pb-px">
          <Button type="submit" size="sm" className="h-8 shrink-0">
            Search
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0"
            onClick={onClear}
          >
            Clear
          </Button>
        </div>
      </div>
    </form>
  );
}
