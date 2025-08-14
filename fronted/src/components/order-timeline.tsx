import React from "react";

interface TrackingEvent {
  id: number;
  status: string;
  description?: string | null;
  createdAt: string;
}

interface OrderTimelineProps {
  events: TrackingEvent[];
}

const MILESTONES = [
  { status: "CREATED", label: "Created" },
  { status: "APPROVED", label: "Approved" },
  { status: "SHIPPED", label: "Shipped" },
  { status: "DELIVERED", label: "Delivered" },
];

export default function OrderTimeline({ events }: OrderTimelineProps) {
  const completedCount = MILESTONES.filter((m) =>
    events.some((e) => e.status === m.status)
  ).length;
  const progress =
    MILESTONES.length > 1
      ? ((completedCount - 1) / (MILESTONES.length - 1)) * 100
      : 0;

  return (
    <div className="w-full">
      <div className="relative flex justify-between mb-6">
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 dark:bg-slate-700" />
        <div
          className="absolute top-1/2 left-0 h-0.5 bg-blue-500 dark:bg-blue-400"
          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        />
        {MILESTONES.map((m) => {
          const completed = events.some((e) => e.status === m.status);
          return (
            <div
              key={m.status}
              className="relative flex flex-col items-center flex-1"
            >
              <div
                className={`w-4 h-4 rounded-full border-2 z-10 ${
                  completed
                    ? "bg-blue-500 border-blue-500"
                    : "bg-white border-slate-300 dark:border-slate-600"
                }`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between">
        {MILESTONES.map((m) => {
          const ev = events.find((e) => e.status === m.status);
          const completed = Boolean(ev);
          return (
            <div
              key={m.status}
              className="flex flex-col items-center text-center flex-1"
            >
              <span
                className={`text-sm font-medium ${
                  completed ? "text-blue-600" : "text-slate-400"
                }`}
              >
                {m.label}
              </span>
              <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {ev ? new Date(ev.createdAt).toLocaleString("es-ES") : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}