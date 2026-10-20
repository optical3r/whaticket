import { Request, Response } from "express";
import AppError from "../../../errors/AppError";
import isAdmin from "../../../middleware/isAdmin";

const run = (profile: string) => {
  const next = jest.fn();
  const req = { user: { id: "1", profile } } as Request;
  isAdmin(req, {} as Response, next);
  return next;
};

describe("isAdmin middleware", () => {
  it("lets admins through", () => {
    expect(run("admin")).toHaveBeenCalled();
  });

  it("blocks regular users with 403", () => {
    expect(() => run("user")).toThrow(AppError);

    try {
      run("user");
    } catch (err) {
      expect((err as AppError).statusCode).toBe(403);
    }
  });
});
