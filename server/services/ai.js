const Groq = require("groq-sdk");
const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

exports.getCoaching = async (userId) => {
  const prompt = `
User ate pizza and burgers recently.
Give short nutrition advice.
`;

  const res = await client.chat.completions.create({
    model: "llama3-8b-8192",
    messages: [{ role: "user", content: prompt }]
  });

  return res.choices[0].message.content;
};
