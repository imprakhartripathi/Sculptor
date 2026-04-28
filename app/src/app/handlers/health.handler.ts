export const healthHandler = (
  _req: unknown,
  res: { json: (value: unknown) => void }
) => {
  res.json({ status: "ok" });
};
