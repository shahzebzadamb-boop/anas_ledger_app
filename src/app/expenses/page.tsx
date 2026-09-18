"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/dates";
import { formatPKR, methodLabel } from "@/lib/money";
import { useLedger } from "@/lib/store";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/types";

export default function ExpensesPage() {
  const { state, dispatch } = useLedger();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0].value);
  const [method, setMethod] = useState(PAYMENT_METHODS[0].value);
  const [flat, setFlat] = useState("");

  const expenses = [...state.expenses].sort((a, b) =>
    a.spentAt < b.spentAt ? 1 : -1,
  );

  return (
    <div className="space-y-4">
      <PageHeader title="Expenses" subtitle="Money spent by the business." />
      <Card className="space-y-3">
        <h2 className="font-medium">Add expense</h2>
        <input
          placeholder="Description"
          className="w-full rounded-xl border border-border px-3"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <input
          type="number"
          min={1}
          placeholder="Amount"
          className="w-full rounded-xl border border-border px-3"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
        <select
          className="w-full rounded-xl border border-border bg-surface px-3"
          value={category}
          onChange={(event) => setCategory(event.target.value as typeof category)}
        >
          {EXPENSE_CATEGORIES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <select
          className="w-full rounded-xl border border-border bg-surface px-3"
          value={method}
          onChange={(event) => setMethod(event.target.value as typeof method)}
        >
          {PAYMENT_METHODS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <input
          placeholder="Optional flat"
          className="w-full rounded-xl border border-border px-3"
          value={flat}
          onChange={(event) => setFlat(event.target.value)}
        />
        <Button
          variant="primary"
          className="w-full"
          onClick={() => {
            const value = Number(amount);
            if (!value || !description.trim()) return;
            dispatch({
              type: "ADD_EXPENSE",
              payload: {
                amount: value,
                description: description.trim(),
                category,
                method,
                flat: flat.trim() || null,
              },
            });
            setAmount("");
            setDescription("");
            setFlat("");
          }}
        >
          Save expense
        </Button>
      </Card>
      {expenses.map((expense) => (
        <Card key={expense.id} className="flex items-center justify-between gap-3">
          <div>
            <p className="font-medium">{expense.description}</p>
            <p className="mt-1 text-sm text-muted">
              {expense.category.toLowerCase()} · {methodLabel(expense.method)} · {formatDate(expense.spentAt)}
              {expense.flat ? ` · Flat ${expense.flat}` : ""}
            </p>
          </div>
          <p className="font-semibold">{formatPKR(expense.amount)}</p>
        </Card>
      ))}
    </div>
  );
}
