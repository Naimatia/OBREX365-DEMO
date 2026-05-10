import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.REACT_APP_GROQ_API_KEY ,
  baseURL: 'https://api.groq.com/openai/v1',
  dangerouslyAllowBrowser: true
});

const DeepSeekService = {
  async generateTasksForUser(user, taskDescription) {
    const prompt = `
You are an expert task manager.

Generate the **appropriate number** of professional tasks for this employee:

Employee: ${user?.firstname} ${user?.lastname}

Goal / Request: ${taskDescription}

Instructions:
- Decide the best number of tasks (usually between 3 and 8).
- Create clear, actionable, and realistic tasks.
- Do not create too many or too few tasks.
- Make each task specific and useful.

Return ONLY valid JSON in this exact format:

{
  "tasks": [
    {
      "title": "Short and clear task title",
      "description": "Detailed professional description of what should be done",
      "suggestedDueDate": "2026-05-25"   // YYYY-MM-DD or null
    }
  ],
  "reasoning": "Brief explanation why you chose this number of tasks"
}
`;

    try {
      const response = await client.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 2500,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content);
      
      if (!result.tasks || !Array.isArray(result.tasks)) {
        throw new Error("Invalid response from AI");
      }

      console.log(`AI decided to create ${result.tasks.length} tasks`);
      return result;

    } catch (error) {
      console.error("Groq API Error:", error);
      throw new Error("Failed to generate tasks. Please try again.");
    }
  }
};

export default DeepSeekService;