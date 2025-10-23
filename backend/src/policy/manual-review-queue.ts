import { ReviewNote } from './review-note';

/** Simple in-memory queue for review notes requiring manual action. */
export class ManualReviewQueue {
  private queue: ReviewNote[] = [];

  enqueue(note: ReviewNote) {
    this.queue.push(note);
  }

  dequeue(): ReviewNote | undefined {
    return this.queue.shift();
  }

  get length() {
    return this.queue.length;
  }
}
