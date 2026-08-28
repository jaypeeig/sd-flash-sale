import { EMAIL_PATTERN } from "./validateEmail.constants";

export const isValidEmail = (email: string): boolean => {
  return EMAIL_PATTERN.test(email.trim());
};
