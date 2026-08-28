import { useState } from "react";
import type { SubmitEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import { isValidEmail } from "../../lib/validateEmail";

const LoginPage = () => {
  const { login } = useUser();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }

    setError(null);
    login(email.trim());
    navigate("/");
  };

  return (
    <div className="flex min-h-[56vh] items-center justify-center">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-6 rounded-lg border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col gap-1 text-center">
          <h2 className="m-0 text-xl font-semibold">Sign in</h2>
          <p className="m-0 text-sm text-slate-600">Enter your email to continue.</p>
        </div>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <label
            className="flex flex-col gap-1.5 text-sm font-medium text-slate-700"
            htmlFor="email"
          >
            Email
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 font-normal text-slate-900 transition-colors outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              placeholder="you@example.com"
            />
          </label>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="cursor-pointer rounded-md bg-slate-900 px-3 py-2.5 font-medium text-white transition-colors hover:bg-slate-700"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
