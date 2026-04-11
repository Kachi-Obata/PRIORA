"use client";

import { useState } from "react";
import PostTaskSheet from "./PostTaskSheet";
import LogSessionSheet from "./LogSessionSheet";
import CourseSettingsSheet from "./CourseSettingsSheet";
import type { Course, CourseGroupSetting } from "@/lib/types";
import type { Group } from "@/lib/constants";
import { ToastProvider } from "../Toast";

interface Props {
  courses: Course[];
  settings: CourseGroupSetting[];
  adminId: string;
  adminGroup: Group | null;
}

type SheetKind = "task" | "session" | "settings" | null;

export default function AdminActions({
  courses,
  settings,
  adminId,
  adminGroup,
}: Props) {
  const [open, setOpen] = useState<SheetKind>(null);

  return (
    <ToastProvider>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className="btn-primary h-16 text-[15px]"
          onClick={() => setOpen("task")}
        >
          Post a task
        </button>
        <button
          type="button"
          className="btn-primary h-16 text-[15px]"
          onClick={() => setOpen("session")}
        >
          Log a session
        </button>
      </div>

      <button
        type="button"
        className="btn-secondary w-full mt-3"
        onClick={() => setOpen("settings")}
      >
        Course settings
      </button>

      <PostTaskSheet
        open={open === "task"}
        onClose={() => setOpen(null)}
        courses={courses}
        adminId={adminId}
        adminGroup={adminGroup}
      />
      <LogSessionSheet
        open={open === "session"}
        onClose={() => setOpen(null)}
        courses={courses}
        adminId={adminId}
        adminGroup={adminGroup}
      />
      <CourseSettingsSheet
        open={open === "settings"}
        onClose={() => setOpen(null)}
        courses={courses}
        settings={settings}
        adminGroup={adminGroup}
      />
    </ToastProvider>
  );
}
