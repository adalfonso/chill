-- CreateTable
CREATE TABLE "LoginSession" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "device_id" TEXT NOT NULL,
    "device_label" VARCHAR(64) NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "idle_expires_at" TIMESTAMP(3) NOT NULL,
    "absolute_expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" SERIAL NOT NULL,
    "token_hash" TEXT NOT NULL,
    "login_session_id" INTEGER NOT NULL,
    "rotated_at" TIMESTAMP(3),
    "rotated_to_id" INTEGER,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "issued_ip" TEXT NOT NULL,
    "issued_user_agent" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoginSession_user_id_idx" ON "LoginSession"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "LoginSession_user_id_device_id_key" ON "LoginSession"("user_id", "device_id");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_hash_key" ON "RefreshToken"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_rotated_to_id_key" ON "RefreshToken"("rotated_to_id");

-- CreateIndex
CREATE INDEX "RefreshToken_login_session_id_idx" ON "RefreshToken"("login_session_id");

-- AddForeignKey
ALTER TABLE "LoginSession" ADD CONSTRAINT "LoginSession_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_login_session_id_fkey" FOREIGN KEY ("login_session_id") REFERENCES "LoginSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_rotated_to_id_fkey" FOREIGN KEY ("rotated_to_id") REFERENCES "RefreshToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;
