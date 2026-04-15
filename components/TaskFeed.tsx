"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { bandLabel, groupByBand, sortTasks } from "@/lib/task-feed";
import type { TaskBand, TaskWithCompletion } from "@/lib/types";
import TaskCard from "./TaskCard";
import TaskDetailSheet from "./TaskDetailSheet";
import { roleLabel, type Group, type Role } from "@/lib/constants";
import { today } from "@/lib/dates";

interface Props {
  initialTasks: TaskWithCompletion[];
  /** Attribution map: task_id → "Group A Rep" style label. */
  attribution: Record<string, string>;
  userId: string;
  userGroup: Group;
}

const HINT_LS_KEY = "priora_hint_shown";

export default function TaskFeed({
  initialTasks,
  attribution,
  userId,
  userGroup,
}: Props) {
  const [tasks, setTasks] = useState<TaskWithCompletion[]>(initialTasks);
  const [detail, setDetail] = useState<TaskWithCompletion | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  // Default false so SSR markup matches the post-hydration state for users
  // who've already dismissed the hint. We flip it true in useEffect below.
  const [showHint, setShowHint] = useState(false);
  const [, startTransition] = useTransition();

  // Keep local state in sync if the parent re-renders with new data
  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // First-time hint: read the localStorage flag on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (window.localStorage.getItem(HINT_LS_KEY) !== "true") {
        setShowHint(true);
      }
    } catch {
      // localStorage unavailable (private mode, quota, etc.) — just don't show
      // the hint, which is a strictly safe fallback.
    }
  }, []);

  const dismissHint = useCallback(() => {
    setShowHint(false);
    try {
      window.localStorage.setItem(HINT_LS_KEY, "true");
    } catch {
      // Ignore — hint just won't persist, but the in-memory state still hides it.
    }
  }, []);

  // Realtime: new tasks pushed while feed is open
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel("tasks-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tasks" },
        (payload) => {
          const t = payload.new as TaskWithCompletion;
          if (!Array.isArray(t.groups) || !t.groups.includes(userGroup)) return;
          setTasks((prev) =>
            prev.some((x) => x.id === t.id)
              ? prev
              : [...prev, { ...t, completed_at: null }],
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tasks" },
        (payload) => {
          const t = payload.new as TaskWithCompletion;
          setTasks((prev) =>
            prev.map((x) => (x.id === t.id ? { ...x, ...t } : x)),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "tasks" },
        (payload) => {
          const id = (payload.old as { id: string }).id;
          setTasks((prev) => prev.filter((x) => x.id !== id));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userGroup]);

  const sorted = useMemo(() => sortTasks(tasks, today()), [tasks]);
  const bands = useMemo(() => groupByBand(sorted, today()), [sorted]);

  const toggleComplete = useCallback(
    async (task: TaskWithCompletion) => {
      const supabase = getSupabaseBrowser();
      const wasCompleted = task.completed_at != null;

      // Optimistic update
      setPendingIds((s) => new Set(s).add(task.id));
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? { ...t, completed_at: wasCompleted ? null : new Date().toISOString() }
            : t,
        ),
      );
      setDetail((d) =>
        d?.id === task.id
          ? {
              ...d,
              completed_at: wasCompleted ? null : new Date().toISOString(),
            }
          : d,
      );

      startTransition(async () => {
        try {
          if (wasCompleted) {
            const { error } = await supabase
              .from("task_completions")
              .delete()
              .eq("user_id", userId)
              .eq("task_id", task.id);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from("task_completions")
              .insert({ user_id: userId, task_id: task.id });
            if (error) throw error;
          }
        } catch {
          // Revert on failure
          setTasks((prev) =>
            prev.map((t) =>
              t.id === task.id
                ? { ...t, completed_at: wasCompleted ? new Date().toISOString() : null }
                : t,
            ),
          );
        } finally {
          setPendingIds((s) => {
            const n = new Set(s);
            n.delete(task.id);
            return n;
          });
        }
      });
    },
    [userId],
  );

  if (sorted.length === 0) {
    return (
      <div className="mt-24 text-center text-ink-muted text-[15px]">
        Nothing pending. You're clear.
      </div>
    );
  }

  // The hint lives below the very first task card across all bands.
  const firstTaskId = bands.flatMap((b) => b.tasks)[0]?.id ?? null;

  function handleOpen(t: TaskWithCompletion) {
    setDetail(t);
    if (showHint) dismissHint();
  }

  return (
    <div className="space-y-5">
      {bands.map(({ band, tasks: bandTasks }) => (
        <section key={band}>
          {bandLabel(band) && (
            <h2 className="section-header">{bandLabel(band)}</h2>
          )}
          <div className="space-y-3">
            {bandTasks.map((task) => (
              <div key={task.id}>
                <TaskCard
                  task={task}
                  overdue={band === "overdue"}
                  onToggleComplete={toggleComplete}
                  onOpen={handleOpen}
                  pending={pendingIds.has(task.id)}
                />
                {showHint && task.id === firstTaskId && (
                  <p
                    className="mt-1.5 ml-1 text-[12.5px] italic text-ink-soft"
                    aria-hidden="true"
                  >
                    Tap a card for full details
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      <TaskDetailSheet
        task={detail}
        attribution={detail ? (attribution[detail.id] ?? null) : null}
        onClose={() => setDetail(null)}
        onToggleComplete={toggleComplete}
        pending={detail ? pendingIds.has(detail.id) : false}
      />
    </div>
  );
}
