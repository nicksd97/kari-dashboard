"use client";

import { useState } from "react";
import type { MessageFeedEntry } from "@/lib/types";
import { EMPLOYEE_COLORS } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle, ClipboardCheck, Clock, MessageSquare } from "lucide-react";

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

  const getIcon = (msg: MessageFeedEntry) => {
    switch (msg.type) {
      case "checkin":
        if (msg.status === "Venter på svar") {
          return <Clock className="w-5 h-5 text-orange-500" />;
        }
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "deviation":
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case "checklist":
        return <ClipboardCheck className="w-5 h-5 text-blue-500" />;
      case "message":
        return <MessageSquare className="w-5 h-5 text-purple-500" />;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "checkin":
        return "Sjekk-inn";
      case "deviation":
        return "Avvik";
      case "checklist":
        return "Sjekkliste";
      case "message":
        return "Melding";
      default:
        return type;
    }
  };

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 rounded-xl border border-dashed border-border bg-muted/20 text-muted-foreground">
        <p>Ingen hendelser funnet enda.</p>
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
                style={name !== "System" ? { backgroundColor: color } : { backgroundColor: "#94a3b8" }}
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
                  {/* Icon / Avatar column */}
                  <div className="flex flex-col items-center gap-2 mt-1 shrink-0 w-10">
                    {getIcon(msg)}
                    {msg.employee_name !== "System" && (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shadow-sm text-xs"
                        style={{ backgroundColor: color }}
                        title={msg.employee_name}
                      >
                        {msg.employee_name.charAt(0)}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          {getTypeLabel(msg.type)}
                        </span>
                        <h3 className="font-semibold text-foreground text-[15px]">
                          {msg.employee_name !== "System" ? msg.employee_name : "System"}
                        </h3>
                      </div>
                      <span className="text-xs text-muted-foreground/70 font-medium">
                        {formatDate(msg.timestamp)}
                      </span>
                    </div>

                    {/* Project/Context */}
                    {msg.project_number && (
                      <div className="mb-3">
                        <div className="text-xs font-medium bg-muted/60 text-muted-foreground inline-flex items-center rounded-md px-2 py-0.5 w-fit">
                          <span className="mr-1 opacity-70">Prosjekt:</span>
                          <span className="text-foreground">
                            #{msg.project_number} {msg.project_name || ""}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* The message / description */}
                    {msg.description && (
                      <div className="bg-muted/30 rounded-lg p-3 border border-border/50 text-[14px] text-foreground/90 whitespace-pre-wrap leading-relaxed">
                        {msg.description}
                      </div>
                    )}

                    {/* Extra Info / Status */}
                    {(msg.extra_info || msg.status) && (
                      <div className="mt-2 flex flex-wrap gap-2 text-[12px]">
                        {msg.status && (
                          <span className={`px-2 py-0.5 rounded-full font-medium ${msg.status === "Venter på svar" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400" : "bg-secondary text-secondary-foreground"}`}>
                            Status: {msg.status}
                          </span>
                        )}
                        {msg.extra_info && (
                          <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {msg.extra_info}
                          </span>
                        )}
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