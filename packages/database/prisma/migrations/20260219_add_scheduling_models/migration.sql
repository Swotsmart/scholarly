-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'classroom',
    "capacity" INTEGER NOT NULL DEFAULT 30,
    "building" TEXT,
    "floor" INTEGER,
    "equipment" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'available',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolPeriod" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "periodNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'teaching',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimetableSlot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "periodId" TEXT NOT NULL,
    "classCode" TEXT,
    "subjectId" TEXT,
    "teacherId" TEXT,
    "roomId" TEXT,
    "yearLevel" TEXT,
    "term" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimetableSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchedulingConstraint" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "rules" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchedulingConstraint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Room_tenantId_name_key" ON "Room"("tenantId", "name");
CREATE INDEX "Room_tenantId_idx" ON "Room"("tenantId");
CREATE INDEX "Room_tenantId_type_idx" ON "Room"("tenantId", "type");
CREATE INDEX "Room_tenantId_status_idx" ON "Room"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolPeriod_tenantId_periodNumber_key" ON "SchoolPeriod"("tenantId", "periodNumber");
CREATE INDEX "SchoolPeriod_tenantId_idx" ON "SchoolPeriod"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TimetableSlot_tenantId_dayOfWeek_periodId_key" ON "TimetableSlot"("tenantId", "dayOfWeek", "periodId");
CREATE INDEX "TimetableSlot_tenantId_idx" ON "TimetableSlot"("tenantId");
CREATE INDEX "TimetableSlot_teacherId_idx" ON "TimetableSlot"("teacherId");
CREATE INDEX "TimetableSlot_roomId_idx" ON "TimetableSlot"("roomId");
CREATE INDEX "TimetableSlot_subjectId_idx" ON "TimetableSlot"("subjectId");

-- CreateIndex
CREATE INDEX "SchedulingConstraint_tenantId_idx" ON "SchedulingConstraint"("tenantId");
CREATE INDEX "SchedulingConstraint_tenantId_category_idx" ON "SchedulingConstraint"("tenantId", "category");
CREATE INDEX "SchedulingConstraint_tenantId_enabled_idx" ON "SchedulingConstraint"("tenantId", "enabled");

-- AddForeignKey
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "SchoolPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;
