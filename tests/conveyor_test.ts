import { Conveyor } from "../mod.ts";
import { assertEquals, assertRejects } from "./deps.ts";

const pow = (value: number, power: number) => value ** power;

async function* ipow(value: number, power: number) {
  yield pow(value, power);
}

const square = (value: number) => pow(value, 2);

const isquare = (value: number) => ipow(value, 2);

async function* gen123() {
  yield 1;
  yield 2;
  yield 3;
}

async function* gen456() {
  yield 4;
  yield 5;
  yield 6;
}

async function* genThrows() {
  yield 7;

  throw new Error("Something went wrong!");
}

Deno.test(
  "[Conveyor] Handler returns value (without Context)",
  async () => {
    const conveyor = new Conveyor<number, number>(square);

    conveyor.addInletBelt(gen123());
    conveyor.addInletBelt(gen456());

    const values = new Set();
    for await (const value of conveyor) {
      values.add(value);
    }

    assertEquals(values, new Set([1, 4, 9, 16, 25, 36]));
  },
);

Deno.test(
  "[Conveyor] Handler returns promise on the value (without Context)",
  async () => {
    const conveyor = new Conveyor<number, number>(
      (value) => new Promise((resolve) => resolve(square(value))),
    );

    conveyor.addInletBelt(gen123());
    conveyor.addInletBelt(gen456());

    const values = new Set();
    for await (const value of conveyor) {
      values.add(value);
    }

    assertEquals(values, new Set([1, 4, 9, 16, 25, 36]));
  },
);

Deno.test(
  "[Conveyor] Handler returns async iterable (without Context)",
  async () => {
    const conveyor = new Conveyor<number, number>(isquare);

    conveyor.addInletBelt(gen123());
    conveyor.addInletBelt(gen456());

    const values = new Set();
    for await (const value of conveyor) {
      values.add(value);
    }

    assertEquals(values, new Set([1, 4, 9, 16, 25, 36]));
  },
);

Deno.test(
  "[Conveyor] Handler returns promise on the async iterable (without Context)",
  async () => {
    const conveyor = new Conveyor<number, number>(
      (value) => new Promise((resolve) => resolve(isquare(value))),
    );

    conveyor.addInletBelt(gen123());
    conveyor.addInletBelt(gen456());

    const values = new Set();
    for await (const value of conveyor) {
      values.add(value);
    }

    assertEquals(values, new Set([1, 4, 9, 16, 25, 36]));
  },
);

Deno.test(
  "[Conveyor] Handler returns value (with Context)",
  async () => {
    const conveyor = new Conveyor<number, number, number>(pow);

    conveyor.addInletBelt(gen123(), 2);
    conveyor.addInletBelt(gen456(), 3);

    const values = new Set();
    for await (const value of conveyor) {
      values.add(value);
    }

    assertEquals(values, new Set([1, 4, 9, 64, 125, 216]));
  },
);

Deno.test(
  "[Conveyor] Handler returns promise on the value (with Context)",
  async () => {
    const conveyor = new Conveyor<number, number, number>(
      (value, context) =>
        new Promise((resolve) => resolve(pow(value, context))),
    );

    conveyor.addInletBelt(gen123(), 2);
    conveyor.addInletBelt(gen456(), 3);

    const values = new Set();
    for await (const value of conveyor) {
      values.add(value);
    }

    assertEquals(values, new Set([1, 4, 9, 64, 125, 216]));
  },
);

Deno.test(
  "[Conveyor] Handler returns async iterable (with Context)",
  async () => {
    const conveyor = new Conveyor<number, number, number>(ipow);

    conveyor.addInletBelt(gen123(), 2);
    conveyor.addInletBelt(gen456(), 3);

    const values = new Set();
    for await (const value of conveyor) {
      values.add(value);
    }

    assertEquals(values, new Set([1, 4, 9, 64, 125, 216]));
  },
);

Deno.test(
  "[Conveyor] Handler returns promise on the async iterable (with Context)",
  async () => {
    const conveyor = new Conveyor<number, number, number>(
      (value, context) =>
        new Promise((resolve) => resolve(ipow(value, context))),
    );

    conveyor.addInletBelt(gen123(), 2);
    conveyor.addInletBelt(gen456(), 3);

    const values = new Set();
    for await (const value of conveyor) {
      values.add(value);
    }

    assertEquals(values, new Set([1, 4, 9, 64, 125, 216]));
  },
);

Deno.test(
  "[Conveyor] Handler throws error",
  async () => {
    const conveyor = new Conveyor<number, number>(
      () => {
        throw new Error("Something went wrong!");
      },
    );

    conveyor.addInletBelt(gen123());
    conveyor.addInletBelt(gen456());

    const values = new Set();

    await assertRejects(
      async () => {
        for await (const value of conveyor) {
          values.add(value);
        }
      },
      Error,
      "Something went wrong!",
    );

    assertEquals(values, new Set());
  },
);

Deno.test(
  "[Conveyor] Inlet belt throws error",
  async () => {
    const conveyor = new Conveyor<number, number>(square);

    conveyor.addInletBelt(gen123());
    conveyor.addInletBelt(gen456());

    conveyor.addInletBelt(genThrows());

    const values = new Set();

    await assertRejects(
      async () => {
        for await (const value of conveyor) {
          values.add(value);
        }
      },
      Error,
      "Something went wrong!",
    );

    assertEquals(values, new Set([1, 4, 9, 16, 25, 36, 49]));
  },
);

Deno.test(
  "[Conveyor] Outlet belt throws error",
  async () => {
    const conveyor = new Conveyor<number, number>(square);

    conveyor.addInletBelt(gen123());
    conveyor.addInletBelt(gen456());

    conveyor.addOutletBelt(genThrows());

    const values = new Set();

    await assertRejects(
      async () => {
        for await (const value of conveyor) {
          values.add(value);
        }
      },
      Error,
      "Something went wrong!",
    );

    assertEquals(values, new Set([1, 4, 7, 9, 16, 25, 36]));
  },
);
