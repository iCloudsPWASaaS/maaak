"use client";

import { Camera } from "lucide-react";
import { WatermarkedPhoto } from "@/components/SecurityProtectionLayer";

export type ProfilePhoto = {
  id: string;
  url: string;
  isPrimary?: boolean;
  watermark?: string;
};

export default function PhotosPanel({
  photos,
  name,
}: {
  photos: ProfilePhoto[];
  name: string;
}) {
  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[14px] border border-[#E8E0D4] bg-[#FFFDF9] px-6 py-16 text-center shadow-[0_2px_10px_rgba(64,45,20,0.05)]">
        <Camera className="h-8 w-8 text-[#B18345]" strokeWidth={1.6} aria-hidden="true" />
        <h2 className="notification-serif mt-3 text-xl font-bold text-[#14110E]">
          No photos yet
        </h2>
        <p className="mt-1 text-sm text-[#665C4E]">
          {name} has not added any photos to this section.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {photos.map((photo, index) => (
        <figure
          key={photo.id}
          className="overflow-hidden rounded-[14px] border border-[#E8E0D4] bg-[#FFFDF9] shadow-[0_2px_10px_rgba(64,45,20,0.05)]"
        >
          <WatermarkedPhoto
            src={photo.url}
            alt={`Profile photograph ${index + 1} of ${name}`}
            watermarkText={photo.watermark || "MA'AAK VERIFIED VIEW"}
            className="aspect-[3/4] w-full"
          />
          {photo.isPrimary ? (
            <figcaption className="border-t border-[#EEE7DC] px-3 py-2 text-[11px] font-semibold text-[#B18345]">
              Primary photo
            </figcaption>
          ) : null}
        </figure>
      ))}
    </div>
  );
}
