import { NextFunction, Request, Response } from "express";

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  const { user } = req;

  if (!user) {
    return res.redirect("/auth/login");
  }

  if (user.type !== "admin") {
    return res.status(401).send();
  }

  next();
};
