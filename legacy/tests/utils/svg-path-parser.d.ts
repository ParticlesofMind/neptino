declare module 'svg-path-parser' {
  export interface MoveCommand {
    code: 'M';
    x: number;
    y: number;
  }

  export interface CubicBezierCommand {
    code: 'C';
    x: number;
    y: number;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }

  export interface LineCommand {
    code: 'L';
    x: number;
    y: number;
  }

  export interface ClosePathCommand {
    code: 'Z';
  }

  export type PathCommand =
    | MoveCommand
    | CubicBezierCommand
    | LineCommand
    | ClosePathCommand;

  const svgPathParser: {
    parseSVG(pathData: string): PathCommand[];
    makeAbsolute(commands: PathCommand[]): PathCommand[];
  };

  export default svgPathParser;
}
