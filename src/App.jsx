import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import World from "./world/World";

function ProjectPage({ title }) {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-5xl font-bold text-yellow-500">{title}</h1>
      <p className="text-gray-400 max-w-xl text-center">
        Buraya proje detay sayfanı koyabilirsin. Şimdilik placeholder.
      </p>
      <a className="text-yellow-400 underline" href="/world">
        Back to World
      </a>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/world" element={<World />} />

      {/* tabelaların açtığı sayfalar */}
      <Route
        path="/projects/tankrush"
        element={<ProjectPage title="TankRush TD" />}
      />
      <Route
        path="/projects/water-ai"
        element={<ProjectPage title="Water AI" />}
      />
    </Routes>
  );
}
