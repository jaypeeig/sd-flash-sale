import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { UserProvider, useUser } from "../../context/UserContext";
import RequireAuth from "./RequireAuth";

const LoginTrigger = () => {
  const { login } = useUser();
  return <button onClick={() => login("user@example.com")}>do-login</button>;
};

const renderApp = () => {
  return render(
    <UserProvider>
      <MemoryRouter initialEntries={["/"]}>
        <LoginTrigger />
        <Link to="/orders">Go to orders</Link>
        <Routes>
          <Route path="/" element={<p>Home page</p>} />
          <Route path="/login" element={<p>Login page</p>} />
          <Route
            path="/orders"
            element={
              <RequireAuth>
                <p>Orders page</p>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>
    </UserProvider>,
  );
};

const visitOrders = async () => {
  const user = userEvent.setup();
  await user.click(screen.getByText("Go to orders"));
};

describe("RequireAuth", () => {
  describe("Given no signed-in user", () => {
    describe("When the guarded route is visited", () => {
      it("Then the login route's content is shown", async () => {
        renderApp();
        await visitOrders();

        expect(screen.getByText("Login page")).toBeInTheDocument();
      });
    });
  });

  describe("Given a signed-in user", () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      renderApp();
      await user.click(screen.getByText("do-login"));
    });

    describe("When the guarded route is visited", () => {
      beforeEach(async () => {
        await visitOrders();
      });

      it("Then the protected content is shown", () => {
        expect(screen.getByText("Orders page")).toBeInTheDocument();
      });
    });
  });
});
