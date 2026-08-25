import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import App from "./App";
import { UserProvider } from "./context/UserContext";
import { useUser } from "./context/user-context";

const LoginStub = () => {
  const { login } = useUser();
  return <button onClick={() => login("user@example.com")}>do-login</button>;
};

const renderApp = () => {
  return render(
    <UserProvider>
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<App />}>
            <Route index element={<p>home</p>} />
            <Route path="login" element={<LoginStub />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </UserProvider>,
  );
};

describe("Given no user is signed in", () => {
  describe("When the navbar is rendered", () => {
    beforeEach(() => {
      renderApp();
    });

    it("Then a Login link is shown", () => {
      expect(screen.getByRole("link", { name: "Login" })).toBeInTheDocument();
    });

    it("Then no Sign out button is present", () => {
      expect(screen.queryByText("Sign out")).not.toBeInTheDocument();
    });
  });

  describe("When the user signs in", () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      renderApp();
      await user.click(screen.getByRole("link", { name: "Login" }));
      await user.click(screen.getByText("do-login"));
    });

    it("Then the navbar shows the email", () => {
      expect(screen.getByText("user@example.com")).toBeInTheDocument();
    });

    it("Then the navbar shows a Sign out button", () => {
      expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    });
  });
});

describe("Given a signed-in user", () => {
  describe("When they sign out", () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      renderApp();
      await user.click(screen.getByRole("link", { name: "Login" }));
      await user.click(screen.getByText("do-login"));
      await user.click(screen.getByRole("button", { name: "Sign out" }));
    });

    it("Then the navbar reverts to the Login link", () => {
      expect(screen.getByRole("link", { name: "Login" })).toBeInTheDocument();
    });

    it("Then the signed-in email is no longer shown", () => {
      expect(screen.queryByText("user@example.com")).not.toBeInTheDocument();
    });
  });
});
