-- AlterTable
ALTER TABLE "Order" ADD COLUMN "itemsHash" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ALTER COLUMN "unitPriceCents" DROP NOT NULL,
ALTER COLUMN "subtotalCents" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Order_customerId_deliveryDate_totalCents_idx" ON "Order"("customerId", "deliveryDate", "totalCents");

-- CreateIndex
CREATE INDEX "Order_itemsHash_idx" ON "Order"("itemsHash");
