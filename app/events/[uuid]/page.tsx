"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  Clock,
  ArrowLeft,
  MapPin,
  Users,
  ExternalLink,
} from "lucide-react";
import { getPublicApiUrl } from "@/lib/env";
import { useDepartment } from "@/hooks/use-department";

type EventDetail = {
  uuid: string;
  title: string;
  description?: string | null;
  eventType?: string | null;
  eventStartDate?: string | null;
  eventEndDate?: string | null;
  thumbnail?: string | null;
  location?: string | null;
  organizer?: string | null;
  registrationLink?: string | null;
};

const formatDate = (value?: string | null) => {
  if (!value) return "TBD";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return value;
  }
};

const formatTime = (value?: string | null) => {
  if (!value) return null;
  try {
    const date = new Date(value);
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
};

const statusOf = (s?: string | null, e?: string | null) => {
  const now = new Date();
  const sd = s ? new Date(s) : null;
  const ed = e ? new Date(e) : null;
  if (ed && !Number.isNaN(ed.getTime()) && ed.getTime() < now.getTime())
    return { label: "Finished", color: "bg-slate-500" };
  if (sd && !Number.isNaN(sd.getTime()) && sd.getTime() > now.getTime())
    return { label: "Upcoming", color: "bg-blue-500" };
  return { label: "Running", color: "bg-emerald-500" };
};

const tcase = (s?: string) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "";

export default function EventDetailPage({
  params,
}: {
  params: { uuid: string };
}) {
  const { data: dept } = useDepartment();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dept?.uuid || !params.uuid) return;

    const controller = new AbortController();
    const fetchEvent = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          getPublicApiUrl(
            `/api/v1/public/website-mod/events/${params.uuid}/?department=${dept.uuid}`
          ),
          {
            headers: { Accept: "application/json" },
            signal: controller.signal,
          }
        );
        if (!response.ok) {
          throw new Error(`Event not found (${response.status})`);
        }
        const data = await response.json();
        setEvent(data);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(
          err instanceof Error ? err.message : "Failed to load event details"
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchEvent();
    return () => controller.abort();
  }, [dept?.uuid, params.uuid]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Skeleton className="h-8 w-32 mb-8" />
          <Skeleton className="aspect-[21/9] rounded-2xl mb-8" />
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Link
            href="/events"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-8 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Events
          </Link>
          <div className="text-center py-16 bg-slate-50 rounded-2xl border border-slate-100">
            <Calendar className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold text-slate-700 mb-2">
              Event Not Found
            </h1>
            <p className="text-slate-500">
              {error || "The event you're looking for doesn't exist."}
            </p>
            <Button variant="outline" className="mt-6" asChild>
              <Link href="/events">Browse All Events</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const status = statusOf(event.eventStartDate, event.eventEndDate);
  const startTime = formatTime(event.eventStartDate);
  const endTime = formatTime(event.eventEndDate);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Back Button */}
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Events
        </Link>

        {/* Hero Image */}
        {event.thumbnail && (
          <div className="aspect-[21/9] rounded-2xl overflow-hidden mb-8 bg-slate-100">
            <img
              src={event.thumbnail}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge
            className={`px-3 py-1 text-sm font-medium ${status.color} text-white border-0`}
          >
            {status.label}
          </Badge>
          {event.eventType && (
            <Badge
              variant="secondary"
              className="px-3 py-1 text-sm font-medium"
            >
              {tcase(event.eventType)}
            </Badge>
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
          {event.title}
        </h1>

        {/* Meta Info */}
        <Card className="mb-8 border-slate-100">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Date */}
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Date</p>
                  <p className="font-medium text-slate-900">
                    {formatDate(event.eventStartDate)}
                  </p>
                  {event.eventEndDate &&
                    event.eventStartDate !== event.eventEndDate && (
                      <p className="text-sm text-slate-600">
                        to {formatDate(event.eventEndDate)}
                      </p>
                    )}
                </div>
              </div>

              {/* Time */}
              {startTime && (
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-emerald-50 rounded-xl">
                    <Clock className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Time</p>
                    <p className="font-medium text-slate-900">
                      {startTime}
                      {endTime && startTime !== endTime && ` - ${endTime}`}
                    </p>
                  </div>
                </div>
              )}

              {/* Location */}
              {event.location && (
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-orange-50 rounded-xl">
                    <MapPin className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Location</p>
                    <p className="font-medium text-slate-900">
                      {event.location}
                    </p>
                  </div>
                </div>
              )}

              {/* Organizer */}
              {event.organizer && (
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-purple-50 rounded-xl">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Organized by</p>
                    <p className="font-medium text-slate-900">
                      {event.organizer}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Registration Button */}
            {event.registrationLink && status.label !== "Finished" && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <Button
                  className="w-full md:w-auto bg-blue-600 hover:bg-blue-700"
                  asChild
                >
                  <a
                    href={event.registrationLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Register Now
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Description */}
        {event.description && (
          <div className="prose prose-slate max-w-none">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              About This Event
            </h2>
            <div
              className="text-slate-600 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: event.description }}
            />
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="mt-12 pt-8 border-t border-slate-100">
          <Button variant="outline" asChild>
            <Link href="/events">
              <ArrowLeft className="h-4 w-4 mr-2" />
              View All Events
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
