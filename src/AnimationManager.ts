import Coordinate from "./Coordinate";
import { Axis, AxisManager } from "./AxisManager";
import { AxesOption } from "./AxesOption";
import { InterruptManager } from "./InterruptManager";
import { EventManager } from "./EventManager";

interface AnimationParam {
	depaPos: Axis;
	destPos: Axis;
	isBounce: boolean,
	isCircularable: boolean,
	duration: number;
	distance: Axis;
	startTime?: number;
	inputEvent?;
}

export class AnimationManager {
	private _raf;
	private _animateParam: AnimationParam;

	constructor(
		private options: AxesOption,
		private itm: InterruptManager,
		private em: EventManager,
		private axm: AxisManager
	) {
	}

	grab(axes: string[]) {
		if (this._animateParam && !axes.length) {
			const orgPos: Axis = this.axm.get(axes);
			const pos: Axis = this.axm.map(orgPos,
				(v, k, opt) => Coordinate.getCirculatedPos(v, opt.range, opt.circular));
			if (!this.axm.every(pos, (v, k) => orgPos[k] === v)) {
				this.em.triggerChange(this.axm.moveTo(pos), true);
			}
			this._animateParam = null;
			this._raf && window.cancelAnimationFrame(this._raf);
			this._raf = null;
			// this.em.trigger("animationEnd");
		}
	}
	private createAnimationParam(absPos: Axis, duration: number, inputEvent = null): AnimationParam {
		const maximumDuration = this.options.maximumDuration;
		let depaPos: Axis = this.axm.get(Object.keys(absPos));
		let destPos: Axis = this.axm.map(absPos, (v, k, opt) => {
				// depaPos[k],
			return Coordinate.getInsidePosition(
				v,
				opt.range,
				opt.circular
			);
		});

		// remove unnecessary axis
		destPos = this.axm.filter(destPos, (v, k) => depaPos[k] !== v);
		depaPos = this.axm.filter(depaPos, (v, k) => k in destPos);

		// destPos = this.apmCoordinate.isOutToOut(pos, destPos, min, max) ? pos : destPos;
		const distance: Axis = this.axm.map(destPos, (v, k) => v - depaPos[k]);

		return {
			depaPos,
			destPos,
			isBounce: this.axm.every(destPos,
				(v, k, opt) => Coordinate.isOutside(v, opt.range)),
			isCircularable: this.axm.every(destPos,
				(v, k, opt) => Coordinate.isCircularable(v, opt.range, opt.circular)),
			duration: maximumDuration > duration ? duration : maximumDuration,
			distance,
			inputEvent,
			// done: this._animationEnd,
		};
	}

	private restore(axes: string[], complete: () => void, inputEvent = null) {
		const pos: Axis = this.axm.get(axes);
		const destPos: Axis = this.axm.map(pos,
			(v, k, opt) => Math.min(opt.range[1], Math.max(opt.range[0], v)));
		const durations: Axis = this.axm.map(destPos,
			v => Coordinate.getDuration(v, this.options.deceleration));

		this.animateLoop(
			this.createAnimationParam(
				destPos,
				Object.keys(durations).reduce((max, v) => Math.max(max, durations[v]), -Infinity),
				inputEvent
			),
			complete);
	}

	animationEnd() {
		this._animateParam = null;

		// for Circular
		this.setTo(this.axm.map(
			this.axm.get(),
			(v, k, opt) => Coordinate.getCirculatedPos(Math.round(v), opt.range, opt.circular)
		));
		this.itm.setInterrupt(false);
		/**
		 * This event is fired when animation ends.
		 * @ko 에니메이션이 끝났을 때 발생한다.
		 * @name eg.Axes#animationEnd
		 * @event
		 */
		this.em.trigger("animationEnd");
	}

	private animateLoop(param: AnimationParam, complete: () => void) {
		this._animateParam = { ...param };
		this._animateParam.startTime = new Date().getTime();
		if (param.duration) {
			const info: AnimationParam = this._animateParam;
			const self = this;

			(function loop() {
				self._raf = null;
				if (self.frame(info) >= 1) {
					complete();
					return;
				} // animationEnd
				self._raf = window.requestAnimationFrame(loop);
			})();
		} else {
			this.em.triggerChange(this.axm.moveTo(param.destPos));
			complete();
		}
	}

	animateTo(absPos: Axis, duration: number, inputEvent = null) {
		const param: AnimationParam = this.createAnimationParam(absPos, duration, inputEvent);
		const retTrigger = this.em.trigger("animationStart", param);

		// You can't stop the 'animationStart' event when 'circular' is true.
		if (param.isCircularable && !retTrigger) {
			throw new Error(
				"You can't stop the 'animation' event when 'circular' is true."
			);
		}

		if (retTrigger) {
			const queue = [];
			const dequeue = function () {
				const task = queue.shift();
				task && task.call(this);
			};
			if (!AxisManager.equal(param.depaPos, param.destPos)) {
				queue.push(() => this.animateLoop(param, dequeue));
			}
			if (this.axm.every(param.destPos, (v, k, opt) => Coordinate.isOutside(v, opt.range))) {
				queue.push(() => this.restore(Object.keys(param.destPos), dequeue, inputEvent));
			}
			queue.push(() => this.animationEnd());
			dequeue();
		}
	}

	// animation frame (0~1)
	private frame(param: AnimationParam) {
		const curTime = new Date().getTime() - param.startTime;
		const easingPer = this.easing(curTime / param.duration);
		let toPos: Axis = param.depaPos;
		toPos = this.axm.map(toPos, (v, k, opt) => {
			v += (param.destPos[k] - v) * easingPer;
			return Coordinate.getCirculatedPos(v, opt.range, opt.circular);
		});
		this.em.triggerChange(this.axm.moveTo(toPos));
		return easingPer;
	}

	easing(p) {
		// console.log("easing", p, this.options.easing(p));
		return p > 1 ? 1 : this.options.easing(p);
	}

	/**
	 * Moves an element to specific coordinates.
	 * @ko 좌표를 이동한다.
	 * @method eg.Axes#setTo
	 * @param {Number} x The X coordinate to move to <ko>이동할 x좌표</ko>
	 * @param {Number} y The Y coordinate to move to  <ko>이동할 y좌표</ko>
	 * @param {Number} [duration=0] Duration of the animation (unit: ms) <ko>애니메이션 진행 시간(단위: ms)</ko>
	 * @return {eg.Axes} An instance of a module itself <ko>자신의 인스턴스</ko>
	 */
	setTo(pos: Axis, duration: number = 0) {
		const axes: string[] = Object.keys(pos);
		this.grab(axes);
		const orgPos: Axis = this.axm.get(axes);

		if (AxisManager.equal(pos, orgPos)) {
			return this;
		}
		this.itm.setInterrupt(true);
		let movedPos = this.axm.filter(pos, (v, k) => orgPos[k] !== v);
		if (!Object.keys(movedPos).length) {
			return;
		}
		movedPos = this.axm.map(movedPos, (v, k, opt) => {
			v = Coordinate.getInsidePosition(v, opt.range, opt.circular);
			return duration ? v : Coordinate.getCirculatedPos(v, opt.range, opt.circular);
		});
		if (AxisManager.equal(movedPos, orgPos)) {
			return this;
		} else if (duration) {
			this.animateTo(movedPos, duration);
		} else {
			this.em.triggerChange(this.axm.moveTo(movedPos));
			this.itm.setInterrupt(false);
		}
		return this;
	}

	/**
	 * Moves an element from the current coordinates to specific coordinates. The change event is fired when the method is executed.
	 * @ko 현재 좌표를 기준으로 좌표를 이동한다. 메서드가 실행되면 change 이벤트가 발생한다
	 * @method eg.Axes#setBy
	 * @param {Number} x The X coordinate to move to <ko>이동할 x좌표</ko>
	 * @param {Number} y The Y coordinate to move to <ko>이동할 y좌표</ko>
	 * @param {Number} [duration=0] Duration of the animation (unit: ms) <ko>애니메이션 진행 시간(단위: ms)</ko>
	 * @return {eg.Axes} An instance of a module itself <ko>자신의 인스턴스</ko>
	 */
	setBy(pos: Axis, duration = 0) {
		return this.setTo(
			this.axm.map(this.axm.get(Object.keys(pos)), (v, k) => v + pos[k]),
			duration
		);
	}
};
