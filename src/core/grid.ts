/** Grid coordinate: x and y span the board footprint, z is height (0 = floor). */
export type Vec3 = readonly [x: number, y: number, z: number];

export interface FilledCell {
  pos: Vec3;
  colorId: number;
}

/** Board occupancy. Each cell holds 0 (empty) or a piece colorId. */
export class Grid {
  readonly cells: Uint8Array;

  constructor(
    readonly size: number,
    readonly height: number,
    cells?: Uint8Array,
  ) {
    const length = size * size * height;
    this.cells = cells ?? new Uint8Array(length);
    if (this.cells.length !== length) {
      throw new Error(`Expected ${length} cells, got ${this.cells.length}`);
    }
  }

  inBounds(x: number, y: number, z: number): boolean {
    return x >= 0 && y >= 0 && z >= 0 && x < this.size && y < this.size && z < this.height;
  }

  get(x: number, y: number, z: number): number {
    return this.cells[this.index(x, y, z)]!;
  }

  set(x: number, y: number, z: number, colorId: number): void {
    this.cells[this.index(x, y, z)] = colorId;
  }

  isEmpty(x: number, y: number, z: number): boolean {
    return this.get(x, y, z) === 0;
  }

  /** Highest filled layer + 1 (0 for an empty board). */
  stackHeight(): number {
    const layer = this.size * this.size;
    for (let z = this.height - 1; z >= 0; z--) {
      if (this.cells.subarray(z * layer, (z + 1) * layer).some((v) => v !== 0)) return z + 1;
    }
    return 0;
  }

  clone(): Grid {
    return new Grid(this.size, this.height, this.cells.slice());
  }

  /** Filled cells in index order (x fastest, then y, then z). */
  *filled(): Generator<FilledCell> {
    const { size } = this;
    for (let i = 0; i < this.cells.length; i++) {
      const colorId = this.cells[i]!;
      if (colorId === 0) continue;
      yield {
        pos: [i % size, Math.floor(i / size) % size, Math.floor(i / (size * size))],
        colorId,
      };
    }
  }

  private index(x: number, y: number, z: number): number {
    if (!this.inBounds(x, y, z)) throw new RangeError(`Cell (${x}, ${y}, ${z}) out of bounds`);
    return x + y * this.size + z * this.size * this.size;
  }
}
