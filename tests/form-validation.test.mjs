import assert from "node:assert/strict";
import test from "node:test";
import {
  sanitizeLoginCredentials,
  validateLoginCredentials,
} from "../src/utils/loginValidation.ts";
import {
  sanitizeStockAdjustmentForm,
  validateStockAdjustmentForm,
} from "../src/utils/stockAdjustmentValidation.ts";
import {
  sanitizeStockCountBarcode,
  validateStockCountBarcode,
} from "../src/utils/stockCountValidation.ts";
import {
  sanitizeSupplierForm,
  validateSupplierForm,
} from "../src/utils/supplierFormValidation.ts";
import {
  sanitizeTransferForm,
  validateTransferForm,
} from "../src/utils/transferFormValidation.ts";

test("login validation trims email but preserves password exactly", () => {
  assert.deepEqual(validateLoginCredentials({ email: "", password: "" }), {
    email: "Informe seu e-mail.", password: "Informe sua senha.",
  });
  assert.deepEqual(validateLoginCredentials({ email: "admin@123", password: "valid" }), {});
  assert.ok(validateLoginCredentials({ email: "pessoa@example.com", password: "x".repeat(129) }).password);
  assert.deepEqual(sanitizeLoginCredentials({ email: " pessoa@example.com ", password: "  segredo  " }), {
    email: "pessoa@example.com", password: "  segredo  ",
  });
});

test("stock adjustment rejects invalid quantities and sanitizes observations", () => {
  const form = { product: " Produto ", quantity: "2", type: "Avaria", observation: " Nota ", responsible: " Joana " };
  assert.deepEqual(validateStockAdjustmentForm(form), {});
  assert.equal(validateStockAdjustmentForm({ ...form, quantity: "0" }).quantity, "Informe uma quantidade numérica maior que zero.");
  assert.equal(sanitizeStockAdjustmentForm(form).responsible, "Joana");
});

test("stock count requires scope and barcode, then bounds the sanitized barcode", () => {
  assert.ok(validateStockCountBarcode({ scope: "", barcode: "" }).scope);
  assert.ok(validateStockCountBarcode({ scope: "Laticínios", barcode: "" }).barcode);
  assert.equal(sanitizeStockCountBarcode(` ${"1".repeat(60)} `).length, 50);
});

test("supplier and transfer validators reject invalid domain selections", () => {
  const supplier = { addressId: "", tradeName: "Fornecedor", cnpj: "123", email: "", phone: "", active: true };
  assert.ok(validateSupplierForm(supplier).addressId);
  assert.ok(validateSupplierForm(supplier).cnpj);
  assert.equal(sanitizeSupplierForm({ ...supplier, tradeName: " Fornecedor " }).tradeName, "Fornecedor");

  const transfer = {
    employeeId: "1", sourceStoreId: "store-a", destinationStoreId: "store-a",
    requestDate: "2026-05-10", completionDate: "2026-05-09", suggestedActionId: "", observation: " nota ",
  };
  assert.ok(validateTransferForm(transfer).destinationStoreId);
  assert.ok(validateTransferForm(transfer).completionDate);
  assert.equal(sanitizeTransferForm(transfer).observation, "nota");
});

