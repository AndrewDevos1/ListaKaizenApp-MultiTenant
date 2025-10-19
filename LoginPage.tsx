import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "user">("admin");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Preencha email e senha.");
      return;
    }

    // Simulação básica: redireciona conforme role
    console.log("Login attempt:", { email, role });
    if (role === "admin") {
      // opcional: localStorage.setItem("kaizen_user_role", "admin");
      navigate("/admin/dashboard");
    } else {
      navigate("/"); // placeholder para usuário comum
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="w-full max-w-md bg-white p-6 rounded shadow">
        <h2 className="text-2xl font-semibold mb-2">Entrar</h2>
        <p className="text-sm text-muted-foreground mb-4">Acesse sua conta — escolha o tipo de usuário</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
              placeholder="seu@exemplo.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
              placeholder="••••••••"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Tipo de conta</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "user")}
              className="mt-1 w-full rounded border px-3 py-2"
            >
              <option value="admin">Administrador (ADM)</option>
              <option value="user">Usuário comum</option>
            </select>
          </div>

          {error && <div className="text-sm text-destructive">{error}</div>}

          <div className="flex items-center justify-between">
            <button type="submit" className="rounded bg-primary text-white px-4 py-2">
              Entrar
            </button>
            <Link to="/register" className="text-sm text-primary hover:underline">
              Cadastrar
            </Link>
          </div>
        </form>

        <div className="mt-4 text-xs text-muted-foreground">
          Observação: autenticação simulada; será conectada ao backend depois.
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
