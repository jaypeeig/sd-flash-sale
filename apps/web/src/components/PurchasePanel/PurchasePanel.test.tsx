import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { UserProvider, useUser } from "../../context/UserContext";
import PurchasePanel from "./PurchasePanel";

const SIGNED_IN_EMAIL = "user@example.com";

const activeSale = {
  id: "sale-1",
  product: {
    id: "product-1",
    name: "Field Recorder MK1",
    description: null,
    imageUrl: null,
    price: "229.00",
  },
  phase: "active" as const,
  salePrice: "189.00",
  totalStock: 50,
  remainingStock: 49,
  startsAt: new Date(Date.now() - 1000).toISOString(),
  endsAt: new Date(Date.now() + 60_000).toISOString(),
  serverTime: new Date().toISOString(),
};

const LoginTrigger = () => {
  const { login } = useUser();
  return <button onClick={() => login(SIGNED_IN_EMAIL)}>do-login</button>;
};

const renderSignedInPanel = async () => {
  const user = userEvent.setup();
  const rendered = render(
    <UserProvider>
      <MemoryRouter>
        <LoginTrigger />
        <PurchasePanel sale={activeSale} onPurchased={() => {}} />
      </MemoryRouter>
    </UserProvider>,
  );
  await user.click(screen.getByText("do-login"));
  return { ...rendered, user };
};

describe("Given a signed-in user and a purchase request that has not resolved", () => {
  describe("When Buy now is clicked twice in quick succession", () => {
    it("Then fetch is called only once", async () => {
      const fetchSpy = vi.fn(() => new Promise(() => {}));
      vi.stubGlobal("fetch", fetchSpy);
      const { user } = await renderSignedInPanel();

      const buyButton = screen.getByRole("button", { name: "Buy now" });
      await user.click(buyButton);
      await user.click(buyButton);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });
});
