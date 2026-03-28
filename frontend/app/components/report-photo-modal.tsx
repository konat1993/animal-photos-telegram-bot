"use client";

import { ExternalLink } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatReportLocation } from "@/lib/location-display";
import { PHOTO_REPORT_PARAM } from "@/lib/report-photo-query";
import { colorForSpecies } from "@/lib/species-color";
import type { AnimalReport } from "@/lib/supabase";
import { cn, formatReportDateTime } from "@/lib/utils";

interface Props {
  reports: AnimalReport[];
}

export function ReportPhotoModal({ reports }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const photoReportId = searchParams.get(PHOTO_REPORT_PARAM);

  const resolved = useMemo(
    () =>
      photoReportId ? reports.find((r) => r.id === photoReportId) : undefined,
    [reports, photoReportId],
  );

  const placeLabel = useMemo(
    () => (resolved ? formatReportLocation(resolved) : null),
    [resolved],
  );

  const open = Boolean(photoReportId);

  const clearPhotoParam = useCallback(() => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete(PHOTO_REPORT_PARAM);
    const qs = p.toString();
    router.replace(qs ? `?${qs}` : "/", { scroll: false });
  }, [router, searchParams]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) clearPhotoParam();
    },
    [clearPhotoParam],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton
        className="max-h-[min(92vh,900px)] max-w-[min(96vw,56rem)] overflow-y-auto sm:max-w-[min(96vw,56rem)]"
      >
        {photoReportId &&
          (!resolved ? (
            <DialogHeader>
              <DialogTitle>Photo unavailable</DialogTitle>
              <DialogDescription>
                This report is not in the current list. Change or clear filters,
                or check the link.
              </DialogDescription>
            </DialogHeader>
          ) : !resolved.photo_url ? (
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/15"
                  style={{
                    backgroundColor: colorForSpecies(
                      resolved.identified_species,
                    ),
                  }}
                  aria-hidden
                />
                {resolved.identified_species}
              </DialogTitle>
              <DialogDescription className="space-y-2 text-left">
                <span className="block">
                  {formatReportDateTime(resolved.created_at)} — no photo for
                  this report.
                </span>
                {resolved.species_fact?.trim() ? (
                  <span className="border-border/60 block border-l-2 pl-2 text-sm leading-snug text-muted-foreground">
                    {resolved.species_fact.trim()}
                  </span>
                ) : null}
              </DialogDescription>
            </DialogHeader>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/15"
                    style={{
                      backgroundColor: colorForSpecies(
                        resolved.identified_species,
                      ),
                    }}
                    aria-hidden
                  />
                  {resolved.identified_species}
                </DialogTitle>
                <DialogDescription className="space-y-1.5 text-left text-sm text-muted-foreground">
                  <span className="block">
                    {formatReportDateTime(resolved.created_at)}
                  </span>
                  {placeLabel ? (
                    <span className="block">{placeLabel}</span>
                  ) : null}
                  <span className="block font-mono text-xs">
                    {resolved.latitude.toFixed(5)},{" "}
                    {resolved.longitude.toFixed(5)}
                  </span>
                  {resolved.species_fact?.trim() ? (
                    <span className="border-border/60 mt-2 block border-l-2 pl-2 text-sm leading-snug text-muted-foreground">
                      {resolved.species_fact.trim()}
                    </span>
                  ) : null}
                </DialogDescription>
              </DialogHeader>
              <div className="relative w-full overflow-hidden rounded-lg bg-muted">
                {/* Remote URLs (Supabase, etc.): avoid next/image domain config */}
                {/* biome-ignore lint/performance/noImgElement: dynamic third-party URLs */}
                <img
                  src={resolved.photo_url}
                  alt={`${resolved.identified_species} sighting`}
                  className="mx-auto max-h-[min(85vh,720px)] w-full object-contain"
                />
              </div>
              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <a
                  href={resolved.photo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({
                      variant: "outline",
                      size: "sm",
                    }),
                    "inline-flex gap-1.5 no-underline",
                  )}
                >
                  <ExternalLink className="size-3.5" />
                  Open in new tab
                </a>
              </div>
            </>
          ))}
      </DialogContent>
    </Dialog>
  );
}
