-- DropIndex
DROP INDEX "DayPlan_weekday_key";

-- AlterTable: add userId as nullable first so we can backfill existing rows
ALTER TABLE "DayPlan" ADD COLUMN "userId" TEXT;

-- Backfill: existing DayPlan rows (from before multi-usuaria support) belonged
-- to the first usuaria account. Fresh/empty databases have no DayPlan rows,
-- so this is a no-op there.
UPDATE "DayPlan"
SET "userId" = (SELECT "id" FROM "User" WHERE "role" = 'USUARIA' ORDER BY "createdAt" ASC LIMIT 1);

-- Now that every row has an owner, make it required
ALTER TABLE "DayPlan" ALTER COLUMN "userId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "DayPlan_userId_weekday_key" ON "DayPlan"("userId", "weekday");

-- AddForeignKey
ALTER TABLE "DayPlan" ADD CONSTRAINT "DayPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
