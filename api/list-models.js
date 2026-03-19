export default async function handler(req, res) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
  );
  const data = await response.json();
  const modelos = data.models?.map(m => m.name) || [];
  res.status(200).json({ modelos });
}
