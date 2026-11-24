"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function ContenidoReceta() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");
  const toastTimerRef = useRef(null);

  const [receta, setReceta] = useState(null);
  const [esFavorito, setEsFavorito] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [mensajeError, setMensajeError] = useState("");

  // Estados para Toast y Confirmación
  const [toast, setToast] = useState(null);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);

  const mostrarToast = (texto, tipo = "agregado") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ texto, tipo });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  useEffect(() => {
    if (!id) {
      setMensajeError("No se recibió el ID de la receta en la URL.");
      setCargando(false);
      return;
    }

    const cargarReceta = async () => {
      const guardados = JSON.parse(localStorage.getItem("chef_favoritos")) || [];
      const cacheRecientes =
        JSON.parse(localStorage.getItem("chef_recetas_cache")) || [];

      const encontradaLocal =
        guardados.find((item) => item.idMeal === id) ||
        cacheRecientes.find((item) => item.idMeal === id);

      if (encontradaLocal) {
        setReceta(encontradaLocal);
        setEsFavorito(guardados.some((item) => item.idMeal === id));
        setCargando(false);
        return;
      }

      try {
        const res = await fetch(
          `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`
        );
        const data = await res.json();
        if (data.meals && data.meals.length > 0) {
          setReceta(data.meals[0]);
        } else {
          setMensajeError("No se encontró ninguna receta con ese ID.");
        }
      } catch (err) {
        setMensajeError(
          "Sin conexión a internet. Guarda la receta en Favoritos mientras tengas red para verla offline."
        );
      } finally {
        setCargando(false);
      }
    };

    cargarReceta();

    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [id]);

  const toggleFavorito = () => {
    if (!receta) return;

    if (esFavorito) {
      setMostrarConfirmar(true);
      return;
    }

    const guardados = JSON.parse(localStorage.getItem("chef_favoritos")) || [];
    const nuevosFavoritos = [...guardados, receta];
    setEsFavorito(true);

    if ("caches" in window) {
      caches.open("themealdb-images").then((cache) => {
        cache.add(receta.strMealThumb).catch(() => {});
      });
    }

    localStorage.setItem("chef_favoritos", JSON.stringify(nuevosFavoritos));
    mostrarToast(`⭐ "${receta.strMeal}" agregada a favoritos`, "agregado");
  };

  const confirmarQuitarFavorito = () => {
    if (!receta) return;
    const guardados = JSON.parse(localStorage.getItem("chef_favoritos")) || [];
    const nuevosFavoritos = guardados.filter((f) => f.idMeal !== receta.idMeal);

    setEsFavorito(false);
    setMostrarConfirmar(false);
    localStorage.setItem("chef_favoritos", JSON.stringify(nuevosFavoritos));
    mostrarToast(`🗑️ "${receta.strMeal}" quitada de favoritos`, "eliminado");
  };

  const obtenerIngredientes = (datosReceta) => {
    const lista = [];
    for (let i = 1; i <= 20; i++) {
      const ing = datosReceta[`strIngredient${i}`];
      const med = datosReceta[`strMeasure${i}`];
      if (ing && ing.trim() !== "") {
        lista.push(`${med} ${ing}`);
      }
    }
    return lista;
  };

  return (
    <div>
      <header className="header">
        <div className="header-inner header-detalle">
          <button onClick={() => router.push("/")} className="btn-volver">
            ⬅ Volver
          </button>
          <h1>🍳 Detalle de Receta</h1>
        </div>
      </header>

      <main className="main-container">
        {cargando ? (
          <p>Cargando receta...</p>
        ) : mensajeError || !receta ? (
          <div className="detalle-card">
            <p>{mensajeError}</p>
          </div>
        ) : (
          <article className="detalle-card">
            <div className="detalle-top">
              <div>
                <h2 className="detalle-titulo">{receta.strMeal}</h2>
                <p className="card-meta">
                  🍽️ Categoría: <strong>{receta.strCategory}</strong> • 🌍
                  Origen: <strong>{receta.strArea}</strong>
                </p>
              </div>

              <button
                onClick={toggleFavorito}
                className={`btn-fav-detalle ${esFavorito ? "guardado" : ""}`}
              >
                {esFavorito ? "✔ En Favoritos" : "☆ Guardar en Favoritos"}
              </button>
            </div>

            <img
              src={receta.strMealThumb}
              alt={receta.strMeal}
              className="detalle-img"
            />

            <div className="detalle-seccion">
              <h3>🛒 Ingredientes</h3>
              <ul className="lista-ingredientes">
                {obtenerIngredientes(receta).map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="detalle-seccion">
              <h3>👨‍🍳 Instrucciones de Preparación</h3>
              <p className="texto-instrucciones">{receta.strInstructions}</p>
            </div>
          </article>
        )}
      </main>

      {/* Modal de Confirmación al quitar favorito */}
      {mostrarConfirmar && receta && (
        <div
          onClick={() => setMostrarConfirmar(false)}
          className="confirm-overlay"
        >
          <div onClick={(e) => e.stopPropagation()} className="confirm-box">
            <h3>¿Quitar de favoritos?</h3>
            <p>
              ¿Seguro que deseas eliminar <strong>{receta.strMeal}</strong> de
              tu lista sin conexión?
            </p>
            <div className="confirm-botones">
              <button
                onClick={() => setMostrarConfirmar(false)}
                className="btn-cancelar"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarQuitarFavorito}
                className="btn-confirmar-eliminar"
              >
                Sí, quitar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast flotante */}
      {toast && (
        <div
          className={`toast-notificacion ${
            toast.tipo === "eliminado" ? "eliminado" : ""
          }`}
        >
          {toast.texto}
        </div>
      )}
    </div>
  );
}

export default function RecetaPage() {
  return (
    <Suspense
      fallback={
        <div className="main-container">
          <p>Cargando...</p>
        </div>
      }
    >
      <ContenidoReceta />
    </Suspense>
  );
}