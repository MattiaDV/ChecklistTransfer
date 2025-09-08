exports.handler = async function(event, context) {
  try {
    const { text } = JSON.parse(event.body);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          { role: "system", content: "Sei un assistente che traduce comandi vocali italiani in JSON azione-elemento-categoria." },
          { role: "user", content: text }
        ],
        temperature: 0
      })
    });

    const data = await response.json();
    const gptText = data.choices[0].message.content;

    // Parse JSON prima di inviarlo al frontend
    const parsedJSON = JSON.parse(gptText);

    return {
      statusCode: 200,
      body: JSON.stringify(parsedJSON)
    };

  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};