import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import FormErrorHighlights from "@/components/shared/FormErrorHighlights";

it("dismisses native form highlights outside the fields until another submit attempt", () => {
  render(
    <>
      <FormErrorHighlights />
      <form aria-label="Details">
        <label>Name <input required aria-invalid="true" /></label>
      </form>
      <button type="button">Outside</button>
    </>
  );

  const form = screen.getByRole("form");
  const name = screen.getByRole("textbox");
  fireEvent.invalid(name);
  expect(form).toHaveAttribute("data-show-form-errors");
  fireEvent.pointerDown(name);
  expect(form).toHaveAttribute("data-show-form-errors");
  fireEvent.pointerDown(screen.getByText("Outside"));
  expect(form).not.toHaveAttribute("data-show-form-errors");
  expect(name).toHaveAttribute("aria-invalid", "true");
  fireEvent.input(name);
  expect(form).not.toHaveAttribute("data-show-form-errors");
  fireEvent.invalid(name);
  expect(form).toHaveAttribute("data-show-form-errors");
});

it("shows and dismisses highlights for custom upload actions", () => {
  render(
    <>
      <FormErrorHighlights />
      <section aria-label="Scan upload" data-form-validation-scope>
        <button type="button" data-form-validation-submit>Upload Document</button>
      </section>
      <button type="button">Outside</button>
    </>
  );

  const scope = screen.getByRole("region");
  const submit = screen.getByText("Upload Document");
  fireEvent.click(submit);
  expect(scope).toHaveAttribute("data-show-form-errors");
  fireEvent.pointerDown(screen.getByText("Outside"));
  expect(scope).not.toHaveAttribute("data-show-form-errors");
  fireEvent.click(submit);
  expect(scope).toHaveAttribute("data-show-form-errors");
});
