/*
  Warnings:

  - A unique constraint covering the columns `[citation]` on the table `CaseLaw` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "CaseLaw_citation_key" ON "CaseLaw"("citation");
