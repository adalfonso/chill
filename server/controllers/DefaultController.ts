import * as path from "path";
import { Request, Response } from "express";

export const DefaultController = {
  static: (source: string) => async (req: Request, res: Response) => {
    console.log(path.join(source, "index.html"));
    res.sendFile(path.join(source, "index.html"));
  },
};
