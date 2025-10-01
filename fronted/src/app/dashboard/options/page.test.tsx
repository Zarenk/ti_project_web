import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { useForm, type FieldErrors, type Resolver } from "react-hook-form";
import { StrictMode } from "react";

import { MaintenanceSection, type SettingsFormData } from "./page";
import { defaultSiteSettings } from "@/context/site-settings-schema";

const REQUIRED_MESSAGE = "El mensaje de mantenimiento es obligatorio.";

type ResolverResult = ReturnType<Resolver<SettingsFormData>>;

type RenderResult = {
  container: HTMLDivElement;
  unmount: () => Promise<void>;
};

function MaintenanceSectionTestForm() {
  const resolver: Resolver<SettingsFormData> = async (values) => {
    const trimmedMessage = values.maintenance.message?.trim() ?? "";

    if (!trimmedMessage) {
      return {
        values,
        errors: {
          maintenance: {
            message: REQUIRED_MESSAGE,
          },
        } as unknown as FieldErrors<SettingsFormData>,
      } satisfies Awaited<ResolverResult>;
    }

    return {
      values,
      errors: {},
    } satisfies Awaited<ResolverResult>;
  };

  const form = useForm<SettingsFormData>({
    resolver,
    mode: "onSubmit",
    defaultValues: {
      ...defaultSiteSettings,
      maintenance: {
        ...defaultSiteSettings.maintenance,
        enabled: true,
        message: "",
      },
    },
  });

  return (
    <form data-testid="maintenance-form" onSubmit={form.handleSubmit(() => undefined)}>
      <MaintenanceSection
        register={form.register}
        errors={form.formState.errors}
        watch={form.watch}
        setValue={form.setValue}
        control={form.control}
      />
      <button type="submit">Guardar</button>
    </form>
  );
}

function renderMaintenanceSection() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const root = createRoot(container);

  act(() => {
    root.render(
      <StrictMode>
        <MaintenanceSectionTestForm />
      </StrictMode>,
    );
  });

  return {
    container,
    unmount: async () => {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  } satisfies RenderResult;
}

describe("MaintenanceSection", () => {
  it("shows an error message when submitting an empty maintenance message", async () => {
    const { container, unmount } = renderMaintenanceSection();

    const form = container.querySelector("form");
    expect(form).not.toBeNull();

    await act(async () => {
      form!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    const errorMessage = container.querySelector(".text-destructive");
    expect(errorMessage?.textContent).toBe(REQUIRED_MESSAGE);

    await unmount();
  });
});