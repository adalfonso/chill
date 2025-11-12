-- DropForeignKey
ALTER TABLE "AlbumArt" DROP CONSTRAINT "AlbumArt_album_id_fkey";

-- AddForeignKey
ALTER TABLE "AlbumArt" ADD CONSTRAINT "AlbumArt_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;
