ALTER TABLE "RincianBelanja" RENAME COLUMN "pagu" TO "paguInduk";
ALTER TABLE "RincianBelanja" RENAME COLUMN "volume" TO "volumeInduk";
ALTER TABLE "RincianBelanja" RENAME COLUMN "hargaSatuan" TO "hargaSatuanInduk";
ALTER TABLE "RincianBelanja" RENAME COLUMN "volumePerubahan" TO "volumeRkpd";
ALTER TABLE "RincianBelanja" RENAME COLUMN "hargaSatuanPerubahan" TO "hargaSatuanRkpd";
ALTER TABLE "RincianBelanja" RENAME COLUMN "paguPerubahan" TO "paguRkpd";

ALTER TABLE "PaguCeiling" RENAME COLUMN "ceilingAmount" TO "paguInduk";
ALTER TABLE "PaguSumberDana" RENAME COLUMN "ceilingAmount" TO "paguInduk";
