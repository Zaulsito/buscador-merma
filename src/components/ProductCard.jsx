export default function ProductCard({ product }) {
  return (
    <div className="bg-gray-800 rounded-xl p-4 shadow hover:shadow-blue-500/20 hover:shadow-lg transition">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-xs text-blue-400 font-semibold uppercase tracking-wide">
            {product.categoria || "Sin categoría"}
          </span>
          <h3 className="text-white font-semibold text-lg mt-1">{product.nombre}</h3>
        </div>
        <span className="bg-gray-700 text-gray-300 text-xs font-mono px-3 py-1 rounded-lg whitespace-nowrap">
          #{product.codigo}
        </span>
      </div>
      {product.sap && (
        <p className="text-gray-400 text-sm mt-2">SAP: {product.sap}</p>
      )}
    </div>
  );
}