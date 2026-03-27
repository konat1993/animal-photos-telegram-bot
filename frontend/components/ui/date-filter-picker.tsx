"use client";

import { format, isValid, parseISO } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import * as React from "react";

import { buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function parseYMD(s: string | undefined): Date | undefined {
  if (!s) return undefined;
  const d = parseISO(`${s}T12:00:00`);
  return isValid(d) ? d : undefined;
}

export function DateFilterPicker({
  value,
  onChange,
  placeholder,
  id,
  className,
}: {
  value?: string;
  onChange: (ymd: string) => void;
  placeholder: string;
  id?: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = parseYMD(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        type="button"
        className={cn(
          buttonVariants({ variant: "outline", size: "default" }),
          "w-[160px] justify-start text-left font-normal shrink-0",
          !value && "text-muted-foreground",
          className,
        )}
      >
        <CalendarIcon className="size-4 opacity-70" />
        {selected ? format(selected, "d MMM yyyy") : <span>{placeholder}</span>}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(d) => {
            onChange(d ? format(d, "yyyy-MM-dd") : "");
            setOpen(false);
          }}
          captionLayout="dropdown"
          fromYear={2020}
          toYear={new Date().getFullYear() + 1}
        />
      </PopoverContent>
    </Popover>
  );
}
