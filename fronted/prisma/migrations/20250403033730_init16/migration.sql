-- CreateTable
CREATE TABLE "_InventoryToStore" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_InventoryToStore_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_InventoryToStore_B_index" ON "_InventoryToStore"("B");

-- AddForeignKey
ALTER TABLE "_InventoryToStore" ADD CONSTRAINT "_InventoryToStore_A_fkey" FOREIGN KEY ("A") REFERENCES "Inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InventoryToStore" ADD CONSTRAINT "_InventoryToStore_B_fkey" FOREIGN KEY ("B") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
