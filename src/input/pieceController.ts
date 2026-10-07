import * as THREE from 'three';
import type { Game, PlaceResult } from '../core/game';
import { getOrientations } from '../core/orientations';
import { PIECES } from '../core/pieces';
import { fallZ, fits, restingZ, slideToward } from '../core/placement';
import type { BoardSpin } from '../render/boardSpin';
import type { BoardView } from '../render/boardView';
import type { GhostView } from '../render/ghostView';
import type { TrayView } from '../ui/trayView';
import {
  anchorFor,
  initialOrientation,
  rotateForView,
  stepFor,
  type RotationKind,
  type ScreenDirection,
} from './placementMath';

/** Pointer travel (px) that turns a press into a drag. */
const DRAG_THRESHOLD = 6;
/** On touch the aim point sits this far (px) above the finger. */
const TOUCH_LIFT_PX = 80;

export interface PieceControllerDeps {
  game: Game;
  board: BoardView;
  ghost: GhostView;
  spin: BoardSpin;
  tray: TrayView;
  camera: THREE.Camera;
  canvas: HTMLCanvasElement;
  onPlaced: (result: PlaceResult) => void;
}

interface Held {
  slot: number;
  orientation: number;
}

interface Target {
  x: number;
  y: number;
  /** Landing layer, or null when the piece cannot be dropped there. */
  z: number | null;
}

interface FreePosition {
  x: number;
  y: number;
  z: number;
}

/**
 * Picking a tray piece, aiming it over the board, rotating it and dropping it.
 * Press-drag-release from the tray, or click a slot then click the board.
 *
 * Holding Shift switches to free move: the piece's layer locks at its current
 * landing height and it slides toward the cursor within that layer (never
 * through cubes), so it can be tucked under overhangs. W/S or the wheel change
 * the layer. On release it falls until supported.
 */
export class PieceController {
  private held: Held | null = null;
  private pointer: { x: number; y: number; touch: boolean } | null = null;
  private pressAt: { x: number; y: number } | null = null;
  private dragged = false;
  private free: FreePosition | null = null;
  /** Last legal drop spot, so free move can be toggled from a button (no hover on touch). */
  private lastTarget: Target | null = null;
  /** After a keyboard step, ignore the mouse until it actually moves again. */
  private keyStepped = false;
  /** True while a placement animation plays: no ghost, no placing. */
  locked = false;
  private readonly raycaster = new THREE.Raycaster();

  constructor(private readonly deps: PieceControllerDeps) {
    const { canvas } = deps;
    window.addEventListener('pointermove', (e) => this.onMove(e));
    window.addEventListener('pointerup', (e) => this.onUp(e));
    window.addEventListener('keyup', (e) => {
      if (e.key === 'Shift') this.setFree(false);
    });
    window.addEventListener('blur', () => this.setFree(false));
    canvas.addEventListener('pointerdown', (e) => this.onCanvasDown(e));
    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.cancel();
    });
    canvas.addEventListener(
      'wheel',
      (e) => {
        if (!this.held) return;
        e.preventDefault();
        // Shift+wheel scrolls horizontally in some browsers, so read either axis.
        const dir = (e.deltaY || e.deltaX) > 0 ? 1 : -1;
        if (this.free) this.raise(dir === 1 ? -1 : 1);
        else this.rotate('spin', dir);
      },
      { passive: false },
    );
    this.renderTray();
  }

  get holding(): boolean {
    return this.held !== null;
  }

  get isFree(): boolean {
    return this.free !== null;
  }

  /** On-screen Slide button: same as holding / releasing Shift. */
  toggleFree(): void {
    this.setFree(!this.free);
  }

  /** Snapshot for debug tooling. */
  debugState(): {
    held: Held | null;
    pointer: { x: number; y: number } | null;
    target: Target | null;
    free: FreePosition | null;
  } {
    return {
      held: this.held && { ...this.held },
      pointer: this.pointer,
      target: this.target(),
      free: this.free && { ...this.free },
    };
  }

  /** Enter (Shift down) or leave (Shift up) free move. */
  setFree(on: boolean): void {
    if (!on) {
      this.free = null;
      this.keyStepped = false;
      return;
    }
    if (this.free || !this.held) return;
    const aimed = this.target();
    const target = aimed?.z != null ? aimed : this.lastTarget;
    if (target?.z == null) return; // only lock onto a legal landing spot
    this.free = { x: target.x, y: target.y, z: target.z };
  }

  /**
   * Keyboard step (A/D/Z/C, arrows): move the held piece one cell in a screen
   * direction within its layer, never into cubes. Enters free move if needed.
   */
  step(direction: ScreenDirection): void {
    if (!this.held) return;
    this.setFree(true);
    const { free } = this;
    const cells = this.heldCells();
    if (!free || !cells) return;
    const [dx, dy] = stepFor(this.deps.spin.quarter, direction);
    if (fits(this.deps.game.grid, cells, free.x + dx, free.y + dy, free.z)) {
      free.x += dx;
      free.y += dy;
    }
    this.keyStepped = true;
  }

  /** Free move: change the carried layer by `dz` if the piece fits there. */
  raise(dz: 1 | -1): void {
    const { free } = this;
    const cells = this.heldCells();
    if (!free || !cells) return;
    if (fits(this.deps.game.grid, cells, free.x, free.y, free.z + dz)) free.z += dz;
  }

  /** Tray slot pressed. Pressing the held slot again puts it back. */
  pick(slot: number, e: PointerEvent): void {
    const id = this.deps.game.tray.pieces[slot];
    if (!id || this.deps.game.gameOver) return;
    if (this.held?.slot === slot) {
      this.cancel();
      return;
    }
    this.held = { slot, orientation: initialOrientation(id, this.deps.spin.quarter) };
    this.lastTarget = null;
    this.startPress(e);
    this.renderTray();
  }

  rotate(kind: RotationKind, dir: 1 | -1): void {
    if (!this.held) return;
    const id = this.deps.game.tray.pieces[this.held.slot]!;
    const next = rotateForView(id, this.held.orientation, kind, this.deps.spin.quarter, dir);
    const { free } = this;
    // In free move the piece is inside the stack: only rotate if it still fits.
    if (
      free &&
      !fits(this.deps.game.grid, getOrientations(id)[next]!.cells, free.x, free.y, free.z)
    )
      return;
    this.held.orientation = next;
  }

  cancel(): void {
    this.held = null;
    this.free = null;
    this.pressAt = null;
    this.deps.ghost.hide();
    this.renderTray();
  }

  /** Per-frame: keep the ghost on the aimed spot (the board may be spinning). */
  update(): void {
    if (this.locked) {
      this.deps.ghost.hide();
      return;
    }
    if (this.free) {
      this.updateFree(this.free);
      return;
    }
    const held = this.held;
    const target = this.target();
    if (!held || !target) {
      this.deps.ghost.hide();
      return;
    }
    if (target.z !== null) this.lastTarget = target;
    const { game } = this.deps;
    const id = game.tray.pieces[held.slot]!;
    const o = getOrientations(id)[held.orientation]!;
    // Invalid drops show where the piece would rest, poking above the cap.
    const z = target.z ?? restingZ(game.grid, o.cells, target.x, target.y) ?? 0;
    this.deps.ghost.show(o.cells, target.x, target.y, z, PIECES[id].colorId, target.z !== null);
  }

  /** Slide toward the aimed column in the locked layer; show where it will settle. */
  private updateFree(free: FreePosition): void {
    const { game } = this.deps;
    const id = game.tray.pieces[this.held!.slot]!;
    const o = getOrientations(id)[this.held!.orientation]!;
    const column = this.keyStepped ? null : this.aimedColumn();
    const anchor = column && anchorFor(column, o.extent, game.grid.size);
    if (anchor)
      [free.x, free.y] = slideToward(game.grid, o.cells, [free.x, free.y], free.z, anchor);
    const rest = fallZ(game.grid, o.cells, free.x, free.y, free.z) ?? free.z;
    this.deps.ghost.show(o.cells, free.x, free.y, rest, PIECES[id].colorId, true, free.z);
  }

  private heldCells(): readonly (readonly [number, number, number])[] | null {
    const id = this.held && this.deps.game.tray.pieces[this.held.slot];
    return id ? getOrientations(id)[this.held!.orientation]!.cells : null;
  }

  private onCanvasDown(e: PointerEvent): void {
    if (e.button !== 0 || !this.held) return;
    this.startPress(e);
  }

  private startPress(e: PointerEvent): void {
    this.pointer = { x: e.clientX, y: e.clientY, touch: e.pointerType === 'touch' };
    this.pressAt = { x: e.clientX, y: e.clientY };
    this.dragged = false;
  }

  private onMove(e: PointerEvent): void {
    this.pointer = { x: e.clientX, y: e.clientY, touch: e.pointerType === 'touch' };
    this.keyStepped = false;
    if (this.pressAt && !this.dragged) {
      const dist = Math.hypot(e.clientX - this.pressAt.x, e.clientY - this.pressAt.y);
      if (dist > DRAG_THRESHOLD) this.dragged = true;
    }
  }

  private onUp(e: PointerEvent): void {
    if (!this.held || !this.pressAt) return;
    this.pointer = { x: e.clientX, y: e.clientY, touch: e.pointerType === 'touch' };
    const wasDrag = this.dragged;
    this.pressAt = null;

    if (this.deps.tray.contains(e.clientX, e.clientY)) {
      // Dragged back onto the tray: put it back. A plain click keeps holding.
      if (wasDrag) this.cancel();
      return;
    }
    if (this.tryPlace()) return;
    // A failed drag snaps back to the tray; a failed click keeps holding.
    if (wasDrag) this.cancel();
  }

  private tryPlace(): boolean {
    const { held, free } = this;
    if (!held || this.locked) return false;
    let result: PlaceResult | null;
    if (free) {
      result = this.deps.game.placeAt(held.slot, held.orientation, free.x, free.y, free.z);
    } else {
      const target = this.target();
      if (!target || target.z === null) return false;
      result = this.deps.game.place(held.slot, held.orientation, target.x, target.y);
    }
    if (!result) return false;
    this.held = null;
    this.free = null;
    this.deps.ghost.hide();
    this.renderTray();
    this.deps.onPlaced(result);
    return true;
  }

  /** Grid column under the pointer (may be off the board), or null. */
  private aimedColumn(): [number, number] | null {
    const { pointer } = this;
    const { board, camera, canvas } = this.deps;
    // Only aim while the pointer is over the board canvas, not over tray or buttons.
    if (!pointer || document.elementFromPoint(pointer.x, pointer.y) !== canvas) return null;
    // On touch, aim above the finger so the ghost is not hidden under it.
    const y = pointer.y - (pointer.touch ? TOUCH_LIFT_PX : 0);
    const rect = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((pointer.x - rect.left) / rect.width) * 2 - 1,
      -((y - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(ndc, camera);
    return board.pickColumn(this.raycaster);
  }

  /** Drop-from-above target under the pointer. */
  private target(): Target | null {
    const { held } = this;
    const column = held && this.aimedColumn();
    if (!held || !column) return null;
    const { game } = this.deps;

    const id = game.tray.pieces[held.slot]!;
    const o = getOrientations(id)[held.orientation]!;
    const anchor = anchorFor(column, o.extent, game.grid.size);
    if (!anchor) return null;
    const [x, y] = anchor;
    return { x, y, z: game.landingZ(held.slot, held.orientation, x, y) };
  }

  /** Debug: place a tray piece directly, through the same onPlaced path as the mouse. */
  debugPlace(slot: number, orientation: number, x: number, y: number): PlaceResult | null {
    if (this.locked) return null;
    const result = this.deps.game.place(slot, orientation, x, y);
    if (!result) return null;
    this.cancel();
    this.deps.onPlaced(result);
    return result;
  }

  /** After a restart: drop whatever is held and show the new tray. */
  reset(): void {
    this.locked = false;
    this.cancel();
  }

  private renderTray(): void {
    this.deps.tray.render(this.deps.game.tray.pieces, this.held?.slot ?? null);
  }
}
