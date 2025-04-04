import { Response } from "express";
import { Result } from "neverthrow";

export const handleResult = <T>(res: Response, result: Result<T, Error>) => {
  result.match(
    (data) => res.json(data),
    (error) => res.status(500).json({ error: error.message })
  );
}; 