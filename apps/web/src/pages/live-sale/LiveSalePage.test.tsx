import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserProvider, useUser } from "../../context/UserContext";
import LiveSalePage from "./LiveSalePage";

const SIGNED_IN_EMAIL = "user@example.com";

const activeSale = {
  id: "sale-1",
  product: {
    id: "product-1",
    name: "Field Recorder MK1",
    description: "Portable recorder.",
    imageUrl: null,
    price: "229.00",
  },
  phase: "active" as const,
  salePrice: "189.00",
  totalStock: 50,
  remainingStock: 49,
  startsAt: new Date(Date.now() - 60_000).toISOString(),
  endsAt: new Date(Date.now() + 3_600_000).toISOString(),
  serverTime: new Date().toISOString(),
};

const otherActiveSale = {
  ...activeSale,
  id: "sale-2",
  product: { ...activeSale.product, id: "product-2", name: "Open-Back Studio Headphones" },
};

const LoginTrigger = () => {
  const { login } = useUser();
  return <button onClick={() => login(SIGNED_IN_EMAIL)}>do-login</button>;
};

const renderLiveSalePage = () => {
  return render(
    <UserProvider>
      <MemoryRouter>
        <LoginTrigger />
        <LiveSalePage />
      </MemoryRouter>
    </UserProvider>,
  );
};

const jsonResponse = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(body),
});

// XXX: LiveSalePage makes up to three sequential requests (list, purchase,
// refresh-by-id), so responses are matched by URL/method rather than by call
// order.
const stubFetchByRoute = (handlers: {
  listSales?: unknown;
  purchase?: { status: number; body: unknown };
  getSaleById?: unknown;
}) => {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: URL, init?: RequestInit) => {
      const path = input.pathname;
      const method = init?.method ?? "GET";

      if (method === "GET" && path.endsWith("/sales")) {
        return Promise.resolve(
          jsonResponse(200, { statusCode: 200, message: "ok", data: handlers.listSales ?? [] }),
        );
      }
      if (method === "POST" && path.endsWith("/purchase")) {
        const { status, body } = handlers.purchase ?? {
          status: 200,
          body: { statusCode: 200, message: "ok", data: null },
        };
        return Promise.resolve(jsonResponse(status, body));
      }
      if (method === "GET" && /\/sales\/.+/.test(path)) {
        return Promise.resolve(
          jsonResponse(200, {
            statusCode: 200,
            message: "ok",
            data: handlers.getSaleById ?? activeSale,
          }),
        );
      }
      throw new Error(`Unhandled request: ${method} ${path}`);
    }),
  );
};

describe("Given an active sale and a signed-out visitor", () => {
  describe("When the page loads", () => {
    it("Then a sign-in link is shown and no Buy now button", async () => {
      stubFetchByRoute({ listSales: [activeSale] });

      render(
        <UserProvider>
          <MemoryRouter>
            <LiveSalePage />
          </MemoryRouter>
        </UserProvider>,
      );

      expect(await screen.findByText("Sign in to buy")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Buy now" })).not.toBeInTheDocument();
    });
  });
});

describe("Given no active sale", () => {
  describe("When the page loads", () => {
    it("Then the empty state is shown", async () => {
      stubFetchByRoute({ listSales: [] });

      renderLiveSalePage();

      expect(await screen.findByText(/No live sales right now/)).toBeInTheDocument();
    });
  });
});

describe("Given two active sales", () => {
  describe("When the page loads", () => {
    it("Then both product names are shown", async () => {
      stubFetchByRoute({ listSales: [activeSale, otherActiveSale] });

      renderLiveSalePage();

      expect(await screen.findByText("Field Recorder MK1")).toBeInTheDocument();
      expect(await screen.findByText("Open-Back Studio Headphones")).toBeInTheDocument();
    });
  });

  describe("When a signed-in user buys the first sale", () => {
    beforeEach(async () => {
      stubFetchByRoute({
        listSales: [activeSale, otherActiveSale],
        purchase: {
          status: 200,
          body: {
            statusCode: 200,
            message: "ok",
            data: { status: "success", message: "You've successfully secured your item!" },
          },
        },
        getSaleById: { ...activeSale, remainingStock: 48 },
      });
      const user = userEvent.setup();
      renderLiveSalePage();
      await user.click(screen.getByText("do-login"));
      const buyButtons = await screen.findAllByRole("button", { name: "Buy now" });

      await user.click(buyButtons[0]);
    });

    it("Then the first sale's card shows the success message", async () => {
      expect(await screen.findByText("You've successfully secured your item!")).toBeInTheDocument();
    });

    it("Then the second sale's Buy now button is still there, unaffected", () => {
      // both cards independently still show a working button — the first
      // sale's purchase succeeding doesn't disable or relabel the second's.
      expect(screen.getAllByRole("button", { name: "Buy now" })).toHaveLength(2);
    });
  });
});

describe("Given a signed-in user whose purchase succeeds", () => {
  describe("When Buy now is clicked", () => {
    it("Then the server's success message is shown", async () => {
      stubFetchByRoute({
        listSales: [activeSale],
        purchase: {
          status: 200,
          body: {
            statusCode: 200,
            message: "ok",
            data: { status: "success", message: "You've successfully secured your item!" },
          },
        },
        getSaleById: { ...activeSale, remainingStock: 48 },
      });
      const user = userEvent.setup();
      renderLiveSalePage();
      await user.click(screen.getByText("do-login"));

      await user.click(await screen.findByRole("button", { name: "Buy now" }));

      expect(await screen.findByText("You've successfully secured your item!")).toBeInTheDocument();
    });
  });
});

describe("Given a signed-in user who already purchased", () => {
  describe("When Buy now is clicked", () => {
    it("Then the already_purchased message is shown", async () => {
      stubFetchByRoute({
        listSales: [activeSale],
        purchase: {
          status: 200,
          body: {
            statusCode: 200,
            message: "ok",
            data: { status: "already_purchased", message: "You have already purchased this item." },
          },
        },
      });
      const user = userEvent.setup();
      renderLiveSalePage();
      await user.click(screen.getByText("do-login"));

      await user.click(await screen.findByRole("button", { name: "Buy now" }));

      expect(await screen.findByText("You have already purchased this item.")).toBeInTheDocument();
    });
  });
});

describe("Given a sale that sells out the instant this user buys", () => {
  describe("When Buy now is clicked", () => {
    it("Then the sold_out message is shown", async () => {
      stubFetchByRoute({
        listSales: [activeSale],
        purchase: {
          status: 200,
          body: {
            statusCode: 200,
            message: "ok",
            data: { status: "sold_out", message: "Sorry, this item is sold out." },
          },
        },
      });
      const user = userEvent.setup();
      renderLiveSalePage();
      await user.click(screen.getByText("do-login"));

      await user.click(await screen.findByRole("button", { name: "Buy now" }));

      expect(await screen.findByText("Sorry, this item is sold out.")).toBeInTheDocument();
    });
  });
});

describe("Given a sale window that has just closed", () => {
  describe("When Buy now is clicked", () => {
    it("Then the sale_not_active message is shown", async () => {
      stubFetchByRoute({
        listSales: [activeSale],
        purchase: {
          status: 200,
          body: {
            statusCode: 200,
            message: "ok",
            data: { status: "sale_not_active", message: "This sale is not currently active." },
          },
        },
      });
      const user = userEvent.setup();
      renderLiveSalePage();
      await user.click(screen.getByText("do-login"));

      await user.click(await screen.findByRole("button", { name: "Buy now" }));

      expect(await screen.findByText("This sale is not currently active.")).toBeInTheDocument();
    });
  });
});

describe("Given a purchase request that 404s", () => {
  describe("When Buy now is clicked", () => {
    it("Then an alert with the error message is shown", async () => {
      stubFetchByRoute({
        listSales: [activeSale],
        purchase: {
          status: 404,
          body: { statusCode: 404, message: "Sale not found", error: "Not Found" },
        },
      });
      const user = userEvent.setup();
      renderLiveSalePage();
      await user.click(screen.getByText("do-login"));

      await user.click(await screen.findByRole("button", { name: "Buy now" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("Sale not found");
    });
  });
});
