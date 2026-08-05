import { Link } from "react-router-dom";
import { Compass } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="max-w-lg mx-auto text-center py-20 px-4">
      <div className="w-16 h-16 rounded-full bg-brand-50 text-brand-400 flex items-center justify-center mx-auto mb-6">
        <Compass size={28} />
      </div>
      <h1 className="text-3xl font-brand text-brand-500 mb-2">Página no encontrada</h1>
      <p className="text-gray-500 mb-8">
        Este enlace no existe o ya no está disponible. Puede que el link tenga un error, o que la página se haya movido.
      </p>
      <Link
        to="/catalogo"
        className="inline-block bg-brand-500 hover:bg-brand-600 text-white font-medium px-6 py-3 rounded-lg transition-colors"
      >
        Ver catálogo
      </Link>
    </div>
  );
}
