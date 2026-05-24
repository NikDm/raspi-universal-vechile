export type CommandType = "move" | "stop";

export interface MoveCommand {
  type: "move";
  left: number;
  right: number;
}

export interface StopCommand {
  type: "stop";
}

export type Command = MoveCommand | StopCommand;
