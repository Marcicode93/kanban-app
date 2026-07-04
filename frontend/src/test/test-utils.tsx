import "@testing-library/jest-dom";
import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement } from "react";
import { ThemeProvider } from "@/lib/theme";

export const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) => render(ui, { wrapper: ThemeProvider, ...options });
