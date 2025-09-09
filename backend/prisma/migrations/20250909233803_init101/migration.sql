/*
  Warnings:

  - You are about to drop the column `correlativo` on the `Entry` table. All the data in the column will be lost.
  - You are about to drop the column `igvRate` on the `Entry` table. All the data in the column will be lost.
  - You are about to drop the column `paymentTerm` on the `Entry` table. All the data in the column will be lost.
  - You are about to drop the column `providerName` on the `Entry` table. All the data in the column will be lost.
  - You are about to drop the column `serie` on the `Entry` table. All the data in the column will be lost.
  - You are about to drop the column `totalGross` on the `Entry` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Entry" DROP COLUMN "correlativo",
DROP COLUMN "igvRate",
DROP COLUMN "paymentTerm",
DROP COLUMN "providerName",
DROP COLUMN "serie",
DROP COLUMN "totalGross";
