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
    <form className="flex flex-col gap-3" onSubmit={handleSubmit} noValidate>
      <label className="flex flex-col gap-1" htmlFor="email">
        Email
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="rounded border border-slate-300 px-3 py-2"
          placeholder="you@example.com"
        />
      </label>
      {error && (
        <p className="text-red-600" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        className="cursor-pointer rounded bg-slate-900 px-3 py-2 text-white transition-colors hover:bg-slate-700"
      >
        Sign in
      </button>
    </form>
  );
};

export default LoginPage;
