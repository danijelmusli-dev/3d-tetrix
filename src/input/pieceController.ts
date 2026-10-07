import * as THREE from 'three';
import type { Game, PlaceResult } from '../core/game';
import { getOrientations } from '../core/orientations';
import { PIECES } from '../core/pieces';
import { restingZ } from '../core/placement';
import type { BoardSpin } from '../render/boardSpin';
import type { BoardView } from '../render/boardView';
import type { GhostView } from '../render/ghostView';
import type { TrayView } from '../ui/trayView';
import { anchorFor, initialOrientation, rotateForView, type RotationKind } from './placementMath';

/** Pointer travel (px) that turns a press into a drag. */
const DRAG_THRESHOLD = 6;

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

/**
 * Picking a tray piece, aiming it over the board, rotating it and dropping it.
 * Press-drag-release from the tray, or click a slot then click the board.
 */
export class PieceController {
  private held: Held | null = null;
  private pointer: { x: number; y: number } | null = null;
  private pressAt: { x: number; y: number } | null = null;
  private dragged = false;
  private readonly raycaster = new THREE.Raycaster();

  constructor(private readonly deps: PieceControllerDeps) {
    const { canvas } = deps;
    window.addEventListener('pointermove', (e) => this.onMove(e));
    window.addEventListener('pointerup', (e) => this.onUp(e));
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
        this.rotate('spin', e.deltaY > 0 ? 1 : -1);
      },
      { passive: false },
    );
    this.renderTray();
  }

  get holding(): boolean {
    return this.held !== null;
  }

  /** Snapshot for debug tooling. */
  debugState(): {
    held: Held | null;
    pointer: { x: number; y: number } | null;
    target: Target | null;
  } {
    return { held: this.held && { ...this.held }, pointer: this.pointer, target: this.target() };
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
    this.startPress(e);
    this.renderTray();
  }

  rotate(kind: RotationKind, dir: 1 | -1): void {
    if (!this.held) return;
    const id = this.deps.game.tray.pieces[this.held.slot]!;
    this.held.orientation = rotateForView(
      id,
      this.held.orientation,
      kind,
      this.deps.spin.quarter,
      dir,
    );
  }

  cancel(): void {
    this.held = null;
    this.pressAt = null;
    this.deps.ghost.hide();
    this.renderTray();
  }

  /** Per-frame: keep the ghost on the aimed spot (the board may be spinning). */
  update(): void {
    const held = this.held;
    const target = this.target();
    if (!held || !target) {
      this.deps.ghost.hide();
      return;
    }
    const { game } = this.deps;
    const id = game.tray.pieces[held.slot]!;
    const o = getOrientations(id)[held.orientation]!;
    // Invalid drops show where the piece would rest, poking above the cap.
    const z = target.z ?? restingZ(game.grid, o.cells, target.x, target.y) ?? 0;
    this.deps.ghost.show(o.cells, target.x, target.y, z, PIECES[id].colorId, target.z !== null);
  }

  private onCanvasDown(e: PointerEvent): void {
    if (e.button !== 0 || !this.held) return;
    this.startPress(e);
  }

  private startPress(e: PointerEvent): void {
    this.pointer = { x: e.clientX, y: e.clientY };
    this.pressAt = { x: e.clientX, y: e.clientY };
    this.dragged = false;
  }

  private onMove(e: PointerEvent): void {
    this.pointer = { x: e.clientX, y: e.clientY };
    if (this.pressAt && !this.dragged) {
      const dist = Math.hypot(e.clientX - this.pressAt.x, e.clientY - this.pressAt.y);
      if (dist > DRAG_THRESHOLD) this.dragged = true;
    }
  }

  private onUp(e: PointerEvent): void {
    if (!this.held || !this.pressAt) return;
    this.pointer = { x: e.clientX, y: e.clientY };
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
    const held = this.held;
    const target = this.target();
    if (!held || !target || target.z === null) return false;
    const result = this.deps.game.place(held.slot, held.orientation, target.x, target.y);
    if (!result) return false;
    this.held = null;
    this.deps.ghost.hide();
    this.renderTray();
    this.deps.onPlaced(result);
    return true;
  }

  private target(): Target | null {
    const { held, pointer } = this;
    if (!held || !pointer) return null;
    const { game, board, camera, canvas } = this.deps;
    if (this.deps.tray.contains(pointer.x, pointer.y)) return null;

    const rect = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((pointer.x - rect.left) / rect.width) * 2 - 1,
      -((pointer.y - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(ndc, camera);
    const column = board.pickColumn(this.raycaster);
    if (!column) return null;

    const id = game.tray.pieces[held.slot]!;
    const o = getOrientations(id)[held.orientation]!;
    const anchor = anchorFor(column, o.extent, game.grid.size);
    if (!anchor) return null;
    const [x, y] = anchor;
    return { x, y, z: game.landingZ(held.slot, held.orientation, x, y) };
  }

  private renderTray(): void {
    this.deps.tray.render(this.deps.game.tray.pieces, this.held?.slot ?? null);
  }
}
