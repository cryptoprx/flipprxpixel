import { Platform } from './types';

const CELL_WIDTH = 64;

export class SpatialGrid {
  private buckets = new Map<number, Platform[]>();
  private moving: Platform[] = [];
  private queryResult: Platform[] = [];
  private seenStamp = new Int32Array(4096);
  private currentStamp = 1;

  build(platforms: Platform[]) {
    this.buckets.clear();
    this.moving = [];
    let maxId = 0;

    for (let i = 0; i < platforms.length; i++) {
      const p = platforms[i];
      if (p.id > maxId) maxId = p.id;

      if (p.type === 'moving' || p.type === 'gate') {
        this.moving.push(p);
        continue;
      }

      const startCell = Math.floor(p.x / CELL_WIDTH);
      const endCell = Math.floor((p.x + p.width) / CELL_WIDTH);
      for (let c = startCell; c <= endCell; c++) {
        let bucket = this.buckets.get(c);
        if (!bucket) {
          bucket = [];
          this.buckets.set(c, bucket);
        }
        bucket.push(p);
      }
    }

    if (maxId + 2 > this.seenStamp.length) {
      this.seenStamp = new Int32Array(maxId + 256);
    }
  }

  query(minX: number, maxX: number): Platform[] {
    this.queryResult.length = 0;
    this.currentStamp = (this.currentStamp + 1) & 0x7fffffff;
    if (this.currentStamp === 0) {
      this.seenStamp.fill(0);
      this.currentStamp = 1;
    }
    const stamp = this.currentStamp;

    const startCell = Math.floor(minX / CELL_WIDTH);
    const endCell = Math.floor(maxX / CELL_WIDTH);

    for (let c = startCell; c <= endCell; c++) {
      const bucket = this.buckets.get(c);
      if (!bucket) continue;
      for (let i = 0; i < bucket.length; i++) {
        const p = bucket[i];
        if (!p.broken && this.seenStamp[p.id] !== stamp) {
          this.seenStamp[p.id] = stamp;
          this.queryResult.push(p);
        }
      }
    }

    for (let i = 0; i < this.moving.length; i++) {
      const p = this.moving[i];
      if (!p.broken && p.x + p.width >= minX && p.x <= maxX) {
        this.queryResult.push(p);
      }
    }

    return this.queryResult;
  }
}
