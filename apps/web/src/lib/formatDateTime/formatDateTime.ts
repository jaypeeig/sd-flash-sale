import { DATE_TIME } from "./formatDateTime.constants";

export const formatDateTime = (iso: string): string => DATE_TIME.format(new Date(iso));
