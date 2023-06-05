## Problem

Consider the problem in terms of abstraction.

Imagine you have a conveyor system that contains a handler, inlet and outlet
transport belts. The handler processes inlet belt values one-by-one. Each of the
inlet values results in a new outlet belt.

It is impossible to predict when each unit of the conveyor system will produce
its next value. Nevertheless, it is known that transport belts are used both for
a while and non-stop.

The problem is to handle the values of multiple inlet belts and multiplex the
returned outlet belts into a single stream.

## Solution

Now in simple terms. You have asynchronous iterators that produce other
asynchronous iterators. The goal is to handle the "nesting" independently and
multiplex the results into a single stream.

Let's look at an example:

```ts
import { delay } from "https://deno.land/std@0.190.0/async/delay.ts";

async function* handler(value: number): AsyncIterableIterator<number> {
  while (value) {
    yield value--;

    await delay(500);
  }
}
```

The handler takes a number and returns an asynchronous generator that yields a
new value every second. The generator values are decremented by one until they
reach 0.

Besides the handler there are two inlet belts:

```ts
async function* gen123(): AsyncIterableIterator<number> {
  yield 1;
  yield 2;
  yield 3;
}

async function* gen456(): AsyncIterableIterator<number> {
  yield 4;
  yield 5;
  yield 6;
}
```

We need to handle values from multiple inlet belts and multiplex the results
into a single stream. It's time to use this module!

## Usage

Import the Conveyor class and pass the handler into it.

```ts
import { Conveyor } from "https://deno.land/x/conveyor@1.0.0/mod.ts";

const conveyor = new Conveyor<number, number>(handler);
```

Next, add asynchronous iterators to be handled.

```ts
conveyor.add(gen123());
conveyor.add(gen456());
```

Finally, iterate over the conveyor.

```ts
for await (const value of conveyor) {
  console.log(value);
}
```

The output will be something like this:

```
1 4 2 5 3 6 3 1 4 2 5 2 3 1 4 1 2 3 1 2 1
```

## Features

You can assign a context to each inlet belt.

```ts
async function* handler(
  value: number,
  context: number,
): AsyncIterableIterator<number> {
  for (let i = 0; i < context; i++) {
    yield value;

    await delay(500);
  }
}

const conveyor = new Conveyor<number, number, number>(handler);

conveyor.add(gen123(), 4);
conveyor.add(gen456(), 2);
```

The output will be something like this:

```
1 4 2 5 3 6 1 4 2 5 3 6 1 2 3 1 2 3
```

You can write a handler that returns both the outlet belt and the value
directly.

```ts
const handler = (value: number, power: number): number => value ** power;

const conveyor = new Conveyor<number, number, number>(handler);

conveyor.add(gen123(), 2);
conveyor.add(gen456(), 3);
```

The output will be something like this:

```
1 64 4 125 9 216
```
