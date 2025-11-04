-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stream" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rtspUrl" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'inactive',
    "hlsPath" TEXT,
    "processId" TEXT,
    "errorMessage" TEXT,
    "lastError" TIMESTAMP(3),
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "uptimeSeconds" INTEGER NOT NULL DEFAULT 0,
    "restartCount" INTEGER NOT NULL DEFAULT 0,
    "lastHealthCheck" TIMESTAMP(3),
    "bitrate" INTEGER,
    "fps" DOUBLE PRECISION,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stream_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreamErrorLog" (
    "id" SERIAL NOT NULL,
    "streamId" INTEGER NOT NULL,
    "errorType" TEXT NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "stackTrace" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StreamErrorLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreamHealthLog" (
    "id" SERIAL NOT NULL,
    "streamId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "bitrate" INTEGER,
    "fps" DOUBLE PRECISION,
    "uptime" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StreamHealthLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "StreamErrorLog_streamId_idx" ON "StreamErrorLog"("streamId");

-- CreateIndex
CREATE INDEX "StreamErrorLog_createdAt_idx" ON "StreamErrorLog"("createdAt");

-- CreateIndex
CREATE INDEX "StreamHealthLog_streamId_idx" ON "StreamHealthLog"("streamId");

-- CreateIndex
CREATE INDEX "StreamHealthLog_createdAt_idx" ON "StreamHealthLog"("createdAt");

-- AddForeignKey
ALTER TABLE "StreamErrorLog" ADD CONSTRAINT "StreamErrorLog_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamHealthLog" ADD CONSTRAINT "StreamHealthLog_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE CASCADE ON UPDATE CASCADE;
