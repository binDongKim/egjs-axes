import { AxisOption, AxesOption } from "./Option.d";

export interface Axis {
  [key: string]: number
};

export class AxisManager {
  private _pos: Axis;
  static equal(pos1: Axis, pos2: Axis): boolean {
    for (const k in pos1) {
      if (pos1[k] !== pos2[k]) {
        return false;
      }
    }
    return true;
  }
  constructor(private options: AxesOption) {
    this._pos = Object.keys(this.options.axis).reduce((acc, v) => {
      acc[v] = this.options.axis[v].range[0];
      return acc;
    }, {});
  }
  get(axes?: Array<string>): Axis {
    if (axes) {
      return axes.reduce((acc, v) => {
        acc[v] = this._pos[v];
        return acc;
      }, {});
    } else {
      return { ...this._pos };
    }
  }
  moveTo(pos: Axis): Axis {
    for (const k in pos) {
      this._pos[k] = pos[k];
    }
    return { ... this._pos };
  }
  some(
    pos: Axis,
    callback: (value: number, key: string, options: AxisOption) => boolean): boolean {
    const axisOptions = this.options.axis;
    for (const k in pos) {
      if (!callback(pos[k], k, axisOptions[k])) {
        return false;
      }
    }
    return true;
  }
  filter(
    pos: Axis,
    callback: (value: number, key: string, options: AxisOption) => boolean): Axis {
    const filtered: Axis = {};
    const axisOptions = this.options.axis;
    for (const k in pos) {
      callback(pos[k], k, axisOptions[k]) && (filtered[k] = pos[k]);
    }
    return filtered;
  }
  map(
    pos: Axis,
    callback: (value: number, key: string, options: AxisOption) => number): Axis {
    const tranformed: Axis = {};
    const axisOptions = this.options.axis;
    for (const k in pos) {
      tranformed[k] = callback(pos[k], k, axisOptions[k]);
    }
    return tranformed;
  }
};