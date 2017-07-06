import Component from "@egjs/component";
import {AnimationManager} from "./AnimationManager";
import {EventManager} from "./EventManager";
import {InterruptManager} from "./InterruptManager";
import {AxisManager} from "./AxisManager";
import {InputManager} from "./InputManager";
/**
 * Copyright (c) NAVER Corp.
 * egjs-axes projects are licensed under the MIT license
 */
/**
 * A module used to change the information of user action entered by various input devices such as touch screen or mouse into logical coordinates within the virtual coordinate system. The coordinate information sorted by time events occurred is provided if animations are made by user actions.
 * @alias eg.Axes
 * @extends eg.Component
 *
 * @support {"ie": "10+", "ch" : "latest", "ff" : "latest",  "sf" : "latest", "edge" : "latest", "ios" : "7+", "an" : "2.3+ (except 3.x)"}
 */
export default class Axes extends Component {
	constructor(options) {
		super();
		Object.assign(this.options = {
			easing: function easeOutCubic(x) {
				return 1 - Math.pow(1 - x, 3);
			},
			interruptable: true,
			maximumDuration: Infinity,
			deceleration: 0.0006,
			axis: {
				x: {
					range: [0, 100],
					bounce: [0, 0],
					margin: [0, 0],
					circular: [false, false],
				},
			},
		}, options);
		this._complementOptions();
		this._em = new EventManager(this);
		this._axm = new AxisManager(this.options);
		this._itm = new InterruptManager(this.options);
		this._am = new AnimationManager(this.options, this._em, this._axm, this._itm);
		// this.im = new InputManager(this.options, this.em, this.apm, this.itm);
	}

	/**
	 * set up 'css' expression
	 * @private
	 */
	_complementOptions() {
		Object.keys(this.options.axis).forEach(axis => {
			["bounce", "margin", "circular"].forEach(v => {
				const axisOption = this.options.axis;
				const key = axisOption[axis][v];

				if (/string|number|boolean/.test(typeof key)) {
					axisOption[axis][v] = [key, key];
				}
			});
		});
	}

	addInput(axes, inputType) {
		inputType.mapAxes(axes);
		inputType.subscribe(this);
		return this;
	}

	removeInput(inputType) {
		inputType.unsubscribe();
		return this;
	}

	get(axes) {
		return this._axm.get(axes);
	}
}