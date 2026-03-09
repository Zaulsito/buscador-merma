import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { collection, onSnapshot } from "firebase/firestore";

export function useIngredientes() {
  const [ingredientes, setIngredientes] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "fichas"), (snap) => {
      const todos = new Set();
      snap.docs.forEach((doc) => {
        const data = doc.data();
        (data.materiasPrimas || []).forEach((m) => {
          if (m.nombre?.trim()) todos.add(m.nombre.trim());
        });
        (data.elementosDecorativos || []).forEach((e) => {
          if (e.nombre?.trim()) todos.add(e.nombre.trim());
        });
      });
      setIngredientes([...todos].sort());
    });
    return () => unsub();
  }, []);

  return ingredientes;
}

export function useCodigos() {
  const [codigos, setCodigos] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "fichas"), (snap) => {
      const todos = new Set();
      snap.docs.forEach((doc) => {
        const data = doc.data();
        if (data.codigo?.trim()) todos.add(data.codigo.trim());
      });
      setCodigos([...todos].sort());
    });
    return () => unsub();
  }, []);

  return codigos;
}
export function useSubcategorias() {
  const [subcategorias, setSubcategorias] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "fichas"), (snap) => {
      const todos = new Set();
      snap.docs.forEach((doc) => {
        const data = doc.data();
        if (data.subcategoria?.trim()) todos.add(data.subcategoria.trim());
      });
      setSubcategorias([...todos].sort());
    });
    return () => unsub();
  }, []);

  return subcategorias;
}