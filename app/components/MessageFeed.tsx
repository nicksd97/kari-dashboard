"use client";

import { useState } from "react";
import type { MessageFeedEntry } from "@/lib/types";
import { EMPLOYEE_COLORS } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";

interface MessageFeedProps {
  messages: MessageFeedEntry[];
}

export default function MessageFeed({ messages }: MessageFeedProps) {
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  // Get unique employee names from messages for filters
  const allEmployees = Array.from(new Set(messages.map((m) => m.employee_name)));

  const toggleEmployee = (name: string) => {
    if (selectedEmployees.includes(name)) {
      setSelectedEmployees(selectedEmployees.filter((e) => e !== name));
    } else {
      setSelectedEmployees([...selectedEmployees, name]);
    }
  };

  const filteredMessages =
    selectedEmployees.length > 0
      ? messages.filter((m) => selectedEmployees.includes(m.employee_name))
      : messages;

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString("nb-NO", {
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      }).replace(",", " kl.");
    } catch {
      return dateString;
    }
  };

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 rounded-xl border border-dashed border-border bg-muted/20 text-muted-foreground">
        <p>Ingen meldinger funnet enda.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {allEmployees.map((name) => {
          const isSelected = selectedEmployees.includes(name);
          const color = EMPLOYEE_COLORS[name] || "#999";
          return (
            <button
              key={name}
              onClick={() => toggleEmployee(name)}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors border ${
                isSelected
                  ? "bg-secondary text-secondary-foreground border-transparent"
                  : "bg-card text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              {name}
            </button>
          );
        })}
        {selectedEmployees.length > 0 && (
          <button
            onClick={() => setSelectedEmployees([])}
            className="text-xs font-medium text-muted-foreground hover:text-foreground underline underline-offset-2 ml-2"
          >
            Fjern filter
          </button>
        )}
      </div>

      {/* Feed */}
      <div className="space-y-4">
        {filteredMessages.map((msg) => {
          const color = EMPLOYEE_COLORS[msg.employee_name] || "#999";

          return (
            <Card key={msg.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex p-4 gap-4">
                  {/* Avatar */}
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm mt-1"
                    style={{ backgroundColor: color }}
                  >
                    {msg.employee_name.charAt(0)}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-1">
                      <h3 className="font-semibold text-foreground text-[15px]">
                        {msg.employee_name}
                      </h3>
                      <span className="text-xs text-muted-foreground/70 font-medium">
                        {formatDate(msg.responded_at)}
                      </span>
                    </div>

                    {/* Project/Tasks context */}
                    {(msg.project_number || msg.planned_tasks) && (
                      <div className="mb-3 flex flex-col gap-1">
                        {msg.project_number && (
                          <div className="text-xs font-medium bg-muted/60 text-muted-foreground inline-flex items-center rounded-md px-2 py-0.5 w-fit">
                            <span className="mr-1 opacity-70">Prosjekt:</span>
                            <span className="text-foreground">
                              #{msg.project_number} {msg.project_name || ""}
                            </span>
                          </div>
                        )}
                        {msg.planned_tasks && (
                          <div className="text-[13px] text-muted-foreground">
                            <span className="font-medium mr-1">Planlagt:</span>
                            {msg.planned_tasks}
                          </div>
                        )}
                      </div>
                    )}

                    {/* The message / raw response */}
                    {msg.raw_response && (
                      <div className="bg-muted/30 rounded-lg p-3 border border-border/50 text-[14px] text-foreground/90 whitespace-pre-wrap leading-relaxed">
                        {msg.raw_response}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
