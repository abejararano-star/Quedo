import assert from "node:assert/strict";
import test from "node:test";
import { stayQuote, todayInBogota } from "../src/lib/stay-quote";

const quote = (arrival: string, departure: string, people = "2", price: number | null = 95000) =>
  stayQuote(arrival, departure, people, 4, price, "2026-11-22");
test("subtotal por noches, incluso al cruzar un mes", () => {
  assert.deepEqual(quote("2026-11-30", "2026-12-03"), { nights: 3, subtotal: 285000, error: "" });
});
test("fechas imposibles, pasadas, incompletas o invertidas y capacidad inválida", () => {
  for (const [start, end, people] of [["2026-11-31","2026-12-03"],["2026-11-21","2026-11-23"],["","2026-12-03"],["2026-12-03",""],["2026-12-03","2026-12-03"],["2026-12-04","2026-12-03"],["","","5"],["","","1.2"]]) {
    assert.ok(quote(start,end,people).error);
  }
});
test("una consulta abierta o sin tarifa conocida carece de subtotal", () => {
  assert.deepEqual(quote("",""), { nights: 0, subtotal: null, error: "" });
  for (const price of [null,0,-1]) assert.equal(quote("2026-12-01","2026-12-04","1",price).subtotal, null);
  assert.equal(todayInBogota(new Date("2026-11-23T01:00:00Z")), "2026-11-22");
});