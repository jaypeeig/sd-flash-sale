import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import RequireAuth from "./components/RequireAuth";
import { UserProvider } from "./context/UserContext";
import "./index.css";
import LiveSalePage from "./pages/live-sale";
import LoginPage from "./pages/login";
import NotFoundPage from "./pages/not-found";
import OrdersPage from "./pages/orders";
import UpcomingPage from "./pages/upcoming";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <LiveSalePage />,
      },
      {
        path: "upcoming",
        element: <UpcomingPage />,
      },
      {
        path: "orders",
        element: (
          <RequireAuth>
            <OrdersPage />
          </RequireAuth>
        ),
      },
      {
        path: "login",
        element: <LoginPage />,
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <UserProvider>
      <RouterProvider router={router} />
    </UserProvider>
  </StrictMode>,
);
