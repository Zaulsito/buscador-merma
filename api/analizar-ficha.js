export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  if (req.method !== "POST") return res.status(405).end();

  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const { image, mimeType } = req.body;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data: image,
                }
              },
              {
                text: `Analiza esta ficha técnica de cocina y extrae TODOS los datos. Responde SOLO con un JSON válido sin markdown ni explicaciones con esta estructura exacta:
{
  "nombre": "",
  "codigo": "",
  "version": "",
  "fecha": "",
  "porciones": "",
  "tiempoPreparacion": "",
  "descripcionProceso": "",
  "tempCoccion": "",
  "tempEmpanizado": "",
  "tempAlmacenamiento": "",
  "vidaUtilGrado": "",
  "vidaUtilVacio": "",
  "vidaUtilAnaquel": "",
  "materiasPrimas": [{"nombre": "", "cantidadBruta": "", "cantidadNeta": ""}],
  "elementosDecorativos": [{"nombre": "", "cantidadBruta": "", "cantidadNeta": ""}],
  "envases": [{"descripcion": "", "codigoSap": "", "cantidad": ""}]
}`
              }
            ]
          }]
        })
      }
    );

    const data = await response.json();
    const texto = data.candidates[0].content.parts[0].text;
    const clean = texto.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    res.status(200).json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}