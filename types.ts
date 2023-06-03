export enum BeltType {
  INLET = "inlet",
  OUTLET = "outlet",
}

export interface BaseEvent<T> {
  readonly type: BeltType;
  readonly value: T;
  readonly iterator: AsyncIterator<T>;
}

export interface InletEvent<InletValue, Context = void>
  extends BaseEvent<InletValue> {
  readonly type: BeltType.INLET;
  readonly context: Context;
}

export interface OutletEvent<OutletValue> extends BaseEvent<OutletValue> {
  readonly type: BeltType.OUTLET;
}

export type Event<InletValue, OutletValue, Context = void> =
  | InletEvent<InletValue, Context>
  | OutletEvent<OutletValue>;

export type PromiseOrValue<T> = Promise<T> | T;

export type Handler<InletValue, OutletValue, Context = void> = (
  value: InletValue,
  context: Context,
) => PromiseOrValue<OutletValue | AsyncIterable<OutletValue>>;
