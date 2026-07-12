import { vi } from "vitest";
import { setMockFunctionFactory } from "./mock_function";

setMockFunctionFactory(vi.fn);
