import { color } from 'd3-color';
import * as PIXI from 'pixi.js';

/**
 * Convert a regular color value (e.g. 'red', '#FF0000', 'rgb(255,0,0)') to a
 * hex value which is legible by PIXI
 */
const colorToHex = (colorValue) => {
  const c = color(colorValue);
  const hex = PIXI.utils.rgb2hex([c.r / 255.0, c.g / 255.0, c.b / 255.0]);

  return hex;
};

export default colorToHex;
