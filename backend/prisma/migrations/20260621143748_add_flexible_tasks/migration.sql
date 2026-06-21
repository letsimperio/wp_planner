-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "repeat_type" TEXT NOT NULL DEFAULT 'ONCE',
    "repeat_interval_days" INTEGER,
    "last_completed_at" DATETIME,
    "next_due_at" DATETIME,
    "deadline_at" DATETIME,
    "is_flexible" BOOLEAN NOT NULL DEFAULT false,
    "due_time" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_tasks" ("created_at", "description", "due_time", "id", "last_completed_at", "next_due_at", "priority", "repeat_interval_days", "repeat_type", "status", "title", "updated_at", "user_id") SELECT "created_at", "description", "due_time", "id", "last_completed_at", "next_due_at", "priority", "repeat_interval_days", "repeat_type", "status", "title", "updated_at", "user_id" FROM "tasks";
DROP TABLE "tasks";
ALTER TABLE "new_tasks" RENAME TO "tasks";
CREATE INDEX "tasks_user_id_idx" ON "tasks"("user_id");
CREATE INDEX "tasks_next_due_at_idx" ON "tasks"("next_due_at");
CREATE INDEX "tasks_status_idx" ON "tasks"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
