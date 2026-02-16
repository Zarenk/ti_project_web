-- CreateIndex
CREATE INDEX "Account_parentId_idx" ON "Account"("parentId");

-- CreateIndex
CREATE INDEX "Account_isPosting_idx" ON "Account"("isPosting");

-- CreateIndex
CREATE INDEX "Client_email_idx" ON "Client"("email");

-- CreateIndex
CREATE INDEX "Period_status_idx" ON "Period"("status");

-- CreateIndex
CREATE INDEX "RestaurantOrder_openedAt_idx" ON "RestaurantOrder"("openedAt");

-- CreateIndex
CREATE INDEX "RestaurantOrder_companyId_openedAt_idx" ON "RestaurantOrder"("companyId", "openedAt");
