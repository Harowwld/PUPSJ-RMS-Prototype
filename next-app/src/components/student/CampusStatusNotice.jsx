"use client";

import NoticeBanner from "@/components/shared/NoticeBanner";

export default function CampusStatusNotice({ tone = "campus", imageSizes = "(max-width: 640px) 100vw, 576px", ...props }) {
  return <NoticeBanner tone={tone} imageSizes={imageSizes} {...props} />;
}
