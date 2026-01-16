-- 添加错误首次和最后发生时间字段
ALTER TABLE "errors" ADD COLUMN "first_seen_at" timestamp DEFAULT now() NOT NULL;
ALTER TABLE "errors" ADD COLUMN "last_seen_at" timestamp DEFAULT now() NOT NULL;

-- 为已存在的记录设置默认值（使用 created_at）
UPDATE "errors" SET "first_seen_at" = "created_at", "last_seen_at" = "created_at";

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS "errors_project_last_seen_idx" ON "errors" ("project_id", "last_seen_at");
