import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    if (!header) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    try {
        const data = jwt.verify(header, process.env.JWT_SECRET!);
        req.userId = data.sub as string;
        next();
    } catch {
        res.status(401).json({ message: "Unauthorized" });
    }
}
