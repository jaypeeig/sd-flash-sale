import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { UserProvider } from "./UserContext";
import { useUser } from "./user-context";

const TestConsumer = () => {
  const { email, login, logout } = useUser();
  return (
    <div>
      <p>{email ?? "signed out"}</p>
      <button onClick={() => login("user@example.com")}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  );
};

describe("Given the UserProvider", () => {
  describe("When no one has logged in", () => {
    it("Then the user starts signed out", () => {
      render(
        <UserProvider>
          <TestConsumer />
        </UserProvider>,
      );

      expect(screen.getByText("signed out")).toBeInTheDocument();
    });
  });

  describe("When login is called", () => {
    it("Then the email is exposed to consumers", async () => {
      const user = userEvent.setup();
      render(
        <UserProvider>
          <TestConsumer />
        </UserProvider>,
      );

      await user.click(screen.getByText("login"));

      expect(screen.getByText("user@example.com")).toBeInTheDocument();
    });
  });

  describe("When logout is called after signing in", () => {
    it("Then the user is signed out again", async () => {
      const user = userEvent.setup();
      render(
        <UserProvider>
          <TestConsumer />
        </UserProvider>,
      );
      await user.click(screen.getByText("login"));

      await user.click(screen.getByText("logout"));

      expect(screen.getByText("signed out")).toBeInTheDocument();
    });
  });
});
