import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simular registro
    console.log("Register:", { name, email });
    // redirecionar ao login
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="w-full max-w-md bg-white p-6 rounded shadow">
        <h2 className="text-2xl font-semibold mb-2">Cadastrar</h2>
        <p className="text-sm text-muted-foreground mb-4">Crie sua conta (registro simulado)</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Nome</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium">Senha</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" required />
          </div>

          <div className="flex items-center justify-between">
            <button type="submit" className="rounded bg-primary text-white px-4 py-2">Cadastrar</button>
            <Link to="/login" className="text-sm text-primary hover:underline">Voltar ao login</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
