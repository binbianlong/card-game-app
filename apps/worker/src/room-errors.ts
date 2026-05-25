class RoomStateError extends Error {
  code: "gameRuleError" | "notAllowed" | "roomFull";

  constructor(code: RoomStateError["code"], message: string) {
    super(message);
    this.name = "RoomStateError";
    this.code = code;
  }
}

export { RoomStateError };
