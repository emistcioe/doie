import { DEPARTMENT_CODE, getPublicApiUrl, API_BASE } from "@/lib/env";
import { departmentSlugFromCode } from "@/lib/department";
import { getDepartment } from "@/lib/data/publicDepartment";

type GalleryItem = {
  uuid: string;
  image: string;
  caption?: string | null;
  createdAt?: string | null;
};

const formatGalleryDate = (value?: string | null) => {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return value;
  }
};

export default async function GalleryPage() {
  const slug = departmentSlugFromCode(DEPARTMENT_CODE);
  interface Department {
    uuid?: string | null;
    name?: string | null;
    shortName?: string | null;
    [key: string]: any;
  }

  let department: Department | null = null;
  try {
    if (slug) {
      department = await getDepartment(slug);
    } else {
    }
  } catch (error) {
    console.warn("Unable to load department for gallery:", error);
  }

  let galleryItems: GalleryItem[] = [];
  let galleryError: string | null = null;

  if (department?.uuid) {
    try {
      const apiBase =
        process.env.NEXT_PUBLIC_API_BASE || "https://cdn.tcioe.edu.np";

      // Make multiple API calls to get all department-related images
      const requests = [
        // 1. Direct department gallery images
        async () => {
          const params = new URLSearchParams({
            limit: "50",
            source_type: "department_gallery",
            source_identifier: department.uuid!,
          });
          const url = new URL(
            "/api/v1/public/website-mod/global-gallery",
            apiBase
          );
          url.search = params.toString();

          return {
            type: "department",
            response: await fetch(url, {
              headers: { Accept: "application/json" },
              next: { revalidate: 120 },
            }),
          };
        },

        // 2. Get department's clubs to find their gallery images
        async () => {
          try {
            // Try the student-clubs endpoint first
            const url = new URL(
              `/api/v1/public/website-mod/student-clubs`,
              apiBase
            );
            url.searchParams.set("department", department.uuid!);

            const response = await fetch(url, {
              headers: { Accept: "application/json" },
              next: { revalidate: 120 },
            });

            // If 404, try alternative endpoint
            if (!response.ok && response.status === 404) {
              const altUrl = new URL(
                `/api/v1/public/department-mod/student-clubs`,
                apiBase
              );
              altUrl.searchParams.set("department", department.uuid!);
              const altResponse = await fetch(altUrl, {
                headers: { Accept: "application/json" },
                next: { revalidate: 120 },
              });
              return { type: "clubs", response: altResponse };
            }

            return { type: "clubs", response };
          } catch (error) {
            console.warn("Clubs API error:", error);
            // Return a mock successful response with empty results
            return {
              type: "clubs",
              response: new Response(JSON.stringify({ results: [] }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
              }),
            };
          }
        },

        // 3. Get global events linked to this department
        async () => {
          const params = new URLSearchParams({
            limit: "50",
            department: department.uuid!,
          });
          const url = new URL(
            "/api/v1/public/website-mod/global-events",
            apiBase
          );
          url.search = params.toString();

          return {
            type: "events",
            response: await fetch(url, {
              headers: { Accept: "application/json" },
              next: { revalidate: 120 },
            }),
          };
        },
      ];

      const responses = await Promise.all(requests.map((req) => req()));

      const allImages: any[] = [];

      // Process each response type
      for (const { type, response } of responses) {
        if (!response.ok) {
          console.warn(`${type} API failed:`, response.status);
          continue;
        }

        const data = await response.json();

        if (type === "department") {
          // Direct department gallery images
          const results = Array.isArray(data?.results) ? data.results : [];
          results.forEach((item: any) => {
            allImages.push({
              uuid: item.uuid,
              image: item.image,
              caption: item.caption || "Department Gallery",
              createdAt: item.createdAt,
              sourceType: "department_gallery",
            });
          });
        } else if (type === "events") {
          // For each event, fetch their gallery images from global gallery
          const events = Array.isArray(data?.results) ? data.results : [];

          // For each event, get their gallery images
          for (const event of events) {
            if (event.uuid) {
              try {
                const eventGalleryParams = new URLSearchParams({
                  limit: "20",
                  source_type: "global_event",
                  source_identifier: event.uuid,
                });
                const eventGalleryUrl = new URL(
                  "/api/v1/public/website-mod/global-gallery",
                  apiBase
                );
                eventGalleryUrl.search = eventGalleryParams.toString();

                const eventResponse = await fetch(eventGalleryUrl, {
                  headers: { Accept: "application/json" },
                  next: { revalidate: 120 },
                });

                if (eventResponse.ok) {
                  const eventData = await eventResponse.json();
                  const eventResults = Array.isArray(eventData?.results)
                    ? eventData.results
                    : [];

                  eventResults.forEach((item: any) => {
                    allImages.push({
                      uuid: item.uuid,
                      image: item.image,
                      caption: item.caption || `${event.title} - Event Gallery`,
                      createdAt: item.createdAt,
                      sourceType: "global_event",
                      eventTitle: event.title,
                    });
                  });
                }
              } catch (error) {
                console.warn(
                  `Failed to fetch gallery for event ${event.title}:`,
                  error
                );
              }
            }
          }
        } else if (type === "clubs") {
          // Get club UUIDs to fetch their gallery images
          const clubs = Array.isArray(data?.results) ? data.results : [];

          // For each club, get their gallery images
          for (const club of clubs) {
            if (club.uuid) {
              try {
                const clubGalleryParams = new URLSearchParams({
                  limit: "20",
                  source_type: "club_gallery",
                  source_identifier: club.uuid,
                });
                const clubGalleryUrl = new URL(
                  "/api/v1/public/website-mod/global-gallery",
                  apiBase
                );
                clubGalleryUrl.search = clubGalleryParams.toString();

                const clubResponse = await fetch(clubGalleryUrl, {
                  headers: { Accept: "application/json" },
                  next: { revalidate: 120 },
                });

                if (clubResponse.ok) {
                  const clubData = await clubResponse.json();
                  const clubResults = Array.isArray(clubData?.results)
                    ? clubData.results
                    : [];

                  clubResults.forEach((item: any) => {
                    allImages.push({
                      uuid: item.uuid,
                      image: item.image,
                      caption: item.caption || `${club.name} Gallery`,
                      createdAt: item.createdAt,
                      sourceType: "club_gallery",
                      clubName: club.name,
                    });
                  });
                }
              } catch (error) {
                console.warn(
                  `Failed to fetch gallery for club ${club.name}:`,
                  error
                );
              }
            }
          }
        }
      }

      // Sort by creation date and limit to 12 most recent
      const sortedImages = allImages
        .sort(
          (a: any, b: any) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
        )
        .slice(0, 12);

      galleryItems = sortedImages.map((item: any) => {
        // Normalize image URL:
        // - If absolute and points to localhost, replace origin with API_BASE
        // - If absolute and not localhost, keep as-is
        // - If relative (starts with / or no protocol), prefix with API_BASE via getPublicApiUrl
        let image = item.image || "";
        try {
          const parsed = new URL(image);
          // absolute URL
          if (
            parsed.hostname === "localhost" ||
            parsed.hostname === "127.0.0.1"
          ) {
            // use only the pathname/search/hash and build with API_BASE
            image = getPublicApiUrl(
              parsed.pathname + parsed.search + parsed.hash
            );
          } else {
            image = parsed.toString();
          }
        } catch (e) {
          // image was not an absolute URL — treat as path
          image = getPublicApiUrl(image.startsWith("/") ? image : `/${image}`);
        }

        return {
          uuid: item.uuid,
          image,
          caption: item.caption,
          createdAt: item.createdAt,
        };
      });
    } catch (error) {
      galleryError = "Failed to load gallery images.";
      console.error("Gallery fetch error:", error);
    }
  } else {
    galleryError = "Department information not available for gallery.";
  }

  return (
    <div className="bg-background py-12">
      <div className="container mx-auto px-4 lg:px-6 space-y-8">
        <div className="text-center space-y-3">
          <p className="text-xs uppercase tracking-[0.4em] text-primary font-semibold">
            Department gallery
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            {department?.name || "Department gallery"}
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            {department?.shortName
              ? `A curated album of ${department.shortName} labs, events, and research moments.`
              : "Photos and visuals from departments across the campus community."}
          </p>
        </div>

        {galleryError && (
          <p className="text-sm text-red-600 text-center">{galleryError}</p>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {galleryItems.map((item) => (
            <article key={item.uuid} className="space-y-3">
              <div className="overflow-hidden rounded-2xl bg-muted">
                <img
                  src={item.image}
                  alt={
                    item.caption ||
                    department?.shortName ||
                    "Department gallery image"
                  }
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-900 line-clamp-2">
                  {item.caption || department?.shortName || "Gallery image"}
                </p>
                {item.createdAt && (
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    {formatGalleryDate(item.createdAt)}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>

        {galleryItems.length === 0 && !galleryError && (
          <p className="text-center text-sm text-muted-foreground">
            Gallery is being populated. Check back after the next event for
            fresh pictures.
          </p>
        )}
      </div>
    </div>
  );
}
