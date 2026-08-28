import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserProvider, useUser } from "../../context/UserContext";
import OrdersPage from "./OrdersPage";

const SIGNED_IN_EMAIL = "user@example.com";

const purchaseRecord = (overrides: Partial<{ id: string; productName: string }> = {}) => ({
  id: overrides.id ?? "purchase-1",
  saleId: "sale-1",
  product: {
    id: "product-1",
    name: overrides.productName ?? "Field Recorder MK1",
    description: null,
    imageUrl: null,
    price: "229.00",
  },
  email: SIGNED_IN_EMAIL,
  price: "189.00",
  purchasedAt: new Date().toISOString(),
});

const LoginTrigger = () => {
  const { login } = useUser();
  return <button onClick={() => login(SIGNED_IN_EMAIL)}>do-login</button>;
};

const stubFetchOnce = (status: number, body: unknown) => {
  const spy = vi.fn(async (_input: URL, _init?: RequestInit) => ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }));
  vi.stubGlobal("fetch", spy);
  return spy;
};

const renderSignedInOrdersPage = async () => {
  const user = userEvent.setup();
  const rendered = render(
    <UserProvider>
      <LoginTrigger />
      <OrdersPage />
    </UserProvider>,
  );
  await user.click(screen.getByText("do-login"));
  return rendered;
};

describe("Given a signed-in user with two purchases", () => {
  describe("When the page loads", () => {
    let fetchSpy: ReturnType<typeof stubFetchOnce>;

    beforeEach(async () => {
      const records = [purchaseRecord({ id: "purchase-1" }), purchaseRecord({ id: "purchase-2" })];
      fetchSpy = stubFetchOnce(200, { statusCode: 200, message: "ok", data: records });
      await renderSignedInOrdersPage();
      await screen.findAllByText("Field Recorder MK1");
    });

    it("Then two order rows are rendered", () => {
      expect(screen.getAllByText("Field Recorder MK1")).toHaveLength(2);
    });

    it("Then the request URL carries the signed-in email", () => {
      const requestedUrl = fetchSpy.mock.calls[0]?.[0] as URL;
      expect(requestedUrl.search).toBe(`?email=${encodeURIComponent(SIGNED_IN_EMAIL)}`);
    });
  });
});

describe("Given a signed-in user with no purchases", () => {
  describe("When the page loads", () => {
    it("Then the empty state is shown", async () => {
      stubFetchOnce(200, { statusCode: 200, message: "ok", data: [] });

      await renderSignedInOrdersPage();

      expect(await screen.findByText("You haven't bought anything yet.")).toBeInTheDocument();
    });
  });
});

describe("Given the purchases request fails", () => {
  describe("When the page loads", () => {
    it("Then an alert with the error message is shown", async () => {
      stubFetchOnce(500, { statusCode: 500, message: "Internal server error" });

      await renderSignedInOrdersPage();

      expect(await screen.findByRole("alert")).toHaveTextContent("Internal server error");
    });
  });
});
