import type { Request } from "express";
import { AccessTokenPayload } from "../Token";

export type TypedRequest = Request & {
  _user: AccessTokenPayload;
};
