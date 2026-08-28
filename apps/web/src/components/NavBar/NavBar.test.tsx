import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { UserProvider, useUser } from "../../context/UserContext";
import NavBar from "./NavBar";

const LoginTrigger = () => {
  const { login } = useUser();
  return <button onClick={() => login("user@example.com")}>do-login</button>;
};

const renderNavBar = () => {
  return render(
    <UserProvider>
      <MemoryRouter>
        <NavBar />
        <LoginTrigger />
      </MemoryRouter>
    </UserProvider>,
  );
};

describe("Navbar", () => {
  describe("Given no user is signed in", () => {
    describe("When the navbar is rendered", () => {
      beforeEach(() => {
        renderNavBar();
      });

      it("Then a Login link is shown", () => {
        expect(screen.getByRole("link", { name: "Login" })).toBeInTheDocument();
      });

      it("Then no Orders link is shown", () => {
        expect(screen.queryByRole("link", { name: "Orders" })).not.toBeInTheDocument();
      });

      it("Then no account menu is present", () => {
        expect(screen.queryByRole("button", { name: /user@example.com/ })).not.toBeInTheDocument();
      });
    });

    describe("When the user signs in", () => {
      beforeEach(async () => {
        const user = userEvent.setup();
        renderNavBar();
        await user.click(screen.getByText("do-login"));
      });

      it("Then the navbar shows an account menu button with the email", () => {
        expect(screen.getByRole("button", { name: /user@example.com/ })).toBeInTheDocument();
      });
    });
  });

  describe("Given a signed-in user", () => {
    describe("When they open the account menu", () => {
      beforeEach(async () => {
        const user = userEvent.setup();
        renderNavBar();
        await user.click(screen.getByText("do-login"));
        await user.click(screen.getByRole("button", { name: /user@example.com/ }));
      });

      it("Then an Orders menu item is shown", () => {
        expect(screen.getByRole("menuitem", { name: "Orders" })).toBeInTheDocument();
      });

      it("Then a Sign out menu item is shown", () => {
        expect(screen.getByRole("menuitem", { name: "Sign out" })).toBeInTheDocument();
      });
    });

    describe("When they sign out", () => {
      beforeEach(async () => {
        const user = userEvent.setup();
        renderNavBar();
        await user.click(screen.getByText("do-login"));
        await user.click(screen.getByRole("button", { name: /user@example.com/ }));
        await user.click(screen.getByRole("menuitem", { name: "Sign out" }));
      });

      it("Then the navbar reverts to the Login link", () => {
        expect(screen.getByRole("link", { name: "Login" })).toBeInTheDocument();
      });

      it("Then the signed-in email is no longer shown", () => {
        expect(screen.queryByText("user@example.com")).not.toBeInTheDocument();
      });
    });
  });
});
