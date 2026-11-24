"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const [busqueda, setBusqueda] = useState("");
  const [recetas, setRecetas] = useState([]);
  const [favoritos, setFavoritos] = useState([]);
  const [viendoFavoritos, setViendoFavoritos] = useState(false);
  const [modoOffline, setModoOffline] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const guardados = JSON.parse(localStorage.getItem("chef_favoritos")) || [];
    setFavoritos(guardados);

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    buscarRecetas("");

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const buscarRecetas = async (termino = busqueda) => {
    setViendoFavoritos(false);
    setModoOffline(false);
    setCargando(true);

    try {
      const res = await fetch(
        `https://www.themealdb.com/api/json/v1/1/search.php?s=${termino}`
      );
      const data = await res.json();
      setRecetas(data.meals || []);
    } catch (error) {
      setModoOffline(true);
      setViendoFavoritos(true);
    } finally {
      setCargando(false);
    }
  };

  const toggleFavorito = (e, receta) => {
    e.stopPropagation();
    const existe = favoritos.some((fav) => fav.idMeal === receta.idMeal);
    let nuevosFavoritos;

    if (existe) {
      nuevosFavoritos = favoritos.filter((fav) => fav.idMeal !== receta.idMeal);
    } else {
      nuevosFavoritos = [...favoritos, receta];
      if ("caches" in window) {
        caches.open("themealdb-images").then((cache) => {
          cache.add(receta.strMealThumb).catch(() => {});
        });
      }
    }

    setFavoritos(nuevosFavoritos);
    localStorage.setItem("chef_favoritos", JSON.stringify(nuevosFavoritos));
  };

  const instalarApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const listaAMostrar = viendoFavoritos ? favoritos : recetas;

  return (
    <div>
      <header className="header">
        <div className="header-inner">
          <div className="header-top">
            <h1>🍳 Chef PWA</h1>
            {deferredPrompt && (
              <button onClick={instalarApp} className="btn-instalar">
                ⬇️ Instalar App
              </button>
            )}
          </div>

          <div className="barra-superior">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                buscarRecetas(busqueda);
              }}
              className="form-busqueda"
            >
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar receta (ej. Chicken, Pasta, Cake)..."
                className="input-buscar"
              />
              <button type="submit" className="btn-buscar">
                Buscar
              </button>
            </form>

            <button
              onClick={() => {
                if (viendoFavoritos) {
                  buscarRecetas(busqueda);
                } else {
                  setViendoFavoritos(true);
                }
              }}
              className={`btn-favoritos ${viendoFavoritos ? "activo" : ""}`}
            >
              {viendoFavoritos
                ? "⬅ Volver a Explorar"
                : `⭐ Favoritos (${favoritos.length})`}
            </button>
          </div>
        </div>
      </header>

      <main className="main-container">
        <h2 className="titulo-seccion">
          {modoOffline
            ? "📡 Sin conexión — Mostrando tus recetas favoritas"
            : viendoFavoritos
            ? `⭐ Mis Favoritos (${favoritos.length})`
            : busqueda
            ? `Resultados para "${busqueda}"`
            : "Recetas Sugeridas"}
        </h2>

        {cargando ? (
          <p>Cargando recetas...</p>
        ) : listaAMostrar.length === 0 ? (
          <p>
            {viendoFavoritos
              ? "Aún no tienes recetas guardadas en favoritos."
              : "No se encontraron recetas con ese nombre."}
          </p>
        ) : (
          <div className="grid-recetas">
            {listaAMostrar.map((receta) => {
              const esFav = favoritos.some((f) => f.idMeal === receta.idMeal);
              return (
                <div
                  key={receta.idMeal}
                  onClick={() => router.push(`/receta?id=${receta.idMeal}`)}
                  className="card"
                >
                  <button
                    onClick={(e) => toggleFavorito(e, receta)}
                    title="Agregar o quitar de favoritos"
                    className={`btn-check-fav ${esFav ? "guardado" : ""}`}
                  >
                    {esFav ? "✔" : "☆"}
                  </button>

                  <img
                    src={receta.strMealThumb}
                    alt={receta.strMeal}
                    className="card-img"
                  />

                  <div className="card-body">
                    <h3 className="card-title">{receta.strMeal}</h3>
                    <p className="card-meta">
                      🍽️ {receta.strCategory} • 🌍 {receta.strArea}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}