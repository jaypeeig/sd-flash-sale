import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { UserProvider } from "../../context/UserContext";
import { useUser } from "../../context/user-context";
import LoginPage from "./LoginPage";

const HomeStub = () => {
  const { email } = useUser();
  return <p>home: {email}</p>;
};

const renderLoginPage = () => {
  return render(
    <UserProvider>
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<HomeStub />} />
        </Routes>
      </MemoryRouter>
    </UserProvider>,
  );
};

describe("Given the login page is displayed", () => {
  describe("When an invalid email is submitted", () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      renderLoginPage();
      await user.type(screen.getByLabelText("Email"), "not-an-email");
      await user.click(screen.getByRole("button", { name: "Sign in" }));
    });

    it("Then a validation error is shown", () => {
      expect(screen.getByRole("alert")).toHaveTextContent("valid email");
    });

    it("Then the user is not signed in", () => {
      expect(screen.queryByText(/^home:/)).not.toBeInTheDocument();
    });
  });

  describe("When a valid email is submitted", () => {
    it("Then the user is signed in and navigated home", async () => {
      const user = userEvent.setup();
      renderLoginPage();

      await user.type(screen.getByLabelText("Email"), "user@example.com");
      await user.click(screen.getByRole("button", { name: "Sign in" }));

      expect(await screen.findByText("home: user@example.com")).toBeInTheDocument();
    });
  });
});
