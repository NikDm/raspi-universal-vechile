export type CommandType = "move" | "stop" | "light";

export interface MoveCommand {
  type: "move";
  left: number;
  right: number;
}

export interface StopCommand {
  type: "stop";
}

export interface LightCommand {
  type: "light";
  on?: boolean; // omit to toggle
}

export type Command = MoveCommand | StopCommand | LightCommand;
