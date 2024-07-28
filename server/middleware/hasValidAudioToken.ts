import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import z from "zod";

import { AudioType, ImageType } from "@server/lib/media/types";
import { env } from "@server/init";

import { db } from "@server/lib/data/db";

const audioOrImageExtension = new RegExp(
  `\\.(${[...Object.values(AudioType), ...Object.values(ImageType)].join(
    "|",
  )})$`,
  "i",
);

const getIdFromFile = (file: string) => file.replace(audioOrImageExtension, "");

/**
 * Determine if request send a valid token to access the media file or its cover
 *
 * @param req - express request
 * @param res - express response
 * @param next - next function
 * @returns  express response
 */
export const hasValidAudioToken =
  (type: "track" | "album_art") =>
  async (req: Request, res: Response, next: NextFunction) => {
    // id is used for the media file, filename is used for the cover image
    const file = type === "track" ? req.params.id : req.params.filename;
    const id = getIdFromFile(file);
    const token = req.query.token;

    if (!z.coerce.number().int().safeParse(id).success) {
      console.warn(
        "User tried to access token-secured media but media ID was not found.",
      );
      return res.sendStatus(404);
    }

    if (typeof token !== "string") {
      return res.sendStatus(401);
    }

    try {
      const decoded = jwt.verify(token, env.SIGNING_KEY);

      if (typeof decoded === "string") {
        console.warn(
          "User tried to access token-secured media could not find track_id in JWT payload",
        );
        return res.sendStatus(401);
      }

      if (
        // Token not valid for track
        (type === "track" && decoded.track_id.toString() !== id) ||
        // Token not valid for album art
        (type === "album_art" && decoded.album_art_filename !== file)
      ) {
        console.warn(
          "User tried to access token-secured media but requested track's id does not match track_id in the JWT",
        );
        return res.sendStatus(401);
      }

      const user = await db.user.findUnique({
        where: { email: decoded.for },
        include: { settings: true },
      });

      if (user === null) {
        console.warn(
          "User tried to access token-secured media but could not find user from JWT",
        );
        return res.sendStatus(401);
      }

      req.user = user;
    } catch (e) {
      console.warn(
        "User tried to access token-secured media but JWT is invalid",
      );
      return res.sendStatus(401);
    }

    next();
  };
