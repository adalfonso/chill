import jwt from "jsonwebtoken";
import { AudioType, ImageType } from "@server/lib/media/types";
import { Request, Response, NextFunction } from "express";
import { User as UserModel } from "@server/models/User";
import { env } from "@server/init";
import { isValidObjectId } from "mongoose";

const audioExtension = new RegExp(
  `\\.(${[...Object.values(AudioType), ...Object.values(ImageType)].join(
    "|",
  )})$`,
  "i",
);

const getIdFromFile = (file: string) => file.replace(audioExtension, "");

/**
 * Determine if request send a valid token to access the media file or its cover
 *
 * @param req - express request
 * @param res - express response
 * @param next - next function
 * @returns  express response
 */
export const hasValidAudioToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // id is used for the media file, filename is used for the cover image
  const file = req.params.id ?? req.params.filename;
  const id = getIdFromFile(file);
  const token = req.query.token;

  if (!isValidObjectId(id)) {
    console.warn(
      "User tried to access token-secured media but media ID was not provided.",
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
        "User tried to access token-secured media could not find media_id in JWT payload",
      );
      return res.sendStatus(401);
    }

    if (decoded.media_id !== id) {
      console.warn(
        "User tried to access token-secured media but requested media's id does not match media_id in the JWT",
      );
      return res.sendStatus(401);
    }

    const user = await UserModel.findOne({ email: decoded.for });

    if (user === null) {
      console.warn(
        "User tried to access token-secured media but could not find user from JWT",
      );
      return res.sendStatus(401);
    }

    req.user = user;
  } catch (e) {
    console.warn("User tried to access token-secured media but JWT is invalid");
    return res.sendStatus(401);
  }

  next();
};
