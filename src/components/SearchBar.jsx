export default function SearchBar({ value, onChange }) {
  return (
    <div className="relative w-full max-w-xl">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
      <input
        type="text"
        placeholder="Buscar por código, nombre o categoría..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-gray-700 text-white pl-11 pr-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
      />
    </div>
  );
}