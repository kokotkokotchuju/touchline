import type { MetadataRoute } from "next";

const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, changeFrequency: "hourly", priority: 1 },
    { url: `${siteUrl}/competitions`, changeFrequency: "daily", priority: 0.8 },
    { url: `${siteUrl}/discovery`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${siteUrl}/search`, changeFrequency: "daily", priority: 0.5 },
  ];
}
