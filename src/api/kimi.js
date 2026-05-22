// API 提供商配置
const API_PROVIDERS = {
  'moonshot': {
    url: 'https://api.moonshot.cn/v1/chat/completions',
    name: 'Moonshot',
    models: [
      { value: 'moonshot-v1-8k', label: 'moonshot-v1-8k', desc: '8K上下文，适合短文本' },
      { value: 'moonshot-v1-32k', label: 'moonshot-v1-32k', desc: '32K上下文，适合中等长度文本' },
      { value: 'moonshot-v1-128k', label: 'moonshot-v1-128k', desc: '128K上下文，适合长文本' }
    ]
  },
  'deepseek': {
    url: 'https://api.deepseek.com/v1/chat/completions',
    name: 'DeepSeek',
    models: [
      { value: 'deepseek-chat', label: 'deepseek-chat', desc: 'DeepSeek 对话模型' },
      { value: 'deepseek-reasoner', label: 'deepseek-reasoner', desc: 'DeepSeek 推理模型' }
    ]
  },
  'siliconflow': {
    url: 'https://api.siliconflow.cn/v1/chat/completions',
    name: 'SiliconFlow',
    models: [
      { value: 'deepseek-ai/DeepSeek-V3', label: 'DeepSeek-V3', desc: 'DeepSeek V3' },
      { value: 'Qwen/Qwen3-235B-A22B', label: 'Qwen3-235B', desc: '通义千问 235B' },
      { value: 'THUDM/glm-4-9b-chat', label: 'GLM-4-9B', desc: '智谱 GLM-4 9B' },
      { value: 'meta-llama/Llama-3.3-70B-Instruct', label: 'Llama-3.3-70B', desc: 'Llama 3.3 70B' }
    ]
  },
  'kimi-code': {
    url: 'https://api.kimi.com/coding/v1/chat/completions',
    name: 'Kimi Code',
    models: [
      { value: 'kimi-for-coding', label: 'kimi-for-coding', desc: 'Kimi Code 专用模型' }
    ]
  }
};

function getApiProvider() {
  return localStorage.getItem('kimi_api_provider') || 'moonshot';
}

function getApiKey() {
  return localStorage.getItem('kimi_api_key') || '';
}

function getModel() {
  const provider = getApiProvider();
  const defaultModel = API_PROVIDERS[provider]?.models[0]?.value || 'moonshot-v1-128k';
  return localStorage.getItem('kimi_model') || defaultModel;
}

function getTemperature() {
  const temp = localStorage.getItem('kimi_temperature');
  return temp !== null ? parseFloat(temp) : 0.3;
}

function getApiUrl() {
  const provider = getApiProvider();
  return API_PROVIDERS[provider]?.url || API_PROVIDERS['moonshot'].url;
}

export async function chatWithKimi(messages, options = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('请先在设置中配置API Key');
  }

  const { stream = true, onChunk, model: modelOption, temperature: tempOption } = options;
  const model = modelOption || getModel();
  const temperature = tempOption !== undefined ? tempOption : getTemperature();
  const apiUrl = getApiUrl();

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      stream,
      temperature,
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `API请求失败: ${response.status}`);
  }

  if (!stream) {
    const data = await response.json();
    return data.choices[0].message.content;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

    for (const line of lines) {
      const data = line.slice(6);
      if (data === '[DONE]') continue;
      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content || '';
        fullContent += content;
        if (onChunk) onChunk(content, fullContent);
      } catch (e) {}
    }
  }

  return fullContent;
}

export async function readFileContent(file) {
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error(`文件 "${file.name}" 过大，请上传10MB以内的文件`);
  }

  if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt') || file.name.endsWith('.json') || file.name.endsWith('.csv')) {
    return file.text();
  }
  return file.text().catch(() => {
    throw new Error('不支持的文件格式');
  });
}

export { API_PROVIDERS };

export default { chatWithKimi, readFileContent, API_PROVIDERS };
