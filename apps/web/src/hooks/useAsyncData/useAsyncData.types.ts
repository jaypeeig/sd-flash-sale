import type { ApiError } from "../../api/apiFetch";

export interface AsyncData<T> {
  data: T | null;
  error: ApiError | null;
  isLoading: boolean;
  refetch: () => void;
}
