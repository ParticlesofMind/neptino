/**
 * Text Tool Type Definitions
 */

import { Rectangle, Point } from "pixi.js";

export interface TextSettings {
    fontFamily: string;
    fontSize: number;
    color: string;
    fontWeight: string;
    fontStyle: string;
    align: string;
}

export interface TextAreaOptions {
    bounds: Rectangle;
    settings: TextSettings;
    onComplete: (text: string, position: Point) => void;
}

export interface BitmapFontConfig {
    name: string;
    fontFamily: string;
    fontSize: number;
    fill: string;
    fontWeight: string;
}
