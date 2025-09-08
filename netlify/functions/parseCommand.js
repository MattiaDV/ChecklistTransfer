import fetch from 'node-fetch'; // se usi Node 18+ puoi anche rimuoverlo

export async function handler(event, context) {
  try {
    const { text } = JSON.parse(event.body || '{}');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          { role: "system", content: "Sei un assistente che traduce comandi vocali italiani in JSON. Rispondi **solo** con JSON valido, sempre così: {\"azione\":\"add|edit|delete|check\",\"elemento\":\"...\",\"categoria\":\"...\",\"nuovoElemento\":\"...\"}" },
          { role: "user", content: text }
        ],
        temperature: 0
      })
    });

    const data = await response.json();
    let gptText = data.choices?.[0]?.message?.content || '';

    let parsed;
    try {
      parsed = JSON.parse(gptText);
      if (!parsed.azione || !parsed.elemento) {
        parsed = { azione: "none", elemento: "", categoria: "", nuovoElemento: "" };
      }
    } catch (err) {
      parsed = { azione: "none", elemento: "", categoria: "", nuovoElemento: "" };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(parsed)
    };

  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ azione: "none", elemento: "", categoria: "", nuovoElemento: "" })
    };
  }
}