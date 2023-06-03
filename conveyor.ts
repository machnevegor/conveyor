import type { Deferred } from "./deps.ts";
import { deferred, isAsyncIterable } from "./deps.ts";
import type { Event, Handler, InletEvent, OutletEvent } from "./types.ts";
import { BeltType } from "./types.ts";

/**
 * The {@link Conveyor} class handles multiple asynchronous iterators and
 * multiplexes their values (asynchronous iterators or values) into a single
 * stream. It currently makes an assumption that the final result (the value
 * returned and not yielded from both the inlet and outlet iterator) does not
 * matter; if there is any result, it is discarded.
 *
 * @example
 * ```typescript
 * import { delay } from "https://deno.land/std@0.190.0/async/delay.ts";
 * import { Conveyor } from "https://deno.land/x/conveyor@0.1.0/mod.ts";
 *
 * async function* oscillator() {
 *   let i = 0;
 *
 *   while (true) {
 *     yield i++;
 *
 *     await delay(1000);
 *   }
 * }
 *
 * async function* handler(value: number, context: string) {
 *   if (value % 3600) return;
 *
 *   const reps = Math.floor(value / 3600) % 12 || 12;
 *
 *   for (let i = 0; i < reps; i++) {
 *     yield `${context} #${i + 1}`;
 *
 *     await delay(1000);
 *   }
 * }
 *
 * const conveyor = new Conveyor<number, string, string>(handler);
 *
 * conveyor.addInletBelt(oscillator(), "Cuckoo!");
 * conveyor.addInletBelt(oscillator(), "Ding-dong!");
 * conveyor.addInletBelt(oscillator(), "Bing-bong!");
 *
 * for await (const value of conveyor) {
 *   console.log(value);
 * }
 * ```
 *
 * @see {@link https://deno.land/std@0.190.0/async/mux_async_iterator.ts?s=MuxAsyncIterator | MuxAsyncIterator}
 */
export class Conveyor<InletValue, OutletValue, Context = void>
  implements AsyncIterable<OutletValue> {
  readonly handler: Handler<InletValue, OutletValue, Context>;

  private iteratorCount: number;
  private events: Event<InletValue, OutletValue, Context>[];
  private signal: Deferred<void>;

  // deno-lint-ignore no-explicit-any
  private throws: any[];

  constructor(handler: Handler<InletValue, OutletValue, Context>) {
    this.handler = handler;

    this.iteratorCount = 0;
    this.events = [];
    this.signal = deferred();

    this.throws = [];
  }

  public addInletBelt(
    belt: AsyncIterable<InletValue>,
    context: Context,
  ): void {
    this.iteratorCount++;

    this.callInletNext(belt[Symbol.asyncIterator](), context);
  }

  public addOutletBelt(belt: AsyncIterable<OutletValue>): void {
    this.iteratorCount++;

    this.callOutletNext(belt[Symbol.asyncIterator]());
  }

  [Symbol.asyncIterator](): AsyncIterator<OutletValue> {
    return this.iterate();
  }

  private async callInletNext(
    iterator: AsyncIterator<InletValue>,
    context: Context,
  ): Promise<void> {
    try {
      const { value, done } = await iterator.next();

      if (done) {
        this.iteratorCount--;
      } else {
        const event: InletEvent<InletValue, Context> = {
          type: BeltType.INLET,
          value,
          context,
          iterator,
        };

        this.events.push(event);
      }
    } catch (error) {
      this.iteratorCount--;

      this.throws.push(error);
    }

    this.signal.resolve();
  }

  private async callOutletNext(
    iterator: AsyncIterator<OutletValue>,
  ): Promise<void> {
    try {
      const { value, done } = await iterator.next();

      if (done) {
        this.iteratorCount--;
      } else {
        const event: OutletEvent<OutletValue> = {
          type: BeltType.OUTLET,
          value,
          iterator,
        };

        this.events.push(event);
      }
    } catch (error) {
      this.iteratorCount--;

      this.throws.push(error);
    }

    this.signal.resolve();
  }

  private async *iterate(): AsyncIterableIterator<OutletValue> {
    while (this.iteratorCount) {
      await this.signal;

      for (let i = 0; i < this.events.length; i++) {
        const event = this.events[i];

        switch (event.type) {
          case BeltType.INLET: {
            const result = await this.handler(event.value, event.context);

            if (isAsyncIterable<OutletValue>(result)) {
              this.addOutletBelt(result);
            } else {
              yield result;
            }

            this.callInletNext(event.iterator, event.context);

            break;
          }
          case BeltType.OUTLET: {
            yield event.value;

            this.callOutletNext(event.iterator);

            break;
          }
        }
      }

      if (this.throws.length) {
        for (const error of this.throws) {
          throw error;
        }

        this.throws.length = 0;
      }

      this.events.length = 0;
      this.signal = deferred();
    }
  }
}
