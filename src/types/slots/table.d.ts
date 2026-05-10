import { ReactNode } from "react";
import { TableColumn } from "@/types/blocks/table";
import { Slot } from "@/types/slots/base";

export interface Table extends Slot {
  columns?: TableColumn[];
  empty_message?: string;
  /** Optional controls rendered below the page title (e.g. admin list filters). */
  filters?: ReactNode;
}
